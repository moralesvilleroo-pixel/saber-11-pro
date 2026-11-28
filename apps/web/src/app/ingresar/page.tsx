import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const next = typeof p.siguiente === "string" ? p.siguiente : "/inicio";
  const linkError = p.error === "enlace";
  return <LoginForm next={next} linkError={linkError} />;
}
