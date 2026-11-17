import { createHash } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SiweMessage } from "siwe";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "viem";
import { enforceSiweRateLimit } from "@/lib/auth/siwe-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function walletEmail(address: string) {
  return `wallet.${address.toLowerCase()}@wallet.trustchain.invalid`;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const rateLimit = await enforceSiweRateLimit(request, "verify", 8, 600);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.error ?? "Too many wallet verification attempts. Please wait and try again." },
      { status: rateLimit.error ? 503 : 429 },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 8192) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  const nonce = request.cookies.get("trustchain-siwe-nonce")?.value;
  if (!nonce) {
    return NextResponse.json({ error: "Wallet sign-in expired. Please try again." }, { status: 401 });
  }

  let body: { message?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.message !== "string" || body.message.length > 4096 ||
      typeof body.signature !== "string" || body.signature.length > 2048 || !/^0x[0-9a-fA-F]+$/.test(body.signature)) {
    return NextResponse.json({ error: "Invalid SIWE message or signature." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !publishableKey || !serviceKey) {
    return NextResponse.json({ error: "Wallet authentication is not configured on the server." }, { status: 503 });
  }

  try {
    const siwe = new SiweMessage(body.message);
    const expectedDomain = request.headers.get("host");
    if (!expectedDomain || siwe.domain !== expectedDomain ||
        siwe.uri !== request.nextUrl.origin || siwe.chainId !== 8453 ||
        siwe.version !== "1" || siwe.nonce !== nonce) {
      return NextResponse.json({ error: "Wallet message does not match this application or the Base network." }, { status: 401 });
    }

    const verification = await siwe.verify({
      signature: body.signature,
      domain: expectedDomain,
      nonce,
      time: new Date().toISOString()
    });
    if (!verification.success || !verification.data?.address) {
      return NextResponse.json({ error: "Wallet signature could not be verified." }, { status: 401 });
    }

    const address = getAddress(verification.data.address);
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Atomically consume the server-stored nonce. A concurrent/replayed request can update zero rows.
    const nonceHash = createHash("sha256").update(nonce).digest("hex");
    const { data: consumed, error: consumeError } = await admin
      .from("siwe_nonces")
      .update({ consumed_at: new Date().toISOString() })
      .eq("nonce_hash", nonceHash)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("nonce_hash")
      .maybeSingle();

    if (consumeError || !consumed) {
      return NextResponse.json({ error: "Wallet sign-in expired or has already been used. Request a new message." }, { status: 401 });
    }

    const email = walletEmail(address);
    let link = await admin.auth.admin.generateLink({ type: "magiclink", email });

    // Provision only when Auth explicitly reports that this synthetic wallet identity is absent.
    if (link.error?.code === "user_not_found") {
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          auth_method: "wallet",
          wallet_address: address,
          wallet_chain_id: 8453
        }
      });

      if (createError && createError.code !== "email_exists" &&
          createError.code !== "user_already_exists") {
        return NextResponse.json({ error: "Could not provision the wallet account. Please try again." }, { status: 500 });
      }
      link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    }

    if (link.error || !link.data?.properties?.hashed_token) {
      return NextResponse.json({ error: "Could not create a secure wallet session. Please try again." }, { status: 503 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, publishableKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Parameters<typeof cookieStore.set>[2];
        }>) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        }
      }
    });

    const { error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: link.data.properties.hashed_token,
      type: "magiclink"
    });
    if (sessionError) {
      return NextResponse.json({ error: "Could not establish a wallet session. Please try again." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, address }, {
      headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" }
    });
    response.cookies.set("trustchain-siwe-nonce", "", {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "strict",
      path: "/api/auth/siwe",
      maxAge: 0
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Wallet verification failed. Request a new sign-in message and try again." }, { status: 401 });
  }
}
