/** Variables publicas. Next las incrusta en el cliente porque se leen con su nombre completo. */
export function publicEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function siteUrl(fallbackOrigin?: string): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? fallbackOrigin ?? "http://localhost:3000").replace(/\/+$/, "");
}
