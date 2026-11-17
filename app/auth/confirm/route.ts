import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/reset-password";
  try {
    const target = new URL(value, "https://trustchain.invalid");
    return target.origin === "https://trustchain.invalid"
      ? target.pathname + target.search + target.hash
      : "/reset-password";
  } catch {
    return "/reset-password";
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery"
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
