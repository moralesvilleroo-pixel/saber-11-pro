import type { Metadata } from "next";
import Link from "next/link";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import { StudyMenu } from "@/components/StudyMenu";
import { demoBank } from "@/lib/study/demoBank";

export const metadata: Metadata = { title: "Demo" };

export default function DemoPage() {
  const total = demoBank().length;
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Prueba Saber11 Pro sin cuenta</h1>
        <p className="mt-2 leading-relaxed">
          La demo usa {total} preguntas originales de Lectura Crítica y Matemáticas. Tus respuestas se guardan solo en
          este navegador: no se envía nada a ningún servidor.
        </p>
      </section>
      <StudyMenu basePath="/demo/estudiar" />
      <section className="card text-sm">
        <p>
          ¿Quieres que tu progreso se guarde y te siga en el celular y el computador?{" "}
          <Link href="/registro" className="font-semibold text-primary underline">
            Crea una cuenta gratis
          </Link>
          .
        </p>
        <div className="mt-4">
          <ResetDemoButton />
        </div>
      </section>
    </div>
  );
}
