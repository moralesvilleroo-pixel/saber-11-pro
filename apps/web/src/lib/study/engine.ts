import {
  buildDailyPlan,
  buildDiagnostic,
  buildMockExam,
  createNewCard,
  estimateAreaScores,
  evidenceMasteryFromAttempts,
  Fsrs6,
  getDynamicTargetRetention,
  scoresForPlanner,
  suggestRating,
  type AreaEstimate,
  type FsrsCard,
  type PlanSource,
  type Rating,
  type SubjectCode,
} from "@icfes/core";
import type { AttemptRecord, OptionLabel, Progress, ScoreSnapshot, StudyMode, StudyProfile, StudyQuestion } from "./types";

const DAY_MS = 86_400_000;
export const DIAGNOSTIC_SIZE = 45;
/** Segundos promedio por pregunta en la sesion diaria (lectura + respuesta + feedback). */
const DAILY_SECONDS_PER_ITEM = 90;

export interface PlannedSession {
  mode: StudyMode;
  items: StudyQuestion[];
  sources: Record<string, PlanSource | "diagnostic" | "mock_exam">;
  timeLimitSeconds: number | null;
  /** Mensaje para el estudiante cuando el banco no alcanza para lo pedido. */
  note: string | null;
}

export function daysUntil(dateIso: string | null, now: number): number {
  if (!dateIso) return Infinity;
  const t = Date.parse(`${dateIso}T12:00:00-05:00`);
  return Number.isFinite(t) ? Math.max(0, Math.ceil((t - now) / DAY_MS)) : Infinity;
}

export function fsrsFor(profile: StudyProfile, now: number): Fsrs6 {
  return new Fsrs6({ desiredRetention: getDynamicTargetRetention(daysUntil(profile.targetExamDate, now)) });
}

/** Estimacion por prueba con el ultimo intento de cada pregunta (no cuenta dos veces un repaso). */
export function estimateFromAttempts(
  attempts: readonly AttemptRecord[],
  bank: readonly StudyQuestion[],
  filter?: (a: AttemptRecord) => boolean,
): AreaEstimate {
  const byId = new Map(bank.map((q) => [q.questionId, q]));
  const latest = new Map<string, AttemptRecord>();
  for (const a of attempts) {
    if (filter && !filter(a)) continue;
    const prev = latest.get(a.questionId);
    if (!prev || a.answeredAt >= prev.answeredAt) latest.set(a.questionId, a);
  }
  const responses = [...latest.values()].flatMap((a) => {
    const q = byId.get(a.questionId);
    return q ? [{ subject: q.subject, correct: a.correct, irt: q.irt }] : [];
  });
  return estimateAreaScores(responses);
}

export function snapshotFrom(estimate: AreaEstimate, source: ScoreSnapshot["source"], at: number): ScoreSnapshot {
  const scores: Partial<Record<SubjectCode, number>> = {};
  for (const [s, e] of Object.entries(estimate.bySubject)) if (e) scores[s as SubjectCode] = e.score;
  return { scores, globalScore: estimate.globalScore, source, at };
}

export function planSession(
  mode: StudyMode,
  bank: readonly StudyQuestion[],
  progress: Progress,
  profile: StudyProfile,
  now: number,
  options: { mockScale?: number } = {},
): PlannedSession {
  if (mode === "diagnostic") {
    const items = buildDiagnostic(bank, DIAGNOSTIC_SIZE);
    return {
      mode,
      items,
      sources: Object.fromEntries(items.map((q) => [q.questionId, "diagnostic" as const])),
      timeLimitSeconds: null,
      note:
        items.length < DIAGNOSTIC_SIZE
          ? `El banco todavía tiene ${bank.length} preguntas, así que el diagnóstico usa ${items.length}.`
          : null,
    };
  }

  if (mode === "mock_exam") {
    const plan = buildMockExam(bank, { scale: options.mockScale ?? 1 });
    const missing = Object.entries(plan.coverage)
      .filter(([, c]) => c.planned === 0)
      .map(([s]) => s);
    return {
      mode,
      items: plan.items,
      sources: Object.fromEntries(plan.items.map((q) => [q.questionId, "mock_exam" as const])),
      timeLimitSeconds: plan.timeLimitSeconds,
      note:
        missing.length > 0
          ? `Aún no hay preguntas de ${missing.join(", ")}; el simulacro incluye solo las pruebas con material.`
          : null,
    };
  }

  const fsrs = fsrsFor(profile, now);
  const byId = new Map(bank.map((q) => [q.questionId, q]));
  const dueCards = Object.entries(progress.cards).flatMap(([id, card]) => {
    const q = byId.get(id);
    return q && card.dueAt <= now ? [{ ...q, dueAt: card.dueAt, retrievability: fsrs.retrievability(card, now) }] : [];
  });
  const questionPool = bank.filter((q) => !progress.cards[q.questionId]);
  const recentErrors = progress.attempts
    .filter((a) => !a.correct && now - a.answeredAt <= 7 * DAY_MS)
    .flatMap((a) => {
      const q = byId.get(a.questionId);
      return q ? [{ ...q, answeredAt: a.answeredAt }] : [];
    });
  const mastery = evidenceMasteryFromAttempts(
    progress.attempts.map((a) => ({ evidenceId: a.evidenceId, correct: a.correct, answeredAt: a.answeredAt })),
    now,
  );
  const sessionSize = Math.min(60, Math.max(5, Math.round((profile.dailyStudyMinutes * 60) / DAILY_SECONDS_PER_ITEM)));
  const plan = buildDailyPlan({
    now,
    sessionSize,
    dueCards,
    questionPool,
    evidenceMastery: mastery,
    recentErrors,
    currentScores: scoresForPlanner(estimateFromAttempts(progress.attempts, bank)),
  });
  const items = plan.items.flatMap((i) => {
    const q = byId.get(i.questionId);
    return q ? [q] : [];
  });
  return {
    mode,
    items,
    sources: Object.fromEntries(plan.items.map((i) => [i.questionId, i.source])),
    timeLimitSeconds: null,
    note:
      items.length === 0
        ? "Ya respondiste todo el banco y no tienes repasos pendientes por hoy. Vuelve mañana."
        : items.length < sessionSize
          ? `Hoy hay ${items.length} preguntas disponibles (tu tiempo alcanza para ${sessionSize}).`
          : null,
  };
}

export interface GradedAnswer {
  correct: boolean;
  suggested: Rating;
}

export function gradeAnswer(q: StudyQuestion, selected: OptionLabel | null, responseTimeMs: number): GradedAnswer {
  const correct = selected !== null && q.options.some((o) => o.label === selected && o.isCorrect);
  return { correct, suggested: suggestRating(correct, responseTimeMs, q.estimatedTimeSeconds * 1000) };
}

export function reviewCard(fsrs: Fsrs6, card: FsrsCard | undefined, rating: Rating, now: number) {
  return fsrs.review(card ?? createNewCard(now), rating, now);
}

export function newId(): string {
  return crypto.randomUUID();
}
