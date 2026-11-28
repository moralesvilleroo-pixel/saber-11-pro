import type { Rating } from "./fsrs6.js";

/**
 * Calificacion FSRS propuesta tras responder una pregunta (PRD 2.2); el estudiante puede ajustarla.
 * Incorrecta u omitida -> 1 (Again). Correcta: mas de 1.5x el tiempo esperado -> 2 (Hard),
 * menos de 0.5x -> 4 (Easy), en otro caso -> 3 (Good).
 */
export function suggestRating(isCorrect: boolean, responseTimeMs: number, expectedTimeMs: number): Rating {
  if (!isCorrect) return 1;
  if (!(expectedTimeMs > 0) || !(responseTimeMs >= 0)) return 3;
  const ratio = responseTimeMs / expectedTimeMs;
  if (ratio > 1.5) return 2;
  if (ratio < 0.5) return 4;
  return 3;
}
