/**
 * FSRS-6 (Free Spaced Repetition Scheduler), modelo DSR:
 * Dificultad (D), Estabilidad (S) y Recuperabilidad (R).
 *
 * Implementacion fiel al planificador de referencia `py-fsrs` 6.x
 * (open-spaced-repetition), sin "fuzz" de intervalos para que sea determinista.
 * Las pruebas comparan contra valores generados con esa libreria.
 *
 * Todo el tiempo se expresa en milisegundos desde epoch (UTC): el nucleo no lee
 * el reloj del sistema; quien llama pasa `now`.
 */

export const FSRS6_DEFAULT_PARAMETERS: readonly number[] = Object.freeze([
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835,
  0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
]);

export const STABILITY_MIN = 0.001;
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 10;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy. */
export type Rating = 1 | 2 | 3 | 4;
export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 } as const;

export type CardState = "New" | "Learning" | "Review" | "Relearning";

export interface FsrsCard {
  state: CardState;
  /** Paso de aprendizaje/reaprendizaje; null en Review. */
  step: number | null;
  /** null mientras la tarjeta no se ha repasado nunca. */
  stability: number | null;
  difficulty: number | null;
  dueAt: number;
  lastReviewAt: number | null;
  reps: number;
  lapses: number;
}

export interface FsrsConfig {
  /** 21 parametros w0..w20. */
  parameters: readonly number[];
  /** Retencion objetivo (0, 1). Ver getDynamicTargetRetention. */
  desiredRetention: number;
  learningStepsMinutes: readonly number[];
  relearningStepsMinutes: readonly number[];
  maximumIntervalDays: number;
}

export const DEFAULT_FSRS_CONFIG: Readonly<FsrsConfig> = Object.freeze({
  parameters: FSRS6_DEFAULT_PARAMETERS,
  desiredRetention: 0.9,
  learningStepsMinutes: [1, 10],
  relearningStepsMinutes: [10],
  maximumIntervalDays: 36500,
});

export interface ReviewResult {
  card: FsrsCard;
  /** Recuperabilidad estimada justo antes del repaso (0 si era nueva). */
  retrievabilityBefore: number;
  /** Dias completos desde el repaso anterior (0 si era nueva). */
  elapsedDays: number;
  /** Intervalo programado en dias (fraccionario si es un paso en minutos). */
  scheduledDays: number;
}

export function createNewCard(now: number): FsrsCard {
  return {
    state: "New",
    step: 0,
    stability: null,
    difficulty: null,
    dueAt: now,
    lastReviewAt: null,
    reps: 0,
    lapses: 0,
  };
}

/** Motor FSRS-6 con una configuracion fija. */
export class Fsrs6 {
  readonly config: FsrsConfig;
  private readonly w: readonly number[];
  private readonly decay: number;
  private readonly factor: number;

  constructor(config: Partial<FsrsConfig> = {}) {
    this.config = { ...DEFAULT_FSRS_CONFIG, ...config };
    const { parameters, desiredRetention } = this.config;
    if (parameters.length !== 21 || parameters.some((p) => !Number.isFinite(p))) {
      throw new Error("FSRS-6 requiere exactamente 21 parametros finitos");
    }
    if (!(desiredRetention > 0 && desiredRetention < 1)) {
      throw new Error("desiredRetention debe estar en (0, 1)");
    }
    this.w = parameters;
    this.decay = -this.param(20);
    this.factor = 0.9 ** (1 / this.decay) - 1;
  }

  private param(i: number): number {
    const v = this.w[i];
    if (v === undefined) throw new Error(`Parametro w${i} ausente`);
    return v;
  }

  /** R(t, S) = (1 + FACTOR * t / S) ^ DECAY, con t en dias completos. */
  retrievability(card: FsrsCard, now: number): number {
    if (card.lastReviewAt === null || card.stability === null) return 0;
    const elapsed = Math.max(0, Math.floor((now - card.lastReviewAt) / DAY_MS));
    return (1 + (this.factor * elapsed) / card.stability) ** this.decay;
  }

  /** Intervalo en dias enteros para alcanzar la retencion objetivo. */
  nextIntervalDays(stability: number, desiredRetention = this.config.desiredRetention): number {
    const raw = (stability / this.factor) * (desiredRetention ** (1 / this.decay) - 1);
    return Math.min(Math.max(Math.round(raw), 1), this.config.maximumIntervalDays);
  }

  initialStability(rating: Rating): number {
    return Math.max(this.param(rating - 1), STABILITY_MIN);
  }

  initialDifficulty(rating: Rating, clamp = true): number {
    const d = this.param(4) - Math.exp(this.param(5) * (rating - 1)) + 1;
    return clamp ? clampDifficulty(d) : d;
  }

  nextDifficulty(difficulty: number, rating: Rating): number {
    const delta = -(this.param(6) * (rating - 3));
    const damped = difficulty + ((10 - difficulty) * delta) / 9;
    const reverted =
      this.param(7) * this.initialDifficulty(Rating.Easy, false) + (1 - this.param(7)) * damped;
    return clampDifficulty(reverted);
  }

  shortTermStability(stability: number, rating: Rating): number {
    let increase = Math.exp(this.param(17) * (rating - 3 + this.param(18))) * stability ** -this.param(19);
    if (rating >= Rating.Hard) increase = Math.max(increase, 1);
    return Math.max(stability * increase, STABILITY_MIN);
  }

