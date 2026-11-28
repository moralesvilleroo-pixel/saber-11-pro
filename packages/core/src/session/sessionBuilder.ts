import { computeGlobalScore } from "../scoring/globalScore.js";
import { estimateTheta, thetaToIcfesScore, type IrtItemParams } from "../scoring/irt3pl.js";
import type { EvidenceMastery, PlannerQuestion } from "../planner/adaptivePlanner.js";
import { SUBJECT_CODES, SUBJECT_WEIGHTS, type AreaScores, type SubjectCode } from "../schemas.js";

/**
 * Armado de diagnosticos y simulacros, y estimacion de puntajes a partir de intentos
 * (PRD secciones 3.1, 3.5 y 3.6). Todo es determinista: misma entrada, misma salida.
 */

export interface BankQuestion extends PlannerQuestion {
  irt: IrtItemParams;
  estimatedTimeSeconds: number;
}

/** Preguntas calificables por prueba en el examen real (PRD 1). */
export const OFFICIAL_ITEM_COUNTS: Readonly<Record<SubjectCode, number>> = Object.freeze({
  LC: 41,
  MA: 50,
  SC: 50,
  CN: 58,
  IN: 55,
});

/** 2 sesiones de 4 h 30 min para 302 preguntas (incluidas las auxiliares): ~107 s por pregunta. */
export const MOCK_SECONDS_PER_ITEM = Math.round((2 * 270 * 60) / 302);

/** Limites del estimador para pocas respuestas: escala 20-80 en lugar de 10-90. */
const SHORT_TEST_THETA_BOUND = 3;
const SHORT_TEST_RESPONSES = 15;

/**
 * Reparte `total` en enteros proporcionales a `weights` (metodo del mayor resto),
 * sin pasar de `caps` por clave. Lo que no cabe en una clave se reparte entre las demas.
 */
export function apportion<K extends string>(
  total: number,
  weights: Readonly<Record<K, number>>,
  caps: Readonly<Record<K, number>>,
): Record<K, number> {
  const keys = Object.keys(weights) as K[];
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  let remaining = Math.max(0, Math.floor(total));
  let open = keys.filter((k) => caps[k] > 0 && weights[k] > 0);
  while (remaining > 0 && open.length > 0) {
    const w = open.reduce((acc, k) => acc + weights[k], 0);
    const shares = open.map((k) => ({ k, exact: (remaining * weights[k]) / w }));
    let given = 0;
    for (const s of shares) {
      const n = Math.min(Math.floor(s.exact), caps[s.k] - out[s.k]);
      out[s.k] += n;
      given += n;
    }
    const byRest = shares
      .filter((s) => out[s.k] < caps[s.k])
      .sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) || cmp(a.k, b.k));
    for (const s of byRest) {
      if (given >= remaining) break;
      out[s.k] += 1;
      given += 1;
    }
    if (given === 0) break;
    remaining -= given;
    open = open.filter((k) => out[k] < caps[k]);
  }
  return out;
}

function groupBySubject<T extends PlannerQuestion>(pool: readonly T[]): Record<SubjectCode, T[]> {
  const out = Object.fromEntries(SUBJECT_CODES.map((s) => [s, [] as T[]])) as Record<SubjectCode, T[]>;
  for (const q of pool) out[q.subject].push(q);
  return out;
}

/**
 * Elige `n` preguntas de una prueba cubriendo competencias por turnos y, dentro de cada
 * competencia, alternando dificultades (de la mas facil a la mas dificil y viceversa).
 */
function spreadPick<T extends BankQuestion>(questions: readonly T[], n: number): T[] {
  const byCompetency = new Map<string, T[]>();
  for (const q of [...questions].sort((a, b) => a.irt.b - b.irt.b || cmp(a.questionId, b.questionId))) {
    const list = byCompetency.get(q.competencyCode) ?? [];
    list.push(q);
    byCompetency.set(q.competencyCode, list);
  }
  const queues = [...byCompetency.entries()]
    .sort(([a], [b]) => cmp(a, b))
    .map(([, list]) => {
      const zigzag: T[] = [];
      let lo = 0;
      let hi = list.length - 1;
      while (lo <= hi) {
        zigzag.push(list[lo++] as T);
        if (lo <= hi) zigzag.push(list[hi--] as T);
      }
      return zigzag;
    });
  const out: T[] = [];
  while (out.length < n && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && out.length < n) out.push(next);
    }
  }
  return out;
}

/**
 * Diagnostico inicial (PRD 3.1): reparte `size` preguntas entre las pruebas con material,
 * en proporcion a peso x numero de preguntas del examen, y las intercala por prueba.
 */
