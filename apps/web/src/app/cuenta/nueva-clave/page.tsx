"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";

export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Mínimo 8 caracteres.");
    setBusy(true);
    const { error: err } = await browserSupabase().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError("No se pudo cambiar. Pide un enlace nuevo desde «Ingresar».");
    router.replace("/inicio");
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Nueva contraseña</h1>
      <label className="label">
        Contraseña nueva
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
      {error && <p className="text-sm text-bad">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        Guardar
      </button>
    </form>
  );
}
