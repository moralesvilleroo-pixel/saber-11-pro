import { calculateMarginalImpact } from "../scoring/marginalImpact.js";
import type { AreaScores, SubjectCode } from "../schemas.js";

/**
 * Planificador de la sesion diaria (PRD seccion 3.3). Mezcla por defecto:
 *   ~40 % repasos FSRS vencidos (primero los de menor recuperabilidad),
 *   ~40 % practica intercalada sobre evidencias debiles ponderadas por impacto en el Puntaje Global,
 *   ~20 % refuerzo de errores recientes con una pregunta NUEVA de la misma evidencia.
 * Si una parte no tiene material, su cupo pasa a la siguiente (fsrs -> intercalada -> refuerzo -> fsrs).
 * Es determinista: misma entrada, misma cola.
 */

export interface PlannerQuestion {
  questionId: string;
  subject: SubjectCode;
  competencyCode: string;
  evidenceId: string;
}

export interface DueCard extends PlannerQuestion {
  dueAt: number;
  /** Recuperabilidad FSRS en `now` (0-1). */
  retrievability: number;
}

export interface EvidenceMastery {
  evidenceId: string;
  /** Dominio estimado 0-1 (p. ej. aciertos recientes ponderados). */
  mastery: number;
}

export interface RecentError extends PlannerQuestion {
  answeredAt: number;
}

export interface PlannerMix {
  fsrs: number;
  interleaved: number;
  reinforcement: number;
}

export interface PlannerInput {
  now: number;
  sessionSize: number;
  dueCards: readonly DueCard[];
  /** Preguntas publicadas que el estudiante aun no tiene como tarjeta. */
  questionPool: readonly PlannerQuestion[];
  evidenceMastery: readonly EvidenceMastery[];
  recentErrors: readonly RecentError[];
  /** Puntajes actuales para ponderar el impacto; por defecto 50 en todo. */
  currentScores?: AreaScores;
  mix?: PlannerMix;
}

export type PlanSource = "fsrs_due" | "interleaved" | "error_reinforcement";

export interface PlannedItem extends PlannerQuestion {
  source: PlanSource;
}

export interface DailyPlan {
  items: PlannedItem[];
  quotas: Record<PlanSource, number>;
  counts: Record<PlanSource, number>;
  distinctSubjects: number;
  distinctCompetencies: number;
}

export const DEFAULT_MIX: Readonly<PlannerMix> = Object.freeze({
  fsrs: 0.4,
  interleaved: 0.4,
  reinforcement: 0.2,
});

const DEFAULT_SCORES: AreaScores = { LC: 50, MA: 50, SC: 50, CN: 50, IN: 50 };
/** Dominio asumido para evidencias sin datos: ni fuerte ni debil. */
const UNKNOWN_MASTERY = 0.5;

export function buildDailyPlan(input: PlannerInput): DailyPlan {
  const size = Math.max(0, Math.floor(input.sessionSize));
  const mix = input.mix ?? DEFAULT_MIX;
  const mixTotal = mix.fsrs + mix.interleaved + mix.reinforcement;
  if (!(mixTotal > 0) || [mix.fsrs, mix.interleaved, mix.reinforcement].some((v) => v < 0)) {
    throw new Error("La mezcla del planificador debe tener proporciones no negativas");
  }

  const fsrsQuota = Math.round((size * mix.fsrs) / mixTotal);
  const interleavedQuota = Math.round((size * mix.interleaved) / mixTotal);
  const quotas: Record<PlanSource, number> = {
    fsrs_due: fsrsQuota,
    interleaved: interleavedQuota,
    error_reinforcement: Math.max(0, size - fsrsQuota - interleavedQuota),
  };

  const used = new Set<string>();
  const fsrsCandidates = rankDueCards(input.dueCards, input.now);
  const reinforcementCandidates = rankReinforcement(input.recentErrors, input.questionPool);
  const priorities = evidencePriorities(input);

  const picked: Record<PlanSource, PlannedItem[]> = {
    fsrs_due: [],
    interleaved: [],
    error_reinforcement: [],
  };

  const takeFrom = (source: PlanSource, n: number): number => {
    let taken = 0;
    while (taken < n) {
      const next =
        source === "interleaved"
          ? nextInterleaved(input.questionPool, priorities, picked.interleaved, used)
          : (source === "fsrs_due" ? fsrsCandidates : reinforcementCandidates).find(
              (q) => !used.has(q.questionId),
            );
      if (!next) break;
      used.add(next.questionId);
      picked[source].push({ ...pick(next), source });
      taken++;
    }
    return taken;
  };

  // Primera pasada con cupos y cascada del faltante en el orden del PRD.
  const order: PlanSource[] = ["fsrs_due", "interleaved", "error_reinforcement"];
  let carry = 0;
  for (const source of order) {
    const want = quotas[source] + carry;
    carry = want - takeFrom(source, want);
  }
  // Lo que aun falte se completa con cualquier parte que tenga material.
  for (const source of order) {
    if (carry <= 0) break;
    carry -= takeFrom(source, carry);
  }

  const items = interleaveOrder(picked);
  return {
    items,
    quotas,
    counts: {
      fsrs_due: picked.fsrs_due.length,
      interleaved: picked.interleaved.length,
      error_reinforcement: picked.error_reinforcement.length,
    },
    distinctSubjects: new Set(items.map((i) => i.subject)).size,
    distinctCompetencies: new Set(items.map((i) => i.competencyCode)).size,
  };
}

