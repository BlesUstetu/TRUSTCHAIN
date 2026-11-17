import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { generateNonce } from "siwe";
import { enforceSiweRateLimit } from "@/lib/auth/siwe-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const rateLimit = await enforceSiweRateLimit(request, "nonce", 10, 600);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.error ?? "Too many wallet sign-in attempts. Please wait and try again." },
      { status: rateLimit.error ? 503 : 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Wallet authentication is not configured." }, { status: 503 });
  }

  const nonce = generateNonce();
  const nonceHash = createHash("sha256").update(nonce).digest("hex");
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await admin.from("siwe_nonces").insert({
    nonce_hash: nonceHash,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  });
  if (error) {
    return NextResponse.json({ error: "Could not start wallet authentication. Please try again." }, { status: 503 });
  }

  // Expired and consumed nonce records are no longer needed after the retention window.
  await admin.from("siwe_nonces")
    .delete()
    .lt("expires_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const response = NextResponse.json({ nonce }, {
    headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" }
  });
  response.cookies.set("trustchain-siwe-nonce", nonce, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/api/auth/siwe",
    maxAge: 300
  });
  return response;
}
