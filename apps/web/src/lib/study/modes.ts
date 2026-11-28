import type { StudyMode } from "./types";

export const MODE_SLUGS: Record<string, StudyMode> = {
  diagnostico: "diagnostic",
  diaria: "fsrs_daily",
  simulacro: "mock_exam",
};

export function modeFromSlug(slug: string | string[] | undefined): StudyMode | null {
  const s = Array.isArray(slug) ? slug[0] : slug;
  return (s && MODE_SLUGS[s]) || null;
}

/** "media" = media sesion del simulacro (PRD 3.5: resistencia progresiva). */
export function mockScaleFromParam(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "media" ? 0.5 : s === "cuarto" ? 0.25 : undefined;
}
