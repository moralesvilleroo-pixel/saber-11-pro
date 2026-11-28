/** Version vigente de la Politica de Tratamiento de Datos. Cambiarla obliga a pedir aceptacion de nuevo. */
export const PRIVACY_POLICY_VERSION = "2026-11-28";

export function responsable(): { nombre: string; correo: string } {
  return {
    nombre: process.env.NEXT_PUBLIC_RESPONSABLE_NOMBRE || "Saber11 Pro",
    correo: process.env.NEXT_PUBLIC_RESPONSABLE_CORREO || "",
  };
}

/** Regla conservadora de la base de datos: menor si cumple 18 o menos este ano (hora de Bogota). */
export function isMinorByBirthYear(birthYear: number | null, now = new Date()): boolean {
  if (birthYear === null || !Number.isFinite(birthYear)) return true;
  const year = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", year: "numeric" }).format(now),
  );
  return year - birthYear <= 18;
}
