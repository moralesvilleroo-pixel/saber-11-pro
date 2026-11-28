"use client";
import type { AreaEstimate } from "@icfes/core";
import { useEffect, useState } from "react";
import { AccountRepository } from "@/lib/study/accountRepository";
import { estimateFromAttempts } from "@/lib/study/engine";
import { browserSupabase } from "@/lib/supabase/client";
import { ScoreSummary } from "./ScoreSummary";

interface Stats {
  due: number;
  answered: number;
  bank: number;
  estimate: AreaEstimate;
  pending: number;
}

export function ProgressPanel({ userId }: { userId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const repo = new AccountRepository(browserSupabase(), userId);
        const sync = await repo.sync();
        const bank = await repo.loadBank();
        const progress = await repo.loadProgress();
        const now = Date.now();
        if (cancelled) return;
        setStats({
          due: Object.values(progress.cards).filter((c) => c.dueAt <= now).length,
          answered: new Set(progress.attempts.map((a) => a.questionId)).size,
          bank: bank.length,
          estimate: estimateFromAttempts(progress.attempts, bank),
          pending: sync.pending,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (error) return <p className="text-sm text-bad">No se pudo cargar tu progreso: {error}</p>;
  if (!stats) return <p className="text-sm text-muted">Cargando tu progreso…</p>;
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-3 gap-3 text-center" role="list">
        <li className="card">
          <span className="block text-2xl font-bold">{stats.due}</span>
          <span className="text-xs text-muted">repasos para hoy</span>
        </li>
        <li className="card">
          <span className="block text-2xl font-bold">{stats.answered}</span>
          <span className="text-xs text-muted">preguntas vistas</span>
        </li>
        <li className="card">
          <span className="block text-2xl font-bold">{stats.bank}</span>
          <span className="text-xs text-muted">en el banco</span>
        </li>
      </ul>
      {stats.pending > 0 && (
        <p className="text-sm text-warn">
          Hay {stats.pending} respuestas guardadas en este dispositivo que se enviarán cuando haya conexión.
        </p>
      )}
      <ScoreSummary estimate={stats.estimate} title="Tu estimación actual" />
    </div>
  );
}
