import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Token de 256 bits para el enlace del acudiente. En la base solo se guarda su SHA-256. */
export function newConsentToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashConsentToken(token) };
}

export function hashConsentToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
