"use client";
import { useState } from "react";

export function GuardianApproval({ token, studentName }: { token: string; studentName: string }) {
  const [checked, setChecked] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "verified" | "declined" | "error">("idle");

  async function approve() {
    setState("busy");
    const res = await fetch("/api/consentimiento/verificar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, acepta: true }),
    });
    const body = (await res.json().catch(() => ({}))) as { state?: string };
    setState(body.state === "verified" || body.state === "used" ? "verified" : "error");
  }

  if (state === "verified") {
    return (
      <p className="rounded-lg bg-ok-bg p-3 text-ok" role="status">
        Gracias. La autorización quedó registrada con fecha y hora. {studentName} ya puede guardar su progreso.
      </p>
    );
  }
  if (state === "declined") {
    return (
      <p className="rounded-lg bg-surface-2 p-3" role="status">
        Entendido. Sin tu autorización no guardamos datos de estudio de {studentName}. Puedes cerrar esta página.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>
          Soy la madre, el padre o el representante legal de {studentName} y autorizo el tratamiento de sus datos en los
          términos descritos.
        </span>
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={!checked || state === "busy"} onClick={approve}>
          {state === "busy" ? "Registrando…" : "Autorizo"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setState("declined")}>
          No autorizo
        </button>
      </div>
      {state === "error" && (
        <p className="text-sm text-bad" role="alert">
          No se pudo registrar. El enlace pudo vencer; pide al estudiante una solicitud nueva.
        </p>
      )}
    </div>
  );
}
