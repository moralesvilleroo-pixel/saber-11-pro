import Link from "next/link";

const PRINCIPIOS = [
  {
    title: "Primero respondes, luego aprendes",
    text: "Cada pregunta explica por qué la respuesta correcta lo es y por qué cada distractor no.",
  },
  {
    title: "Repaso espaciado FSRS-6",
    text: "Vuelves a ver cada pregunta justo antes de olvidarla. Menos horas, más memoria.",
  },
  {
    title: "Práctica intercalada",
    text: "Las sesiones mezclan pruebas y competencias, priorizando lo que más sube tu Puntaje Global.",
  },
  {
    title: "Simulacros con cronómetro",
    text: "Entrena la resistencia de la doble sesión con el tiempo real por pregunta.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="pt-4">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Prepárate para el Saber 11 estudiando menos y recordando más</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          Diagnóstico, sesión diaria adaptativa y simulacros con preguntas 100 % originales construidas sobre las
          competencias y evidencias que evalúa el Icfes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/registro" className="btn-primary">
            Crear cuenta gratis
          </Link>
          <Link href="/demo" className="btn-secondary">
            Probar sin cuenta
          </Link>
          <Link href="/ingresar" className="btn-secondary">
            Ingresar
          </Link>
        </div>
      </section>
      <ul className="grid gap-3 sm:grid-cols-2" role="list">
        {PRINCIPIOS.map((p) => (
          <li key={p.title} className="card">
            <h2 className="font-semibold">{p.title}</h2>
            <p className="mt-1 text-sm text-muted">{p.text}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Si eres menor de edad, tu acudiente debe autorizar el uso de tus datos antes de que guardemos tu progreso (Ley
        1581 de 2012). Mientras tanto puedes usar la demo.
      </p>
    </div>
  );
}
