"use client";
import { type AreaEstimate, type FsrsCard, type Rating } from "@icfes/core";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountRepository } from "@/lib/study/accountRepository";
import { DemoRepository } from "@/lib/study/demoRepository";
import {
  estimateFromAttempts,
  fsrsFor,
  gradeAnswer,
  newId,
  planSession,
  reviewCard,
  snapshotFrom,
  type PlannedSession,
} from "@/lib/study/engine";
import type {
  AttemptRecord,
  OptionLabel,
  Progress,
  SessionRecord,
  StudyMode,
  StudyProfile,
  StudyQuestion,
  StudyRepository,
} from "@/lib/study/types";
import { browserSupabase } from "@/lib/supabase/client";
import { QuestionCard, SUBJECT_NAMES } from "./QuestionCard";
import { ScoreSummary } from "./ScoreSummary";

export type RepositorySource = { kind: "demo"; bank: StudyQuestion[] } | { kind: "account"; userId: string };

const MODE_INFO: Record<StudyMode, { title: string; intro: string }> = {
  diagnostic: {
    title: "Diagnóstico",
    intro:
      "Responde sin consultar. Después de cada pregunta verás por qué cada opción es correcta o incorrecta. Al final tendrás un puntaje estimado por prueba.",
  },
  fsrs_daily: {
    title: "Sesión diaria",
    intro:
      "Mezcla repasos que estás por olvidar, práctica de tus evidencias más débiles y refuerzo de errores recientes. Tras cada respuesta, ajusta qué tan fácil te pareció.",
  },
  mock_exam: {
    title: "Simulacro",
    intro:
      "Como en el examen: con cronómetro y sin ver respuestas hasta el final. Puedes dejar preguntas sin responder.",
  },
};

const RATINGS: { value: Rating; label: string; hint: string }[] = [
  { value: 1, label: "Otra vez", hint: "Fallé o no la sabía" },
  { value: 2, label: "Difícil", hint: "Acerté con mucho esfuerzo" },
  { value: 3, label: "Bien", hint: "Acerté con un esfuerzo normal" },
  { value: 4, label: "Fácil", hint: "La resolví de inmediato" },
];

type Phase =
  | { name: "loading" }
  | { name: "error"; message: string }
  | { name: "intro" }
  | { name: "running" }
  | { name: "finished"; estimate: AreaEstimate };

