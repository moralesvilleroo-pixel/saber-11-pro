import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_POLICY_VERSION, responsable } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de Tratamiento de Datos" };

export default function PrivacyPage() {
  const who = responsable();
  return (
    <article className="card space-y-4 leading-relaxed">
      <h1 className="text-2xl font-bold">Política de Tratamiento de Datos Personales</h1>
      <p className="text-sm text-muted">
        Versión {PRIVACY_POLICY_VERSION}. Ley 1581 de 2012, Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015).
      </p>

      <section>
        <h2 className="font-semibold">1. Responsable</h2>
        <p>
          {who.nombre}
          {who.correo ? `, correo de contacto ${who.correo}` : ""}. Canal de atención: el formulario de{" "}
          <Link href="/arco" className="text-primary underline">
            Consultas y reclamos
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="font-semibold">2. Datos que tratamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Cuenta: correo, nombre o apodo, año de nacimiento, calendario del colegio y, si eres menor, el correo de tu acudiente.</li>
          <li>Estudio: respuestas, tiempo de respuesta, calificación de dificultad, estado de repaso y puntajes estimados.</li>
          <li>Autorización del acudiente: fecha, hora, dirección IP y navegador desde el que se autorizó.</li>
        </ul>
        <p className="mt-2">No pedimos datos sensibles ni datos de pago.</p>
      </section>

      <section>
        <h2 className="font-semibold">3. Finalidades</h2>
        <p>
          Prestar el servicio de preparación para el Saber 11: programar repasos, armar sesiones, estimar puntajes y
          mostrarte tu avance; enviarte correos de la cuenta; y mejorar la calidad de las preguntas con estadísticas
          agregadas. No vendemos ni cedemos datos, no mostramos publicidad y no hacemos perfiles comerciales.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">4. Niñas, niños y adolescentes</h2>
        <p>
          Respetamos el interés superior del menor (artículo 7 de la Ley 1581). Si tienes 18 años o menos este año, no
          guardamos datos de estudio hasta que tu madre, padre o representante legal autorice mediante el enlace que le
          enviamos por correo. Mientras tanto solo se guarda lo necesario para la cuenta.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">5. Tus derechos</h2>
        <p>
          Conocer, actualizar y rectificar tus datos; pedir prueba de la autorización; ser informado del uso; presentar
          quejas ante la Superintendencia de Industria y Comercio; revocar la autorización y pedir la supresión cuando no
          haya un deber legal de conservarlos; y acceder gratis a tus datos.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">6. Cómo ejercerlos</h2>
        <p>
          Usa el formulario de{" "}
          <Link href="/arco" className="text-primary underline">
            Consultas y reclamos
          </Link>
          . Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles (artículos 14 y 15
          de la Ley 1581). Si necesitamos más tiempo te avisamos antes del vencimiento.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">7. Seguridad, almacenamiento y transferencias</h2>
        <p>
          Los datos se guardan en Supabase (base de datos con acceso restringido por usuario) y la web se publica en
          Vercel; ambos proveedores pueden alojar datos fuera de Colombia, en países con medidas de seguridad adecuadas.
          Las contraseñas no se guardan en texto plano. Parte de tu progreso queda en tu dispositivo para estudiar sin
          conexión.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">8. Vigencia</h2>
        <p>
          Esta política rige desde el {PRIVACY_POLICY_VERSION}. Conservamos los datos mientras tengas una cuenta activa o
          hasta que pidas su supresión. Si la política cambia de forma sustancial, te pediremos aceptarla de nuevo.
        </p>
      </section>
    </article>
  );
}
