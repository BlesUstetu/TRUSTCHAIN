import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

type SiweRateLimit = {
  allowed: boolean;
  error?: string;
};

function getClientAddress(request: NextRequest) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }

  return "unknown";
}

export async function enforceSiweRateLimit(
  request: NextRequest,
  bucket: "nonce" | "verify",
  limit: number,
  windowSeconds: number
): Promise<SiweRateLimit> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { allowed: false, error: "Wallet authentication is not configured." };
  }

  const address = getClientAddress(request);
  const keyHash = createHmac("sha256", serviceKey)
    .update(`trustchain:siwe:${bucket}:${address}`)
    .digest("hex");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await admin.rpc("consume_siwe_rate_limit", {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });

  if (error || typeof data !== "boolean") {
    return { allowed: false, error: "Could not validate wallet sign-in rate limit." };
  }

  return { allowed: data };
}
