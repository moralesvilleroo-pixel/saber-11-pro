import type { Metadata } from "next";
import { ArcoForm } from "./ArcoForm";

export const metadata: Metadata = { title: "Consultas y reclamos" };

export default function ArcoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Consultas y reclamos sobre tus datos</h1>
      <p className="leading-relaxed">
        Aquí puedes consultar qué datos tenemos, pedir que se corrijan o se borren, o revocar una autorización. Las
        consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles.
      </p>
      <ArcoForm />
    </div>
  );
}
