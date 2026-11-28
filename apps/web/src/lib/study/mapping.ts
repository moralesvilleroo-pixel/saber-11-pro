import type { SubjectCode } from "@icfes/core";
import type { OptionLabel, QuestionTable, StudyQuestion } from "./types";

/** Fila de `get_questions_since` (o del lote JSON ya adaptado). */
export interface QuestionRow {
  id: string;
  evidence_id?: string;
  subject_id: string;
  status: string;
  context_type: string;
  context_content: unknown;
  stem: string;
  options: unknown;
  irt_a: number;
  irt_b: number;
  irt_c: number;
  estimated_time_seconds: number;
  version: number;
}

export interface EvidenceInfo {
  code: string;
  competencyCode: string;
}

const SUBJECTS = new Set<string>(["LC", "MA", "SC", "CN", "IN"]);
const LABELS = new Set<string>(["A", "B", "C", "D"]);

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function parseTable(v: unknown): QuestionTable | null {
  if (typeof v !== "object" || v === null) return null;
  const t = v as Record<string, unknown>;
  if (!Array.isArray(t.headers) || !Array.isArray(t.rows)) return null;
  return {
    caption: str(t.caption) ?? "",
    headers: t.headers.map(String),
    rows: t.rows.filter(Array.isArray).map((r: unknown[]) => r.map((c) => (typeof c === "number" ? c : String(c)))),
  };
}

/** Convierte una fila de la base en pregunta de estudio; devuelve null si esta incompleta o retirada. */
export function questionFromRow(row: QuestionRow, evidence: EvidenceInfo | undefined): StudyQuestion | null {
  if (row.status === "retired" || !evidence || !SUBJECTS.has(row.subject_id)) return null;
  if (!Array.isArray(row.options) || row.options.length !== 4) return null;
  const options = row.options.map((o: Record<string, unknown>) => ({
    label: String(o.label) as OptionLabel,
    text: String(o.text ?? ""),
    isCorrect: o.is_correct === true,
    feedback: String(o.explanation_feedback ?? ""),
  }));
  if (!options.every((o) => LABELS.has(o.label)) || options.filter((o) => o.isCorrect).length !== 1) return null;
  const ctx = (typeof row.context_content === "object" && row.context_content !== null
    ? row.context_content
    : {}) as Record<string, unknown>;
  return {
    questionId: row.id,
    subject: row.subject_id as SubjectCode,
    competencyCode: evidence.competencyCode,
    evidenceId: evidence.code,
    irt: { a: row.irt_a, b: row.irt_b, c: row.irt_c },
    estimatedTimeSeconds: row.estimated_time_seconds,
    version: row.version,
    contextType: row.context_type,
    context: { title: str(ctx.title), text: str(ctx.text), svg: str(ctx.svg), table: parseTable(ctx.table) },
    stem: row.stem,
    options,
  };
}