  nextStability(difficulty: number, stability: number, retrievability: number, rating: Rating): number {
    const next =
      rating === Rating.Again
        ? this.forgetStability(difficulty, stability, retrievability)
        : this.recallStability(difficulty, stability, retrievability, rating);
    return Math.max(next, STABILITY_MIN);
  }

  private forgetStability(difficulty: number, stability: number, retrievability: number): number {
    const longTerm =
      this.param(11) *
      difficulty ** -this.param(12) *
      ((stability + 1) ** this.param(13) - 1) *
      Math.exp((1 - retrievability) * this.param(14));
    const shortTerm = stability / Math.exp(this.param(17) * this.param(18));
    return Math.min(longTerm, shortTerm);
  }

  private recallStability(
    difficulty: number,
    stability: number,
    retrievability: number,
    rating: Rating,
  ): number {
    const hardPenalty = rating === Rating.Hard ? this.param(15) : 1;
    const easyBonus = rating === Rating.Easy ? this.param(16) : 1;
    return (
      stability *
      (1 +
        Math.exp(this.param(8)) *
          (11 - difficulty) *
          stability ** -this.param(9) *
          (Math.exp((1 - retrievability) * this.param(10)) - 1) *
          hardPenalty *
          easyBonus)
    );
  }

  /** Aplica un repaso y devuelve la tarjeta actualizada (no muta la original). */
  review(card: FsrsCard, rating: Rating, now: number): ReviewResult {
    if (![1, 2, 3, 4].includes(rating)) throw new Error(`Calificacion invalida: ${rating}`);
    if (card.lastReviewAt !== null && now < card.lastReviewAt) {
      throw new Error("El repaso no puede ser anterior al ultimo repaso");
    }

    const elapsedDays =
      card.lastReviewAt === null ? 0 : Math.floor((now - card.lastReviewAt) / DAY_MS);
    const sameDay = card.lastReviewAt !== null && elapsedDays < 1;
    const retrievabilityBefore = this.retrievability(card, now);

    let { stability, difficulty, step } = card;
    let state: CardState = card.state === "New" ? "Learning" : card.state;
    if (state !== "Review" && step === null) step = 0;
    let intervalMs: number;

    if (stability === null || difficulty === null) {
      stability = this.initialStability(rating);
      difficulty = this.initialDifficulty(rating);
    } else {
      stability = sameDay
        ? this.shortTermStability(stability, rating)
        : this.nextStability(difficulty, stability, retrievabilityBefore, rating);
      difficulty = this.nextDifficulty(difficulty, rating);
    }

    const toReview = (s: number): number => {
      state = "Review";
      step = null;
      return this.nextIntervalDays(s) * DAY_MS;
    };

    if (state === "Review") {
      if (rating === Rating.Again && this.config.relearningStepsMinutes.length > 0) {
        state = "Relearning";
        step = 0;
        intervalMs = stepMs(this.config.relearningStepsMinutes, 0);
      } else {
        intervalMs = toReview(stability);
      }
    } else {
      const steps =
        state === "Learning" ? this.config.learningStepsMinutes : this.config.relearningStepsMinutes;
      const current = step ?? 0;
      if (steps.length === 0 || (current >= steps.length && rating !== Rating.Again)) {
        intervalMs = toReview(stability);
      } else if (rating === Rating.Again) {
        step = 0;
        intervalMs = stepMs(steps, 0);
      } else if (rating === Rating.Hard) {
        if (current === 0 && steps.length === 1) intervalMs = stepMs(steps, 0) * 1.5;
        else if (current === 0) intervalMs = (stepMs(steps, 0) + stepMs(steps, 1)) / 2;
        else intervalMs = stepMs(steps, current);
      } else if (rating === Rating.Good) {
        if (current + 1 === steps.length) {
          intervalMs = toReview(stability);
        } else {
          step = current + 1;
          intervalMs = stepMs(steps, step);
        }
      } else {
        intervalMs = toReview(stability);
      }
    }

    const lapses = card.lapses + (card.state === "Review" && rating === Rating.Again ? 1 : 0);

    return {
      card: {
        state,
        step,
        stability,
        difficulty,
        dueAt: now + intervalMs,
        lastReviewAt: now,
        reps: card.reps + 1,
        lapses,
      },
      retrievabilityBefore,
      elapsedDays,
      scheduledDays: intervalMs / DAY_MS,
    };
  }
}

function stepMs(steps: readonly number[], i: number): number {
  const minutes = steps[i];
  if (minutes === undefined) throw new Error(`Paso ${i} inexistente`);
  return minutes * MINUTE_MS;
}

function clampDifficulty(d: number): number {
  return Math.min(Math.max(d, DIFFICULTY_MIN), DIFFICULTY_MAX);
}

/**
 * Retencion objetivo segun los dias que faltan para el examen (PRD seccion 3.4):
 * 0.88 con mas de 90 dias, 0.94 en los ultimos 21 dias e interpolacion lineal entre ambos.
 */
export function getDynamicTargetRetention(daysUntilExam: number): number {
  if (!Number.isFinite(daysUntilExam)) return 0.88;
  if (daysUntilExam > 90) return 0.88;
  if (daysUntilExam <= 21) return 0.94;
  const t = (90 - daysUntilExam) / (90 - 21);
  return Math.round((0.88 + t * (0.94 - 0.88)) * 10_000) / 10_000;
}
