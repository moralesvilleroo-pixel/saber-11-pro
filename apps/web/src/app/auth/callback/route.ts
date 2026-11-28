import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { serverSupabase } from "@/lib/supabase/server";

/** Enlaces de correo con ?code= (flujo PKCE, mismo navegador). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const supabase = await serverSupabase();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/ingresar?error=enlace", url.origin));
}
