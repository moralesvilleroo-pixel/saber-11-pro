import Link from "next/link";

const ITEMS = [
  {
    slug: "diaria",
    title: "Sesión diaria",
    text: "Repasos que estás por olvidar, práctica intercalada de tus puntos débiles y refuerzo de errores.",
  },
  {
    slug: "diagnostico",
    title: "Diagnóstico",
    text: "Preguntas de todas las pruebas con banco disponible para estimar tu punto de partida.",
  },
  {
    slug: "simulacro",
    title: "Simulacro",
    text: "Con cronómetro y sin retroalimentación hasta el final, como el día del examen.",
  },
] as const;

export function StudyMenu({ basePath }: { basePath: string }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3" role="list">
      {ITEMS.map((i) => (
        <li key={i.slug}>
          <Link
            href={`${basePath}?modo=${i.slug}`}
            className="card block h-full transition-colors hover:border-primary"
          >
            <span className="block font-semibold text-primary">{i.title}</span>
            <span className="mt-1 block text-sm text-muted">{i.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