function pick(q: PlannerQuestion): PlannerQuestion {
  return {
    questionId: q.questionId,
    subject: q.subject,
    competencyCode: q.competencyCode,
    evidenceId: q.evidenceId,
  };
}

function rankDueCards(cards: readonly DueCard[], now: number): DueCard[] {
  return cards
    .filter((c) => c.dueAt <= now)
    .slice()
    .sort((a, b) => a.retrievability - b.retrievability || a.dueAt - b.dueAt || cmp(a.questionId, b.questionId));
}

/** Una pregunta nueva por evidencia fallada, empezando por el error mas reciente. */
function rankReinforcement(
  errors: readonly RecentError[],
  pool: readonly PlannerQuestion[],
): PlannerQuestion[] {
  const failedIds = new Set(errors.map((e) => e.questionId));
  const seenEvidence = new Set<string>();
  const out: PlannerQuestion[] = [];
  const sorted = errors.slice().sort((a, b) => b.answeredAt - a.answeredAt || cmp(a.questionId, b.questionId));
  for (const err of sorted) {
    if (seenEvidence.has(err.evidenceId)) continue;
    seenEvidence.add(err.evidenceId);
    for (const q of pool) {
      if (q.evidenceId === err.evidenceId && !failedIds.has(q.questionId)) out.push(q);
    }
  }
  return out;
}

/**
 * Prioridad de cada evidencia = (1 - dominio) * puntos de Puntaje Global que aporta
 * subir +10 en su prueba. Asi pesa mas una evidencia debil de LC/MA/SC/CN que una de Ingles.
 */
function evidencePriorities(input: PlannerInput): Map<string, number> {
  const impact = new Map(
    calculateMarginalImpact(input.currentScores ?? DEFAULT_SCORES).map((i) => [i.subject, i.plus10]),
  );
  const mastery = new Map(input.evidenceMastery.map((m) => [m.evidenceId, clamp01(m.mastery)]));
  const priorities = new Map<string, number>();
  for (const q of input.questionPool) {
    if (priorities.has(q.evidenceId)) continue;
    const weakness = 1 - (mastery.get(q.evidenceId) ?? UNKNOWN_MASTERY);
    priorities.set(q.evidenceId, weakness * (impact.get(q.subject) ?? 0));
  }
  return priorities;
}

/**
 * Siguiente pregunta intercalada: la competencia con mayor prioridad / (1 + veces ya elegida),
 * evitando repetir la competencia anterior si hay otra disponible. Dentro de la competencia,
 * la evidencia mas prioritaria.
 */
function nextInterleaved(
  pool: readonly PlannerQuestion[],
  priorities: Map<string, number>,
  already: readonly PlannedItem[],
  used: Set<string>,
): PlannerQuestion | undefined {
  const available = pool.filter((q) => !used.has(q.questionId) && (priorities.get(q.evidenceId) ?? 0) > 0);
  if (available.length === 0) return undefined;

  const timesPicked = new Map<string, number>();
  for (const item of already) timesPicked.set(item.competencyCode, (timesPicked.get(item.competencyCode) ?? 0) + 1);
  const last = already.at(-1)?.competencyCode;

  const bestByCompetency = new Map<string, PlannerQuestion>();
  for (const q of available) {
    const current = bestByCompetency.get(q.competencyCode);
    if (
      !current ||
      (priorities.get(q.evidenceId) ?? 0) > (priorities.get(current.evidenceId) ?? 0) ||
      ((priorities.get(q.evidenceId) ?? 0) === (priorities.get(current.evidenceId) ?? 0) &&
        cmp(q.questionId, current.questionId) < 0)
    ) {
      bestByCompetency.set(q.competencyCode, q);
    }
  }

  let chosen: PlannerQuestion | undefined;
  let chosenScore = -Infinity;
  for (const [competency, q] of [...bestByCompetency].sort(([a], [b]) => cmp(a, b))) {
    let score = (priorities.get(q.evidenceId) ?? 0) / (1 + (timesPicked.get(competency) ?? 0));
    if (competency === last && bestByCompetency.size > 1) score = -1;
    if (score > chosenScore) {
      chosen = q;
      chosenScore = score;
    }
  }
  return chosen;
}

/**
 * Orden final: alterna las fuentes en proporcion y evita dos preguntas seguidas de la
 * misma prueba (o, si no se puede, de la misma competencia).
 */
function interleaveOrder(picked: Record<PlanSource, PlannedItem[]>): PlannedItem[] {
  const queues = (["fsrs_due", "interleaved", "error_reinforcement"] as const).map((s) => picked[s].slice());
  const merged: PlannedItem[] = [];
  while (queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const item = q.shift();
      if (item) merged.push(item);
    }
  }

  const remaining = merged;
  const out: PlannedItem[] = [];
  while (remaining.length > 0) {
    const prev = out.at(-1);
    let idx = prev ? remaining.findIndex((i) => i.subject !== prev.subject) : 0;
    if (idx < 0 && prev) idx = remaining.findIndex((i) => i.competencyCode !== prev.competencyCode);
    if (idx < 0) idx = 0;
    const [item] = remaining.splice(idx, 1);
    if (item) out.push(item);
  }
  return out;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
