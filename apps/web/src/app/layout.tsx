import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Saber11 Pro", template: "%s · Saber11 Pro" },
  description:
    "Prepárate para el Saber 11 con práctica de recuperación, repaso espaciado y simulacros. Preguntas 100 % originales.",
  applicationName: "Saber11 Pro",
  appleWebApp: { capable: true, title: "Saber11 Pro", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f4fa8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f131c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body className="min-h-dvh">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
          Saltar al contenido
        </a>
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-primary">
              Saber11 Pro
            </Link>
            <div className="flex items-center gap-4 text-sm font-medium">
              <Link href="/demo" className="hover:underline">
                Demo
              </Link>
              <Link href="/inicio" className="hover:underline">
                Mi cuenta
              </Link>
            </div>
          </nav>
        </header>
        <main id="contenido" className="mx-auto max-w-3xl px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto max-w-3xl px-4 pb-8 pt-4 text-sm text-muted">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/privacidad" className="hover:underline">
              Política de Tratamiento de Datos
            </Link>
            <Link href="/arco" className="hover:underline">
              Consultas y reclamos (ARCO)
            </Link>
          </div>
          <p className="mt-2">
            Proyecto educativo sin ánimo de lucro. Las preguntas son originales y no provienen de cuadernillos del Icfes.
            No está afiliado al Icfes.
          </p>
        </footer>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
