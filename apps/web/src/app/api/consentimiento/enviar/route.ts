import { NextResponse, type NextRequest } from "next/server";
import { newConsentToken } from "@/lib/consentToken";
import { PRIVACY_POLICY_VERSION, responsable } from "@/lib/legal";
import { escapeHtml, mailConfigured, sendMail } from "@/lib/mail";
import { adminSupabase } from "@/lib/supabase/admin";
import { serverSupabase } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

export const runtime = "nodejs";

const ERRORS: Record<string, [number, string]> = {
  "53400": [429, "Ya enviamos un correo hace poco. Espera 10 minutos (máximo 5 por día)."],
  "55000": [409, "Tu cuenta no necesita autorización o ya está autorizada. Recarga la página."],
  "23502": [400, "Primero guarda el correo de tu acudiente."],
};

/** El estudiante (con sesion) pide que se envie el correo de autorizacion a su acudiente. */
export async function POST(request: NextRequest) {
  const supabase = await serverSupabase();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ message: "Inicia sesión de nuevo." }, { status: 401 });
  if (!mailConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ message: "El envío de correos aún no está configurado en el servidor." }, { status: 503 });
  }

  const { token, hash } = newConsentToken();
  const admin = adminSupabase();
  const { data, error } = await admin.rpc("request_parental_consent", {
    p_profile_id: user.id,
    p_token_hash: hash,
    p_policy_version: PRIVACY_POLICY_VERSION,
  });
  if (error) {
    const [status, message] = ERRORS[error.code ?? ""] ?? [500, "No se pudo crear la solicitud. Intenta más tarde."];
    return NextResponse.json({ message }, { status });
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { guardian_email: string; student_name: string; expires_at: string }
    | undefined;
  if (!row) return NextResponse.json({ message: "No se pudo crear la solicitud." }, { status: 500 });

  const link = `${siteUrl(request.nextUrl.origin)}/acudiente/${token}`;
  const who = responsable();
  const expires = new Date(row.expires_at).toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "long" });
  const student = row.student_name;
  const text = [
    `Hola. ${student} creó una cuenta en Saber11 Pro para prepararse para el examen Saber 11.`,
    "",
    "Como es menor de edad, necesitamos tu autorización como madre, padre o representante legal para tratar sus datos de estudio (respuestas, tiempos y puntajes estimados), según la Ley 1581 de 2012 y el Decreto 1377 de 2013.",
    "",
    `Para leer qué datos tratamos y autorizar, abre este enlace (vence el ${expires}):`,
    link,
    "",
    "Si no conoces esta solicitud, ignora este correo: sin tu autorización no se guarda ningún dato de estudio.",
    `${who.nombre}${who.correo ? ` · ${who.correo}` : ""}`,
  ].join("\n");
  const html = `<p>Hola. <strong>${escapeHtml(student)}</strong> creó una cuenta en Saber11 Pro para prepararse para el examen Saber 11.</p>
<p>Como es menor de edad, necesitamos tu autorización como madre, padre o representante legal para tratar sus datos de estudio (respuestas, tiempos y puntajes estimados), según la Ley 1581 de 2012 y el Decreto 1377 de 2013.</p>
<p><a href="${escapeHtml(link)}">Leer y autorizar</a> (el enlace vence el ${escapeHtml(expires)}).</p>
<p>Si no conoces esta solicitud, ignora este correo: sin tu autorización no se guarda ningún dato de estudio.</p>
<p>${escapeHtml(who.nombre)}${who.correo ? ` · ${escapeHtml(who.correo)}` : ""}</p>`;

  try {
    await sendMail(row.guardian_email, `Autorización para ${student} en Saber11 Pro`, text, html);
  } catch {
    return NextResponse.json({ message: "No se pudo enviar el correo. Intenta en 10 minutos." }, { status: 502 });
  }
  return NextResponse.json({ message: `Enviamos el correo a ${row.guardian_email}. El enlace vence el ${expires}.` });
}
