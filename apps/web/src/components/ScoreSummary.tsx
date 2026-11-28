"use client";
import { calculateMarginalImpact, scoresForPlanner, type AreaEstimate, type SubjectCode } from "@icfes/core";
import { SUBJECT_NAMES } from "./QuestionCard";

const ORDER: SubjectCode[] = ["LC", "MA", "SC", "CN", "IN"];

export function ScoreSummary({ estimate, title }: { estimate: AreaEstimate; title: string }) {
  const measured = ORDER.filter((s) => estimate.bySubject[s] !== null);
  const impact = calculateMarginalImpact(scoresForPlanner(estimate)).filter((i) => measured.includes(i.subject));

  return (
    <section className="card" aria-labelledby="resumen-puntaje">
      <h2 id="resumen-puntaje" className="text-lg font-semibold">
        {title}
      </h2>

      {estimate.globalScore !== null ? (
        <p className="mt-2">
          Puntaje Global proyectado: <strong className="text-2xl">{estimate.globalScore}</strong> de 500
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          El Puntaje Global proyectado aparece cuando haya datos de las cinco pruebas. Faltan:{" "}
          {estimate.missing.map((s) => SUBJECT_NAMES[s]).join(", ")}.
        </p>
      )}

      {measured.length === 0 ? (
        <p className="mt-3 text-muted">Todavía no hay respuestas suficientes para estimar puntajes.</p>
      ) : (
        <ul className="mt-4 space-y-3" role="list">
          {measured.map((s) => {
            const e = estimate.bySubject[s];
            if (!e) return null;
            return (
              <li key={s}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{SUBJECT_NAMES[s]}</span>
                  <span>
                    <strong>{e.score}</strong>
                    <span className="text-muted"> / 100</span>
                  </span>
                </div>
                <div
                  className="mt-1 h-2 rounded-full bg-surface-2"
                  role="img"
                  aria-label={`${SUBJECT_NAMES[s]}: ${e.score} de 100`}
                >
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${e.score}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {e.responses} {e.responses === 1 ? "respuesta" : "respuestas"}
                  {e.preliminary ? " · estimación preliminar: hacen falta más preguntas" : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {impact.length > 0 && (
        <div className="mt-5 rounded-lg bg-surface-2 p-3 text-sm">
          <p className="font-medium">Dónde rinde más tu estudio</p>
          <ul className="mt-1 space-y-1" role="list">
            {impact.slice(0, 3).map((i) => (
              <li key={i.subject}>
                Subir 10 puntos en {SUBJECT_NAMES[i.subject]} suma unos{" "}
                <strong>{i.plus10.toLocaleString("es-CO", { maximumFractionDigits: 1 })}</strong> puntos al Puntaje Global.
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
