"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";

function nextPath(v: string): string {
  return v.startsWith("/") && !v.startsWith("//") ? v : "/inicio";
}

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    linkError ? "El enlace no es válido o ya venció. Ingresa o pide uno nuevo." : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await browserSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setMessage(
        /confirm/i.test(error.message)
          ? "Primero confirma tu correo: te enviamos un enlace al registrarte."
          : "Correo o contraseña incorrectos.",
      );
      return;
    }
    router.replace(nextPath(next));
    router.refresh();
  }

  async function onForgot() {
    if (!email.trim()) {
      setMessage("Escribe tu correo y vuelve a tocar «Olvidé mi contraseña».");
      return;
    }
    setBusy(true);
    await browserSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/cuenta/nueva-clave`,
    });
    setBusy(false);
    setMessage("Si el correo tiene una cuenta, te llegará un enlace para crear una nueva contraseña.");
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Ingresar</h1>
      <label className="label">
        Correo
        <input
          className="field"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="label">
        Contraseña
        <input
          className="field"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {message && (
        <p className="rounded-lg bg-surface-2 p-3 text-sm" role="status">
          {message}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Un momento…" : "Ingresar"}
      </button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" className="text-primary underline" onClick={onForgot} disabled={busy}>
          Olvidé mi contraseña
        </button>
        <Link href="/registro" className="text-primary underline">
          Crear cuenta
        </Link>
      </div>
    </form>
  );
}
