import { NextResponse, type NextRequest } from "next/server";
import { generateNonce } from "siwe";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const nonce = generateNonce();
  const response = NextResponse.json({ nonce }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("trustchain-siwe-nonce", nonce, {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "strict",
    path: "/api/auth/siwe", maxAge: 300
  });
  return response;
}
