import "server-only";
// Muestra fija para el modo demo. Al sumar lotes al banco no hace falta tocar esto: la cuenta los baja de Supabase.
import lote001 from "../../../../../banco/lotes/2026-11-lote-001-lectura-critica.json";
import lote002 from "../../../../../banco/lotes/2026-11-lote-002-matematicas.json";
import lote003 from "../../../../../banco/lotes/2026-11-lote-003-ingles-parte1.json";
import lote005 from "../../../../../banco/lotes/2026-11-lote-005-ingles-parte3.json";
import lote007 from "../../../../../banco/lotes/2026-11-lote-007-ingles-parte5.json";
import lote010 from "../../../../../banco/lotes/2026-11-lote-010-sociales-pensamiento-social.json";
import lote015 from "../../../../../banco/lotes/2026-11-lote-015-ciencias-biologia.json";
import taxonomy from "../../../../../docs/MBE_TAXONOMIA.json";
import { questionFromRow, type EvidenceInfo } from "./mapping";
import type { StudyQuestion } from "./types";

interface LoteItem {
  id: string;
  subject: string;
  evidence_code: string;
  context_type: string;
  context: unknown;
  stem: string;
  options: { label: string; text: string; is_correct: boolean; explanation_feedback: string }[];
  estimated_irt: { a: number; b: number; c: number };
  estimated_time_seconds: number;
}

function evidenceIndex(): Map<string, EvidenceInfo> {
  const out = new Map<string, EvidenceInfo>();
  for (const subject of taxonomy.subjects) {
    for (const comp of subject.competencies) {
      for (const aff of comp.affirmations ?? []) {
        for (const ev of aff.evidences ?? []) out.set(ev.code, { code: ev.code, competencyCode: comp.code });
      }
    }
  }
  return out;
}

/** Preguntas de muestra para el modo demo (las mismas del banco, sin pasar por Supabase). */
export function demoBank(): StudyQuestion[] {
  const evidences = evidenceIndex();
  return ([...lote001, ...lote002, ...lote003, ...lote005, ...lote007, ...lote010, ...lote015] as LoteItem[]).flatMap((it) => {
    const q = questionFromRow(
      {
        id: it.id,
        subject_id: it.subject,
        status: "qa_passed",
        context_type: it.context_type,
        context_content: it.context,
        stem: it.stem,
        options: it.options,
        irt_a: it.estimated_irt.a,
        irt_b: it.estimated_irt.b,
        irt_c: it.estimated_irt.c,
        estimated_time_seconds: it.estimated_time_seconds,
        version: 1,
      },
      evidences.get(it.evidence_code),
    );
    return q ? [q] : [];
  });
}
