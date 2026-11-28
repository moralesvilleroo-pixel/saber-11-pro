"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "../env";

let client: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient {
  const env = publicEnv();
  if (!env) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY");
  client ??= createBrowserClient(env.url, env.anonKey);
  return client;
}
