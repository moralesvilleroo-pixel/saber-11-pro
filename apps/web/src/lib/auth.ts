import "server-only";
import { redirect } from "next/navigation";
import { serverSupabase } from "./supabase/server";

export interface ProfileRow {
  id: string;
  display_name: string | null;
  birth_year: number | null;
  is_minor: boolean;
  parent_guardian_email: string | null;
  parental_consent_status: "pending" | "verified" | "not_required";
  exam_calendar: "A" | "B";
  target_exam_date: string | null;
  target_global_score: number | null;
  daily_study_minutes: number;
}

const PROFILE_COLUMNS =
  "id, display_name, birth_year, is_minor, parent_guardian_email, parental_consent_status, exam_calendar, target_exam_date, target_global_score, daily_study_minutes";

/** Usuario y perfil de la sesion actual; redirige a /ingresar si no hay sesion. */
export async function requireProfile(next: string) {
  const supabase = await serverSupabase();
  if (!supabase) redirect("/configuracion-pendiente");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/ingresar?siguiente=${encodeURIComponent(next)}`);
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).single();
  if (error || !data) throw new Error(`No se encontró tu perfil: ${error?.message ?? "sin datos"}`);
  const profile = data as ProfileRow;
  return { supabase, user, profile, canStudy: profile.parental_consent_status !== "pending" };
}

/** Solo rutas internas (evita redirecciones abiertas a otros sitios). */
export function safeNext(v: string | null | undefined, fallback = "/inicio"): string {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}
