"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { isMinorByBirthYear } from "@/lib/legal";
import { browserSupabase } from "@/lib/supabase/client";

export function RegisterForm({ policyVersion }: { policyVersion: string }) {
  const thisYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 60 }, (_, i) => thisYear - 12 - i), [thisYear]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [guardian, setGuardian] = useState("");
  const [calendar, setCalendar] = useState<"A" | "B">("A");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const minor = isMinorByBirthYear(birthYear ? Number(birthYear) : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!birthYear) return setError("Elige tu año de nacimiento.");
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (minor && guardian.trim().toLowerCase() === email.trim().toLowerCase()) {
      return setError("El correo del acudiente debe ser distinto al tuyo.");
    }
    if (!accepted) return setError("Debes aceptar la Política de Tratamiento de Datos.");
    setBusy(true);
    const { error: err } = await browserSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/inicio`,
        data: {
          display_name: name.trim(),
          birth_year: birthYear,
          parent_guardian_email: minor ? guardian.trim() : "",
          privacy_policy_version: policyVersion,
          exam_calendar: calendar,
        },
      },
    });
    setBusy(false);
    if (err) {
      setError(/registered|exists/i.test(err.message) ? "Ese correo ya tiene una cuenta. Ingresa con él." : err.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Revisa tu correo</h1>
        <p className="mt-2 leading-relaxed">
          Te enviamos un enlace a <strong>{email}</strong> para confirmar tu cuenta. Si no llega en unos minutos, revisa
          la carpeta de spam.
        </p>
        {minor && (
          <p className="mt-3 rounded-lg bg-warn-bg p-3 text-sm text-warn">
            Después de confirmar e ingresar, podrás enviar a tu acudiente el correo de autorización. Hasta que lo
            autorice no guardaremos tu progreso; mientras tanto puedes usar la demo.
          </p>
        )}
        <Link href="/ingresar" className="btn-primary mt-4">
          Ir a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      <label className="label">
        Nombre o apodo
        <input className="field" maxLength={80} autoComplete="nickname" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="label">
        Correo
        <input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="label">
        Contraseña (mínimo 8 caracteres)
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="label">
        Año de nacimiento
        <select className="field" required value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
          <option value="">Elige…</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">No se puede cambiar después; si te equivocas, pide la corrección en ARCO.</span>
      </label>
      {birthYear && minor && (
        <div className="rounded-lg bg-surface-2 p-3">
          <label className="label">
            Correo de tu madre, padre o acudiente
            <input className="field" type="email" required value={guardian} onChange={(e) => setGuardian(e.target.value)} />
          </label>
          <p className="mt-2 text-xs text-muted">
            Por la Ley 1581 de 2012, si tienes 18 años o menos este año necesitamos la autorización de tu representante
            legal antes de guardar tus datos de estudio. Le enviaremos un correo para que la dé.
          </p>
        </div>
      )}
      <fieldset>
        <legend className="label">Calendario de tu colegio</legend>
        <div className="mt-1 flex gap-4">
          {(["A", "B"] as const).map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input type="radio" name="calendar" checked={calendar === c} onChange={() => setCalendar(c)} /> Calendario {c}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>
          Leí y acepto la{" "}
          <Link href="/privacidad" target="_blank" className="text-primary underline">
            Política de Tratamiento de Datos
          </Link>{" "}
          (versión {policyVersion}).
        </span>
      </label>
      {error && (
        <p className="rounded-lg bg-bad-bg p-3 text-sm text-bad" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Creando…" : "Crear cuenta"}
      </button>
      <p className="text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="text-primary underline">
          Ingresa
        </Link>
      </p>
    </form>
  );
}
