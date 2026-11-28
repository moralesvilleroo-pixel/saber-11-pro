import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "../env";

/** Cliente con service_role. Solo para la autorizacion parental; nunca llega al navegador. */
export function adminSupabase(): SupabaseClient {
  const env = publicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor");
  return createClient(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
