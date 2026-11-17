import { createHmac } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SiweMessage } from "siwe";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "viem";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function walletEmail(address: string) { return `wallet.${address.toLowerCase()}@wallet.trustchain.invalid`; }
function walletPassword(address: string, secret: string) {
  return `Tc!${createHmac("sha256", secret).update(address.toLowerCase()).digest("hex")}`;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const nonce = request.cookies.get("trustchain-siwe-nonce")?.value;
  if (!nonce) return NextResponse.json({ error: "Wallet sign-in expired. Please try again." }, { status: 401 });

  let body: { message?: string; signature?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (typeof body.message !== "string" || body.message.length > 4096 ||
      typeof body.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(body.signature)) {
    return NextResponse.json({ error: "Invalid SIWE message or signature." }, { status: 400 });
  }

  try {
    const siwe = new SiweMessage(body.message);
    const expectedDomain = request.headers.get("host");
    if (!expectedDomain || siwe.domain !== expectedDomain || siwe.uri !== request.nextUrl.origin ||
        siwe.chainId !== 8453 || siwe.version !== "1") {
      return NextResponse.json({ error: "Wallet message does not match this application or the Base network." }, { status: 401 });
    }
    const verification = await siwe.verify({
      signature: body.signature, domain: expectedDomain, nonce, time: new Date().toISOString()
    });
    if (!verification.success || !verification.data?.address) {
      return NextResponse.json({ error: "Wallet signature could not be verified." }, { status: 401 });
    }

    const address = getAddress(verification.data.address);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    const walletSecret = process.env.WALLET_AUTH_SECRET;
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !walletSecret || walletSecret.length < 32) {
      return NextResponse.json({ error: "Wallet authentication is not configured on the server." }, { status: 503 });
    }

    const email = walletEmail(address);
    const password = walletPassword(address, walletSecret);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Parameters<typeof cookieStore.set>[2];
        }>) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        }
      }
    });

    let { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      const { error: createError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { auth_method: "wallet", wallet_address: address, wallet_chain_id: 8453 }
      });
      if (createError && !createError.message.toLowerCase().includes("already")) {
        return NextResponse.json({ error: "Could not create the wallet account. Please try again." }, { status: 500 });
      }
      const retry = await supabase.auth.signInWithPassword({ email, password });
      signInError = retry.error;
    }
    if (signInError) return NextResponse.json({ error: "Could not establish a wallet session. Please try again." }, { status: 401 });

    const response = NextResponse.json({ ok: true, address });
    response.cookies.set("trustchain-siwe-nonce", "", {
      httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "strict",
      path: "/api/auth/siwe", maxAge: 0
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Wallet verification failed. Request a new sign-in message and try again." }, { status: 401 });
  }
}
