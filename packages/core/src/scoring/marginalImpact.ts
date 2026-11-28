import { computeGlobalIndex, computeGlobalScore } from "./globalScore.js";
import { SUBJECT_CODES, type AreaScores, type SubjectCode } from "../schemas.js";

export interface SubjectImpact {
  subject: SubjectCode;
  current: number;
  /** Puntos de Puntaje Global (0-500) ganados al subir +5 en la prueba, sin redondear. */
  plus5: number;
  /** Puntos de Puntaje Global ganados al subir +10, sin redondear. */
  plus10: number;
  /** Puntaje Global oficial (redondeado) resultante con +10. */
  globalWithPlus10: number;
}

/**
 * Cuantos puntos del Puntaje Global aporta subir +5 y +10 puntos en cada prueba.
 * Respeta el tope de 100 por prueba. Si el evaluado esta exento de Ingles, IN no aparece.
 * Ordenado de mayor a menor impacto (+10).
 */
export function calculateMarginalImpact(currentScores: AreaScores): SubjectImpact[] {
  const baseIndex = computeGlobalIndex(currentScores);
  const subjects = SUBJECT_CODES.filter((s) => !(s === "IN" && currentScores.IN === null));

  const gain = (subject: SubjectCode, delta: number): { exact: number; scores: AreaScores } => {
    const current = currentScores[subject] ?? 0;
    const scores: AreaScores = { ...currentScores, [subject]: Math.min(100, current + delta) };
    return { exact: (computeGlobalIndex(scores) - baseIndex) * 5, scores };
  };

  return subjects
    .map((subject) => {
      const p10 = gain(subject, 10);
      return {
        subject,
        current: currentScores[subject] ?? 0,
        plus5: gain(subject, 5).exact,
        plus10: p10.exact,
        globalWithPlus10: computeGlobalScore(p10.scores),
      };
    })
    .sort((x, y) => y.plus10 - x.plus10);
}