export function buildDiagnostic<T extends BankQuestion>(pool: readonly T[], size: number): T[] {
  const bySubject = groupBySubject(pool);
  const weights = Object.fromEntries(
    SUBJECT_CODES.map((s) => [s, SUBJECT_WEIGHTS[s] * OFFICIAL_ITEM_COUNTS[s]]),
  ) as Record<SubjectCode, number>;
  const caps = Object.fromEntries(SUBJECT_CODES.map((s) => [s, bySubject[s].length])) as Record<
    SubjectCode,
    number
  >;
  const quota = apportion(size, weights, caps);
  const picked = SUBJECT_CODES.map((s) => spreadPick(bySubject[s], quota[s]));

  const out: T[] = [];
  while (picked.some((l) => l.length > 0)) {
    for (const list of picked) {
      const next = list.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

export interface MockExamPlan<T> {
  items: T[];
  timeLimitSeconds: number;
  /** Preguntas por prueba en este simulacro frente a las del examen real. */
  coverage: Record<SubjectCode, { planned: number; official: number }>;
}

/**
 * Simulacro (PRD 3.5): por prueba, tantas preguntas como el examen real si el banco alcanza.
 * `scale` (0-1] reduce todo en proporcion (p. ej. 0.5 para media sesion). Las preguntas van
 * agrupadas por prueba como en el cuadernillo y el tiempo es el del examen por pregunta.
 */
export function buildMockExam<T extends BankQuestion>(
  pool: readonly T[],
  options: { scale?: number; subjects?: readonly SubjectCode[] } = {},
): MockExamPlan<T> {
  const scale = options.scale ?? 1;
  if (!(scale > 0 && scale <= 1)) throw new Error("scale debe estar en (0, 1]");
  const subjects = options.subjects ?? SUBJECT_CODES;
  const bySubject = groupBySubject(pool);
  const coverage = Object.fromEntries(
    SUBJECT_CODES.map((s) => [s, { planned: 0, official: OFFICIAL_ITEM_COUNTS[s] }]),
  ) as Record<SubjectCode, { planned: number; official: number }>;

  const items: T[] = [];
  for (const s of SUBJECT_CODES) {
    if (!subjects.includes(s)) continue;
    const want = Math.max(1, Math.round(OFFICIAL_ITEM_COUNTS[s] * scale));
    const chosen = spreadPick(bySubject[s], want);
    coverage[s].planned = chosen.length;
    items.push(...chosen);
  }
  return { items, timeLimitSeconds: items.length * MOCK_SECONDS_PER_ITEM, coverage };
}

export interface ScoredResponse {
  subject: SubjectCode;
  correct: boolean;
  irt: IrtItemParams;
}

export interface SubjectEstimate {
  theta: number;
  standardError: number;
  responses: number;
  score: number;
  /** true con pocas respuestas o si quedo en un limite: mostrar como preliminar. */
  preliminary: boolean;
}

export interface AreaEstimate {
  bySubject: Record<SubjectCode, SubjectEstimate | null>;
  /** Puntaje Global solo cuando hay estimacion en todas las pruebas que cuentan. */
  globalScore: number | null;
  /** Pruebas sin datos (impiden calcular el Puntaje Global). */
  missing: SubjectCode[];
}

/** Estima theta y puntaje 0-100 por prueba con TRI 3PL y, si se puede, el Puntaje Global. */
export function estimateAreaScores(
  responses: readonly ScoredResponse[],
  options: { englishExempt?: boolean } = {},
): AreaEstimate {
  const bySubject = Object.fromEntries(SUBJECT_CODES.map((s) => [s, null])) as Record<
    SubjectCode,
    SubjectEstimate | null
  >;
  const grouped = groupResponses(responses);
  for (const s of SUBJECT_CODES) {
    const list = grouped[s];
    if (list.length === 0) continue;
    const short = list.length < SHORT_TEST_RESPONSES;
    const bound = short ? SHORT_TEST_THETA_BOUND : 4;
    const est = estimateTheta(
      list.map((r) => ({ ...r.irt, correct: r.correct })),
      { thetaMin: -bound, thetaMax: bound },
    );
    bySubject[s] = {
      theta: est.theta,
      standardError: est.standardError,
      responses: est.responses,
      score: thetaToIcfesScore(est.theta),
      preliminary: short || est.atBound,
    };
  }

  const counted = SUBJECT_CODES.filter((s) => !(s === "IN" && options.englishExempt));
  const missing = counted.filter((s) => bySubject[s] === null);
  let globalScore: number | null = null;
  if (missing.length === 0) {
    const score = (s: SubjectCode): number => bySubject[s]?.score ?? 0;
    const scores: AreaScores = {
      LC: score("LC"),
      MA: score("MA"),
      SC: score("SC"),
      CN: score("CN"),
      IN: options.englishExempt ? null : score("IN"),
    };
    globalScore = computeGlobalScore(scores);
  }
  return { bySubject, globalScore, missing };
}

function groupResponses(responses: readonly ScoredResponse[]): Record<SubjectCode, ScoredResponse[]> {
  const out = Object.fromEntries(SUBJECT_CODES.map((s) => [s, [] as ScoredResponse[]])) as Record<
    SubjectCode,
    ScoredResponse[]
  >;
  for (const r of responses) out[r.subject].push(r);
  return out;
}

/**
 * Puntajes para ponderar el planificador: los estimados donde existan y 50 donde no.
 */
export function scoresForPlanner(estimate: AreaEstimate): AreaScores {
  const s = (code: SubjectCode): number => estimate.bySubject[code]?.score ?? 50;
  return { LC: s("LC"), MA: s("MA"), SC: s("SC"), CN: s("CN"), IN: s("IN") };
}

export interface MasteryAttempt {
  evidenceId: string;
  correct: boolean;
  answeredAt: number;
}

const DAY_MS = 86_400_000;

/**
 * Dominio por evidencia: aciertos ponderados por recencia (vida media `halfLifeDays`),
 * con un acierto y un error "virtuales" para no sacar conclusiones de una sola respuesta.
 */
export function evidenceMasteryFromAttempts(
  attempts: readonly MasteryAttempt[],
  now: number,
  halfLifeDays = 14,
): EvidenceMastery[] {
  const acc = new Map<string, { hits: number; total: number }>();
  for (const a of attempts) {
    const ageDays = Math.max(0, (now - a.answeredAt) / DAY_MS);
    const w = 0.5 ** (ageDays / halfLifeDays);
    const cur = acc.get(a.evidenceId) ?? { hits: 0, total: 0 };
    cur.hits += a.correct ? w : 0;
    cur.total += w;
    acc.set(a.evidenceId, cur);
  }
  return [...acc.entries()]
    .sort(([a], [b]) => cmp(a, b))
    .map(([evidenceId, { hits, total }]) => ({ evidenceId, mastery: (hits + 0.5) / (total + 1) }));
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
