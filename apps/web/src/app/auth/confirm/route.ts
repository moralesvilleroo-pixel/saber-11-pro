import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { serverSupabase } from "@/lib/supabase/server";

const TYPES = new Set<EmailOtpType>(["signup", "email", "recovery", "invite", "magiclink", "email_change"]);

/** Enlaces de correo con ?token_hash= (plantillas en espanol; funcionan desde otro dispositivo). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/cuenta/nueva-clave" : "/inicio";
  const next = safeNext(url.searchParams.get("next"), fallback);
  const supabase = await serverSupabase();
  if (tokenHash && type && TYPES.has(type) && supabase) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/ingresar?error=enlace", url.origin));
}
