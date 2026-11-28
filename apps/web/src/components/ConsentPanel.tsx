"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";

export function ConsentPanel({ userId, guardianEmail }: { userId: string; guardianEmail: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState(guardianEmail ?? "");
  const [editing, setEditing] = useState(!guardianEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await browserSupabase()
      .from("profiles")
      .update({ parent_guardian_email: email.trim() })
      .eq("id", userId);
    setBusy(false);
    if (error) return setMessage({ ok: false, text: "No se pudo guardar el correo. Revisa que esté bien escrito." });
    setEditing(false);
    setMessage({ ok: true, text: "Correo guardado. Ahora envía la solicitud de autorización." });
    router.refresh();
  }

  async function send() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/consentimiento/enviar", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    setMessage({ ok: res.ok, text: body.message ?? (res.ok ? "Correo enviado." : "No se pudo enviar el correo.") });
  }

  return (
    <section className="card space-y-4" aria-labelledby="consentimiento">
      <h2 id="consentimiento" className="text-lg font-semibold">
        Falta la autorización de tu acudiente
      </h2>
      <p className="leading-relaxed">
        Como eres menor de edad (o cumples 18 este año), la Ley 1581 de 2012 nos pide la autorización de tu madre, padre
        o representante legal antes de guardar tu progreso. Le enviaremos un correo con un enlace para que la dé.
      </p>
      {editing ? (
        <form onSubmit={saveEmail} className="space-y-3">
          <label className="label">
            Correo del acudiente
            <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" className="btn-secondary" disabled={busy}>
            Guardar correo
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p>
            Se enviará a <strong>{email}</strong>.
          </p>
          <button type="button" className="text-sm text-primary underline" onClick={() => setEditing(true)}>
            Cambiar
          </button>
        </div>
      )}
      {!editing && (
        <button type="button" className="btn-primary" onClick={send} disabled={busy}>
          {busy ? "Enviando…" : "Enviar correo de autorización"}
        </button>
      )}
      {message && (
        <p className={`rounded-lg p-3 text-sm ${message.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`} role="status">
          {message.text}
        </p>
      )}
      <p className="text-sm text-muted">
        Cuando tu acudiente autorice, recarga esta página. Mientras tanto puedes practicar en la{" "}
        <Link href="/demo" className="text-primary underline">
          demo
        </Link>
        , que no guarda nada en el servidor.
      </p>
    </section>
  );
}
