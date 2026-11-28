"use client";
import type { OptionLabel, StudyQuestion } from "@/lib/study/types";

export const SUBJECT_NAMES: Record<string, string> = {
  LC: "Lectura Crítica",
  MA: "Matemáticas",
  SC: "Sociales y Ciudadanas",
  CN: "Ciencias Naturales",
  IN: "Inglés",
};

function svgTitle(svg: string): string {
  return /<title>([^<]*)<\/title>/i.exec(svg)?.[1] ?? "Gráfica de la pregunta";
}

/**
 * La gráfica se muestra como imagen (data URI): el navegador no ejecuta scripts dentro de un
 * SVG cargado con <img>, así que aunque el banco se validó, aquí no puede correr nada.
 */
function SvgFigure({ svg }: { svg: string }) {
  return (
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      alt={svgTitle(svg)}
      className="mx-auto mt-3 h-auto w-full max-w-md rounded-lg bg-white p-2"
    />
  );
}

interface Props {
  question: StudyQuestion;
  index: number;
  total: number;
  selected: OptionLabel | null;
  /** true cuando ya respondió y se muestra la retroalimentación de las cuatro opciones. */
  revealed: boolean;
  onSelect: (label: OptionLabel) => void;
}

export function QuestionCard({ question: q, index, total, selected, revealed, onSelect }: Props) {
  // Los textos de Inglés van en inglés; la retroalimentación sigue en español.
  const lang = q.subject === "IN" ? "en" : undefined;
  return (
    <article className="card" aria-labelledby={`stem-${q.questionId}`}>
      <p className="text-sm font-medium text-muted">
        Pregunta {index + 1} de {total} · {SUBJECT_NAMES[q.subject] ?? q.subject}
      </p>

      {(q.context.title || q.context.text || q.context.table || q.context.svg) && (
        <section lang={lang} className="mt-3 rounded-lg bg-surface-2 p-4">
          {q.context.title && <h2 className="font-semibold">{q.context.title}</h2>}
          {q.context.text && (
            <div className="prose-text mt-2 leading-relaxed">
              {q.context.text.split(/\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          {q.context.table && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="mb-2 text-left text-muted">{q.context.table.caption}</caption>
                <thead>
                  <tr>
                    {q.context.table.headers.map((h) => (
                      <th key={h} scope="col" className="border border-border bg-surface px-2 py-1 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {q.context.table.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="border border-border bg-surface px-2 py-1">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {q.context.svg && <SvgFigure svg={q.context.svg} />}
        </section>
      )}

      <h3 id={`stem-${q.questionId}`} lang={lang} className="mt-4 text-lg font-semibold leading-snug">
        {q.stem}
      </h3>

      <ul className="mt-4 space-y-3" role="list">
        {q.options.map((o) => {
          const isSelected = selected === o.label;
          let tone = "border-border bg-surface hover:bg-surface-2";
          if (!revealed && isSelected) tone = "border-primary bg-surface-2 ring-2 ring-primary/40";
          if (revealed && o.isCorrect) tone = "border-ok bg-ok-bg";
          if (revealed && isSelected && !o.isCorrect) tone = "border-bad bg-bad-bg";
          return (
            <li key={o.label}>
              <button
                type="button"
                onClick={() => onSelect(o.label)}
                disabled={revealed}
                aria-pressed={isSelected}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-default ${tone}`}
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-semibold">
                  {o.label}
                </span>
                <span lang={lang} className="leading-relaxed">{o.text}</span>
              </button>
              {revealed && (
                <p
                  className={`mt-1 rounded-md px-3 py-2 text-sm leading-relaxed ${
                    o.isCorrect ? "text-ok" : isSelected ? "text-bad" : "text-muted"
                  }`}
                >
                  {o.feedback}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
