import { NextResponse, type NextRequest } from "next/server";
import { hashConsentToken, isWellFormedToken } from "@/lib/consentToken";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function clientIp(request: NextRequest): string | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
  return ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}

/** El acudiente autoriza desde el enlace del correo. No requiere cuenta. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; acepta?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!isWellFormedToken(token) || body?.acepta !== true) {
    return NextResponse.json({ state: "not_found" }, { status: 400 });
  }
  const { data, error } = await adminSupabase().rpc("verify_parental_consent", {
    p_token_hash: hashConsentToken(token),
    p_ip: clientIp(request),
    p_user_agent: request.headers.get("user-agent") ?? "",
  });
  if (error) return NextResponse.json({ state: "error" }, { status: 500 });
  return NextResponse.json({ state: data as string });
}
