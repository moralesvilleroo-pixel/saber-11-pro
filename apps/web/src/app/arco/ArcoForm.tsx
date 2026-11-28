"use client";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";

const TYPES = [
  { value: "consulta", label: "Consulta: quiero saber qué datos tienen" },
  { value: "actualizacion", label: "Actualización de mis datos" },
  { value: "rectificacion", label: "Corrección de un dato (por ejemplo, el año de nacimiento)" },
  { value: "supresion", label: "Supresión: borren mis datos" },
  { value: "revocatoria", label: "Revocar la autorización" },
] as const;

const ROLES = [
  { value: "titular", label: "Soy el titular de los datos" },
  { value: "representante_legal", label: "Soy madre, padre o representante legal" },
  { value: "causahabiente", label: "Soy causahabiente" },
] as const;

export function ArcoForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("titular");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("consulta");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) return setStatus({ ok: false, text: "Cuéntanos un poco más (mínimo 10 caracteres)." });
    setBusy(true);
    let db;
    try {
      db = browserSupabase();
    } catch {
      setBusy(false);
      return setStatus({ ok: false, text: "El formulario aún no está conectado. Escríbenos al correo de la política." });
    }
    const {
      data: { user },
    } = await db.auth.getUser();
    const { error } = await db.from("arco_requests").insert({
      user_id: user?.id ?? null,
      requester_email: email.trim(),
      requester_role: role,
      request_type: type,
      description: description.trim(),
    });
    setBusy(false);
    if (error) return setStatus({ ok: false, text: "No se pudo registrar. Revisa los datos e intenta de nuevo." });
    setStatus({
      ok: true,
      text: `Recibimos tu solicitud. Te responderemos a ${email.trim()} en máximo ${type === "consulta" ? 10 : 15} días hábiles.`,
    });
    setDescription("");
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <label className="label">
        Correo para responderte
        <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="label">
        Quién hace la solicitud
        <select className="field" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Tipo de solicitud
        <select className="field" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Detalle
        <textarea
          className="field min-h-28"
          maxLength={4000}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {status && (
        <p className={`rounded-lg p-3 text-sm ${status.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`} role="status">
          {status.text}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        Enviar solicitud
      </button>
    </form>
  );
}
