import { z } from "zod";
import { SUBJECT_CODES } from "../schemas.js";

/**
 * Formato de salida del generador de items (Prompt 5, docs/PROMPT_5_GENERADOR.md) y su validacion.
 * Todo item es 100 % original: este esquema no acepta campos de procedencia externa.
 */

export const SVG_MAX_BYTES = 4096;

const DIFFICULTY_B = { bajo: -1.2, medio: 0, alto: 1.3 } as const;
export type DifficultyTarget = keyof typeof DIFFICULTY_B;

/** Bytes UTF-8 sin depender de TextEncoder (no disponible en todos los entornos). */
function utf8Bytes(s: string): number {
  let bytes = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** SVG compacto y seguro: sin scripts, sin manejadores de eventos, sin recursos externos. */
export const SafeSvgSchema = z
  .string()
  .trim()
  .refine((s) => s.startsWith("<svg") && s.endsWith("</svg>"), "El SVG debe empezar con <svg y terminar con </svg>")
  .refine((s) => /\sviewBox="[^"]+"/.test(s), "El SVG debe declarar viewBox")
  .refine((s) => utf8Bytes(s) <= SVG_MAX_BYTES, `El SVG no puede pasar de ${SVG_MAX_BYTES} bytes`)
  .refine((s) => !/<script|<foreignObject|\son\w+\s*=|javascript:|(?:href|src)\s*=\s*"(?:https?:)?\/\//i.test(s), "El SVG contiene scripts, eventos o recursos externos")
  .refine((s) => /<title>[^<]+<\/title>/.test(s), "El SVG debe incluir <title> para accesibilidad");

export const TableSchema = z.object({
  caption: z.string().min(1),
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.union([z.string(), z.number()]))).min(1),
});

export const GeneratedOptionSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string().trim().min(1).max(600),
  is_correct: z.boolean(),
  distractor_diagnosis: z.string().trim().min(10).nullable(),
  explanation_feedback: z.string().trim().min(20).max(1200),
});

export const GeneratedItemSchema = z
  .object({
    id: z.uuid(),
    subject: z.enum(SUBJECT_CODES),
    evidence_code: z.string().regex(/^(LC|MA|SC|CN|IN)\.E\d+(\.\d+)?$/),
    component_code: z.string().min(1).nullable(),
    cefr_level: z.enum(["A-", "A1", "A2", "B1", "B+"]).nullable(),
    difficulty_target: z.enum(["bajo", "medio", "alto"]),
    estimated_irt: z.object({
      a: z.number().gt(0).lte(4),
      b: z.number().gte(-4).lte(4),
      c: z.number().gte(0).lte(0.5),
    }),
    context_type: z.enum(["continuous", "discontinuous", "mixed", "cefr_part"]),
    context: z.object({
      title: z.string().trim().min(1).nullable(),
      text: z.string().trim().max(6000).nullable(),
      svg: SafeSvgSchema.nullable(),
      table: TableSchema.nullable(),
    }),
    stem: z.string().trim().min(5).max(2000),
    options: z.array(GeneratedOptionSchema).length(4),
    estimated_time_seconds: z.number().int().min(10).max(900),
  })
  .superRefine((item, ctx) => {
    const issue = (message: string, path: (string | number)[] = []): void => {
      ctx.addIssue({ code: "custom", message, path });
    };

    if (!item.evidence_code.startsWith(`${item.subject}.`)) {
      issue(`La evidencia ${item.evidence_code} no pertenece a la prueba ${item.subject}`, ["evidence_code"]);
    }
    if ((item.subject === "IN") !== (item.cefr_level !== null)) {
      issue("cefr_level es obligatorio en Ingles y prohibido en las demas pruebas", ["cefr_level"]);
    }
    if ((item.context_type === "cefr_part") !== (item.subject === "IN")) {
      issue("context_type 'cefr_part' es exclusivo de Ingles", ["context_type"]);
    }
    if (item.context.text === null && item.context.svg === null && item.context.table === null && item.subject !== "IN") {
      issue("El item necesita un contexto (texto, SVG o tabla)", ["context"]);
    }
    if (item.context_type === "discontinuous" && item.context.svg === null && item.context.table === null) {
      issue("Un contexto discontinuo requiere SVG o tabla", ["context"]);
    }

    const labels = item.options.map((o) => o.label).join("");
    if (labels !== "ABCD") issue("Las opciones deben ser A, B, C y D en orden", ["options"]);
    const correct = item.options.filter((o) => o.is_correct);
    if (correct.length !== 1) issue("Debe haber exactamente una clave", ["options"]);
    item.options.forEach((o, i) => {
      if (o.is_correct && o.distractor_diagnosis !== null) {
        issue("La clave no lleva distractor_diagnosis (debe ser null)", ["options", i, "distractor_diagnosis"]);
      }
      if (!o.is_correct && o.distractor_diagnosis === null) {
        issue("Cada distractor debe explicar el error tipico que representa", ["options", i, "distractor_diagnosis"]);
      }
    });
    const texts = item.options.map((o) => o.text.toLocaleLowerCase("es"));
    if (new Set(texts).size !== 4) issue("Hay opciones repetidas", ["options"]);
    const lengths = item.options.map((o) => o.text.length);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    if (maxLen > 12 && maxLen > 2.5 * minLen) {
      issue("Las opciones deben tener extension equilibrada (la mas larga <= 2.5 veces la mas corta)", ["options"]);
    }

    const expectedB = DIFFICULTY_B[item.difficulty_target];
    if (Math.abs(item.estimated_irt.b - expectedB) > 0.8) {
      issue(`b=${item.estimated_irt.b} no coincide con la dificultad objetivo '${item.difficulty_target}' (~${expectedB})`, ["estimated_irt", "b"]);
    }
  });

