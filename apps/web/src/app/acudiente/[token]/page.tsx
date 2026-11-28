import type { Metadata } from "next";
import Link from "next/link";
import { hashConsentToken, isWellFormedToken } from "@/lib/consentToken";
import { responsable } from "@/lib/legal";
import { adminSupabase } from "@/lib/supabase/admin";
import { GuardianApproval } from "./GuardianApproval";

export const metadata: Metadata = { title: "Autorización del acudiente", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  used: "Esta autorización ya fue registrada. No tienes que hacer nada más.",
  revoked: "Este enlace fue reemplazado por uno más reciente. Usa el último correo que recibiste.",
  expired: "Este enlace venció. Pide al estudiante que envíe una nueva solicitud desde su cuenta.",
  email_changed: "El estudiante cambió el correo del acudiente después de enviar esta solicitud, así que el enlace ya no vale.",
  not_found: "No encontramos esta solicitud. Revisa que el enlace esté completo.",
};

export default async function GuardianPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let info: { state: string; student_name: string | null; policy_version: string | null } = {
    state: "not_found",
    student_name: null,
    policy_version: null,
  };
  if (isWellFormedToken(token)) {
    const { data } = await adminSupabase().rpc("get_parental_consent", { p_token_hash: hashConsentToken(token) });
    const row = (Array.isArray(data) ? data[0] : data) as typeof info | undefined;
    if (row) info = row;
  }
  const who = responsable();

  if (info.state !== "valid") {
    return (
      <div className="card">
        <h1 className="text-xl font-bold">Autorización del acudiente</h1>
        <p className="mt-2">{MESSAGES[info.state] ?? MESSAGES.not_found}</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h1 className="text-2xl font-bold">Autorización para el tratamiento de datos de {info.student_name}</h1>
      <p className="leading-relaxed">
        <strong>{info.student_name}</strong> quiere usar Saber11 Pro para prepararse para el Saber 11. Como es menor de
        edad, la Ley 1581 de 2012 (artículo 7) y el Decreto 1377 de 2013 exigen tu autorización previa como representante
        legal.
      </p>
      <div className="rounded-lg bg-surface-2 p-4 text-sm leading-relaxed">
        <p className="font-semibold">Qué datos tratamos y para qué</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Correo, nombre o apodo, año de nacimiento y calendario del colegio: para la cuenta.</li>
          <li>Respuestas, tiempos y puntajes estimados: solo para programar sus repasos y mostrarle su avance.</li>
          <li>No vendemos ni compartimos sus datos, no mostramos publicidad y no usamos sus datos para perfilarlo comercialmente.</li>
          <li>
            Puedes consultar, corregir o pedir que borremos sus datos, o retirar esta autorización, en{" "}
            <Link href="/arco" className="text-primary underline">
              Consultas y reclamos
            </Link>
            .
          </li>
        </ul>
        <p className="mt-2">
          Responsable: {who.nombre}
          {who.correo ? ` (${who.correo})` : ""}. Lee la{" "}
          <Link href="/privacidad" target="_blank" className="text-primary underline">
            Política de Tratamiento de Datos
          </Link>{" "}
          (versión {info.policy_version}).
        </p>
      </div>
      <GuardianApproval token={token} studentName={info.student_name ?? "el estudiante"} />
    </div>
  );
}
