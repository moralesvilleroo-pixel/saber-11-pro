import type { CardState, FsrsCard } from "../spaced-repetition/fsrs6.js";

/**
 * Conversion entre la tarjeta FSRS del nucleo (tiempos en ms) y la fila de
 * `user_card_fsrs_state` que viaja en `sync_offline_batch` (fechas ISO, dias enteros).
 */
export interface FsrsStateRow {
  question_id: string;
  stability: number;
  difficulty: number;
  retrievability_cache: number | null;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  step: number | null;
  due_at: string;
  last_review_at: string | null;
  updated_at: string;
}

const STATES: readonly CardState[] = ["New", "Learning", "Review", "Relearning"];

export function cardToRow(
  questionId: string,
  card: FsrsCard,
  extra: { retrievability: number | null; elapsedDays: number; scheduledDays: number; updatedAt: number },
): FsrsStateRow {
  return {
    question_id: questionId,
    stability: card.stability ?? 0,
    difficulty: card.difficulty ?? 0,
    retrievability_cache: extra.retrievability === null ? null : clamp01(extra.retrievability),
    elapsed_days: Math.max(0, Math.floor(extra.elapsedDays)),
    // La columna es entera: los pasos en minutos quedan en 0 dias.
    scheduled_days: Math.max(0, Math.floor(extra.scheduledDays)),
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    step: card.state === "Review" ? null : card.step ?? 0,
    due_at: new Date(card.dueAt).toISOString(),
    last_review_at: card.lastReviewAt === null ? null : new Date(card.lastReviewAt).toISOString(),
    updated_at: new Date(extra.updatedAt).toISOString(),
  };
}

export function rowToCard(row: Omit<FsrsStateRow, "question_id">): FsrsCard {
  if (!STATES.includes(row.state)) throw new Error(`Estado FSRS invalido: ${String(row.state)}`);
  const neverReviewed = row.last_review_at === null || row.reps === 0;
  const dueAt = Date.parse(row.due_at);
  if (!Number.isFinite(dueAt)) throw new Error(`due_at invalido: ${row.due_at}`);
  return {
    state: row.state,
    step: row.state === "Review" ? null : row.step ?? 0,
    stability: neverReviewed ? null : row.stability,
    difficulty: neverReviewed ? null : row.difficulty,
    dueAt,
    lastReviewAt: row.last_review_at === null ? null : Date.parse(row.last_review_at),
    reps: row.reps,
    lapses: row.lapses,
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