export type GeneratedItem = z.infer<typeof GeneratedItemSchema>;

export interface BatchIssue {
  index: number;
  id: string | null;
  path: string;
  message: string;
}

export interface BatchValidationResult {
  ok: boolean;
  items: GeneratedItem[];
  issues: BatchIssue[];
}

/**
 * Valida un lote completo: cada item contra el esquema, evidencias y componentes existentes
 * en la taxonomia, e ids/enunciados no repetidos (dentro del lote y frente a `existingIds`).
 */
export function validateBatch(
  raw: unknown,
  taxonomy: { evidenceCodes: ReadonlySet<string>; componentCodes: ReadonlySet<string> },
  existingIds: ReadonlySet<string> = new Set(),
): BatchValidationResult {
  const issues: BatchIssue[] = [];
  if (!Array.isArray(raw)) {
    return { ok: false, items: [], issues: [{ index: -1, id: null, path: "", message: "El lote debe ser un arreglo JSON" }] };
  }

  const items: GeneratedItem[] = [];
  const seenIds = new Set<string>();
  const seenStems = new Set<string>();
  raw.forEach((candidate, index) => {
    const parsed = GeneratedItemSchema.safeParse(candidate);
    const id =
      typeof candidate === "object" && candidate !== null && "id" in candidate && typeof candidate.id === "string"
        ? candidate.id
        : null;
    if (!parsed.success) {
      for (const e of parsed.error.issues) issues.push({ index, id, path: e.path.join("."), message: e.message });
      return;
    }
    const item = parsed.data;
    if (!taxonomy.evidenceCodes.has(item.evidence_code)) {
      issues.push({ index, id, path: "evidence_code", message: `Evidencia desconocida: ${item.evidence_code}` });
    }
    if (item.component_code !== null && !taxonomy.componentCodes.has(item.component_code)) {
      issues.push({ index, id, path: "component_code", message: `Componente desconocido: ${item.component_code}` });
    }
    if (seenIds.has(item.id) || existingIds.has(item.id)) {
      issues.push({ index, id, path: "id", message: "id repetido" });
    }
    const stemKey = `${item.context.text ?? ""}|${item.stem}`.toLocaleLowerCase("es");
    if (seenStems.has(stemKey)) issues.push({ index, id, path: "stem", message: "Enunciado repetido en el lote" });
    seenIds.add(item.id);
    seenStems.add(stemKey);
    items.push(item);
  });

  return { ok: issues.length === 0, items, issues };
}
