import Link from "next/link";

export default function SetupPending() {
  return (
    <div className="card">
      <h1 className="text-xl font-bold">Las cuentas aún no están activas</h1>
      <p className="mt-2 leading-relaxed">
        Esta instalación todavía no está conectada a la base de datos. Mientras tanto puedes usar la demo, que guarda
        tu progreso en este navegador.
      </p>
      <Link href="/demo" className="btn-primary mt-4">
        Ir a la demo
      </Link>
    </div>
  );
}
