import { z } from "zod";

/** Codigos de las cinco pruebas oficiales del Saber 11. */
export const SUBJECT_CODES = ["LC", "MA", "SC", "CN", "IN"] as const;
export type SubjectCode = (typeof SUBJECT_CODES)[number];

/** Peso de cada prueba en el Indice Global (Resolucion Icfes 0268 de 2020). */
export const SUBJECT_WEIGHTS: Readonly<Record<SubjectCode, 1 | 3>> = {
  LC: 3,
  MA: 3,
  SC: 3,
  CN: 3,
  IN: 1,
};

/** Puntaje de una prueba: entero en escala 0-100. */
export const AreaScoreSchema = z.number().int().min(0).max(100);

export const AreaScoresSchema = z.object({
  LC: AreaScoreSchema,
  MA: AreaScoreSchema,
  SC: AreaScoreSchema,
  CN: AreaScoreSchema,
  /** null cuando el evaluado esta exento de Ingles. */
  IN: AreaScoreSchema.nullable(),
});
export type AreaScores = z.infer<typeof AreaScoresSchema>;

export const OptionLabelSchema = z.enum(["A", "B", "C", "D"]);

export const QuestionOptionSchema = z.object({
  label: OptionLabelSchema,
  text: z.string().min(1),
  is_correct: z.boolean(),
  distractor_type: z.string().nullable(),
  explanation_feedback: z.string().min(1),
});

/** Exactamente 4 opciones A-D, en orden, con una unica clave. */
export const QuestionOptionsSchema = z
  .array(QuestionOptionSchema)
  .length(4)
  .refine((opts) => opts.map((o) => o.label).join("") === "ABCD", {
    message: "Las opciones deben ser A, B, C y D en ese orden",
  })
  .refine((opts) => opts.filter((o) => o.is_correct).length === 1, {
    message: "Debe existir exactamente una opcion correcta",
  });
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
