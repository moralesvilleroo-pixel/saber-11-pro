import { AreaScoresSchema, SUBJECT_WEIGHTS, type AreaScores } from "../schemas.js";

const CORE_SUBJECTS = ["LC", "MA", "SC", "CN"] as const;

/**
 * Indice Global (0-100, sin redondear).
 * Con Ingles: IG = (3*LC + 3*MA + 3*SC + 3*CN + IN) / 13.
 * Exento de Ingles (IN = null): promedio aritmetico simple de las otras cuatro pruebas.
 */
export function computeGlobalIndex(scores: AreaScores): number {
  const s = AreaScoresSchema.parse(scores);
  if (s.IN === null) {
    return CORE_SUBJECTS.reduce((acc, k) => acc + s[k], 0) / CORE_SUBJECTS.length;
  }
  const weighted =
    CORE_SUBJECTS.reduce((acc, k) => acc + SUBJECT_WEIGHTS[k] * s[k], 0) +
    SUBJECT_WEIGHTS.IN * s.IN;
  return weighted / 13;
}

/** Puntaje Global oficial: round(IG * 5), entero acotado a [0, 500]. */
export function computeGlobalScore(scores: AreaScores): number {
  const pg = Math.round(computeGlobalIndex(scores) * 5);
  return Math.min(500, Math.max(0, pg));
}
