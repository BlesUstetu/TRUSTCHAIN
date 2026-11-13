"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (authError) throw authError;
        const next = searchParams.get("next");
        const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
        router.replace(safeNext);
        router.refresh();
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`
          }
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setNotice("Account created. Check your email to confirm your address before signing in.");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand">
          <span className="brand-mark">T</span>
          <span>TRUSTCHAIN</span>
        </Link>
        <div className="eyebrow">TRUSTCHAIN BY BLESPRODUCTION</div>
        <h1 className="auth-title">{mode === "login" ? "Welcome back" : "Create your workspace account"}</h1>
        <p className="muted text-sm">
          {mode === "login"
            ? "Sign in to access your project intelligence workspace."
            : "Start organizing project evidence and on-chain transparency."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button className="button auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "New to Trustchain?" : "Already have an account?"}{" "}
          <Link href={mode === "login" ? "/signup" : "/login"}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </Link>
        </p>
        <p className="auth-disclaimer">
          Trustchain presents evidence and verification status. It does not guarantee project or asset safety.
        </p>
      </section>
    </main>
  );
}
