"use client";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";

interface Settings {
  targetExamDate: string | null;
  targetGlobalScore: number | null;
  dailyStudyMinutes: number;
}

export function SettingsForm({ userId, initial }: { userId: string; initial: Settings }) {
  const [date, setDate] = useState(initial.targetExamDate ?? "");
  const [target, setTarget] = useState(initial.targetGlobalScore?.toString() ?? "");
  const [minutes, setMinutes] = useState(initial.dailyStudyMinutes.toString());
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await browserSupabase()
      .from("profiles")
      .update({
        target_exam_date: date || null,
        target_global_score: target ? Math.min(500, Math.max(0, Number(target))) : null,
        daily_study_minutes: Math.min(600, Math.max(5, Number(minutes) || 30)),
      })
      .eq("id", userId);
    setStatus(error ? "No se pudo guardar." : "Guardado. La próxima sesión usa estos datos.");
  }

  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">Mi meta y mi tiempo de estudio</summary>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="label">
          Fecha del examen
          <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="label">
          Puntaje Global meta (0-500)
          <input className="field" type="number" min={0} max={500} value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label className="label">
          Minutos al día
          <input className="field" type="number" min={5} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary">
            Guardar
          </button>
          {status && <span className="text-sm text-muted" role="status">{status}</span>}
        </div>
        <p className="sm:col-span-3 text-xs text-muted">
          Con la fecha del examen ajustamos el repaso: a menos de 90 días buscamos recordar más (retención de 0,88 a 0,94).
        </p>
      </form>
    </details>
  );
}