interface Answer {
  question: StudyQuestion;
  selected: OptionLabel | null;
  correct: boolean;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function SessionRunner({
  mode,
  source,
  profile,
  mockScale,
  homeHref,
}: {
  mode: StudyMode;
  source: RepositorySource;
  profile: StudyProfile;
  mockScale?: number;
  homeHref: string;
}) {
  const repo: StudyRepository = useMemo(
    () =>
      source.kind === "demo" ? new DemoRepository(source.bank) : new AccountRepository(browserSupabase(), source.userId),
    // La fuente no cambia durante la sesion.
    [],
  );

  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [plan, setPlan] = useState<PlannedSession | null>(null);
  const [bank, setBank] = useState<StudyQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<OptionLabel | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const progressRef = useRef<Progress | null>(null);
  const sessionRef = useRef<SessionRecord | null>(null);
  const shownAt = useRef(0);
  const deadline = useRef<number | null>(null);
  const finishing = useRef(false);
  const sessionAttempts = useRef<AttemptRecord[]>([]);
  const revealedAt = useRef<number | null>(null);
  const closing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loadedBank = await repo.loadBank();
        const progress = await repo.loadProgress();
        if (cancelled) return;
        progressRef.current = progress;
        setBank(loadedBank);
        setPlan(planSession(mode, loadedBank, progress, profile, Date.now(), mockScale ? { mockScale } : {}));
        setPhase({ name: "intro" });
      } catch (e) {
        if (!cancelled) setPhase({ name: "error", message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, mode, profile, mockScale]);

  const fsrs = useMemo(() => fsrsFor(profile, Date.now()), [profile]);
  const current = plan?.items[index] ?? null;

  const commit = useCallback(
    async (q: StudyQuestion, choice: OptionLabel | null, rating: Rating | null, elapsedMs: number) => {
      const session = sessionRef.current;
      const progress = progressRef.current;
      if (!session || !progress) return;
      const now = Date.now();
      const graded = gradeAnswer(q, choice, elapsedMs);
      const finalRating = rating ?? graded.suggested;
      const prev: FsrsCard | undefined = progress.cards[q.questionId];
      const res = reviewCard(fsrs, prev, finalRating, now);
      progress.cards[q.questionId] = res.card;
      const attempt: AttemptRecord = {
        id: newId(),
        sessionId: session.id,
        questionId: q.questionId,
        questionVersion: q.version,
        subject: q.subject,
        evidenceId: q.evidenceId,
        selected: choice,
        correct: graded.correct,
        rating: finalRating,
        responseTimeMs: elapsedMs,
        mode,
        answeredAt: now,
      };
      progress.attempts.push(attempt);
      sessionAttempts.current.push(attempt);
      setAnswers((a) => [...a, { question: q, selected: choice, correct: graded.correct }]);
      await repo.recordAnswer(session, attempt, res.card, {
        retrievability: prev ? res.retrievabilityBefore : null,
        elapsedDays: res.elapsedDays,
        scheduledDays: res.scheduledDays,
      });
    },
    [fsrs, mode, repo],
  );

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    const session = sessionRef.current;
    const progress = progressRef.current;
    if (!session || !progress) return;
    session.endedAt = Date.now();
    const estimate =
      mode === "fsrs_daily"
        ? estimateFromAttempts(progress.attempts, bank)
        : estimateFromAttempts(sessionAttempts.current, bank);
    const source = mode === "diagnostic" ? "diagnostic" : mode === "mock_exam" ? "mock_exam" : "rolling";
    const detail = Object.fromEntries(
      Object.entries(estimate.bySubject).flatMap(([s, e]) =>
        e ? [[s, { theta: Number(e.theta.toFixed(3)), se: Number.isFinite(e.standardError) ? Number(e.standardError.toFixed(3)) : null, n: e.responses }]] : [],
      ),
    );
    setPhase({ name: "finished", estimate });
    await repo.finishSession(session, snapshotFrom(estimate, source, session.endedAt), detail);
    const state = await repo.sync();
    if (repo.kind === "account") {
      setSyncNote(
        state.lastError
          ? `No se pudo guardar en tu cuenta (${state.lastError}). Quedó guardado en este dispositivo y se enviará cuando haya conexión.`
          : "Progreso guardado en tu cuenta.",
      );
    }
  }, [bank, mode, repo]);

  // Cronometro del simulacro
  useEffect(() => {
    if (phase.name !== "running" || deadline.current === null) return;
    const tick = () => {
      const left = ((deadline.current ?? 0) - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0) void closeMock();
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  });

  /** Cierra el simulacro: la pregunta actual con lo marcado y las restantes como omitidas. */
  async function closeMock() {
    if (!plan || closing.current) return;
    closing.current = true;
    for (let i = index; i < plan.items.length; i++) {
      const q = plan.items[i];
      if (q) await commit(q, i === index ? selected : null, null, i === index ? Date.now() - shownAt.current : 0);
    }
    await finish();
  }

  // Enviar lo pendiente al recuperar la conexion
  useEffect(() => {
    const onOnline = () => void repo.sync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [repo]);

  function start() {
    if (!plan) return;
    sessionRef.current = {
      id: newId(),
      mode,
      startedAt: Date.now(),
      endedAt: null,
      plannedItems: plan.items.length,
    };
    deadline.current = plan.timeLimitSeconds ? Date.now() + plan.timeLimitSeconds * 1000 : null;
    shownAt.current = Date.now();
    setPhase({ name: "running" });
  }

  async function next(rating: Rating | null) {
    if (!plan || !current) return;
    const elapsed = Date.now() - shownAt.current;
    if (mode === "mock_exam") await commit(current, selected, null, elapsed);
    else await commit(current, selected, rating, revealedAt.current ?? elapsed);
    revealedAt.current = null;
    if (index + 1 >= plan.items.length) {
      await finish();
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setRevealed(false);
    shownAt.current = Date.now();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSelect(label: OptionLabel) {
    if (revealed) return;
    setSelected(label);
    if (mode !== "mock_exam") {
      revealedAt.current = Date.now() - shownAt.current;
      setRevealed(true);
    }
  }

  if (phase.name === "loading") {
    return <p className="text-muted">Cargando preguntas…</p>;
  }
  if (phase.name === "error") {
    return (
      <div className="card">
        <p className="font-semibold">No se pudieron cargar las preguntas.</p>
        <p className="mt-1 text-sm text-muted">{phase.message}</p>
        <Link href={homeHref} className="btn-secondary mt-4">
          Volver
        </Link>
      </div>
    );
  }

  const info = MODE_INFO[mode];

  if (phase.name === "intro" && plan) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold">{info.title}</h1>
        <p className="mt-2 leading-relaxed">{info.intro}</p>
        <ul className="mt-4 space-y-1 text-sm text-muted" role="list">
          <li>{plan.items.length} preguntas</li>
          {plan.timeLimitSeconds !== null && <li>Tiempo: {formatClock(plan.timeLimitSeconds)}</li>}
          <li>
            Pruebas:{" "}
            {[...new Set(plan.items.map((q) => q.subject))].map((s) => SUBJECT_NAMES[s]).join(", ") || "ninguna"}
          </li>
        </ul>
        {plan.note && <p className="mt-4 rounded-lg bg-warn-bg p-3 text-sm text-warn">{plan.note}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={start} disabled={plan.items.length === 0}>
            Empezar
          </button>
          <Link href={homeHref} className="btn-secondary">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  if (phase.name === "finished") {
    const correct = answers.filter((a) => a.correct).length;
    const toReview = mode === "mock_exam" ? answers : answers.filter((a) => !a.correct);
    return (
      <div className="space-y-4">
        <div className="card">
          <h1 className="text-2xl font-bold">Terminaste: {info.title.toLowerCase()}</h1>
          <p className="mt-2">
            Acertaste <strong>{correct}</strong> de {answers.length}.
          </p>
          {syncNote && <p className="mt-2 text-sm text-muted">{syncNote}</p>}
        </div>
        <ScoreSummary
          estimate={phase.estimate}
          title={mode === "fsrs_daily" ? "Tu estimación con todo lo que has respondido" : "Estimación de esta sesión"}
        />
        {toReview.length > 0 && (
          <section className="space-y-3" aria-labelledby="repaso">
            <h2 id="repaso" className="text-lg font-semibold">
              {mode === "mock_exam" ? "Revisa tus respuestas" : "Vuelve sobre tus errores"}
            </h2>
            {toReview.map((a, i) => (
              <details key={a.question.questionId} className="card">
                <summary className="cursor-pointer font-medium">
                  {a.correct ? "✓" : "✗"} {a.question.stem}
                </summary>
                <div className="mt-3">
                  <QuestionCard
                    question={a.question}
                    index={i}
                    total={toReview.length}
                    selected={a.selected}
                    revealed
                    onSelect={() => undefined}
                  />
                </div>
              </details>
            ))}
          </section>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href={homeHref} className="btn-primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (!plan || !current) return null;
  const graded = revealed ? gradeAnswer(current, selected, revealedAt.current ?? 0) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold">{info.title}</span>
        {remaining !== null && (
          <span className={`font-mono text-base ${remaining < 300 ? "text-bad" : ""}`} aria-live="polite">
            ⏱ {formatClock(remaining)}
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-surface-2" aria-hidden="true">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${(index / plan.items.length) * 100}%` }}
        />
      </div>

      <QuestionCard
        question={current}
        index={index}
        total={plan.items.length}
        selected={selected}
        revealed={revealed}
        onSelect={onSelect}
      />

      {mode === "mock_exam" && (
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => void next(null)}>
            {selected ? "Siguiente" : "Omitir"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => void closeMock()}>
            Terminar simulacro
          </button>
        </div>
      )}

      {revealed && graded && (
        <div className="card" aria-live="polite">
          <p className={`text-lg font-semibold ${graded.correct ? "text-ok" : "text-bad"}`}>
            {graded.correct ? "¡Correcto!" : "Incorrecto"}
          </p>
          {mode === "fsrs_daily" ? (
            <>
              <p className="mt-1 text-sm text-muted">
                ¿Qué tan difícil te pareció? Esto decide cuándo vuelves a verla. Te sugerimos la marcada.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => void next(r.value)}
                    className={r.value === graded.suggested ? "btn-primary" : "btn-secondary"}
                    title={r.hint}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button type="button" className="btn-primary mt-3" onClick={() => void next(null)}>
              Siguiente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
