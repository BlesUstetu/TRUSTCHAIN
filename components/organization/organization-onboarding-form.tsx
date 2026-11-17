"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function OrganizationOnboardingForm({ email }: { email: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const suggestedSlug = useMemo(() => makeSlug(name), [name]);

  function updateName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(makeSlug(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Your session has expired. Please sign in again.");

      const { data, error: createError } = await supabase.rpc("create_initial_organization", {
        p_name: name.trim(),
        p_slug: slug.trim().toLowerCase()
      });
      if (createError) throw createError;
      if (!data) throw new Error("The organization could not be created. Please try again.");

      router.replace("/");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to create your organization.";
      setError(message.includes("duplicate key") || message.includes("organizations_slug_key")
        ? "That workspace URL is already in use. Choose another one."
        : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page onboarding-page">
      <section className="auth-card onboarding-card">
        <Link href="/" className="auth-brand">
          <span className="brand-mark">T</span>
          <span>TRUSTCHAIN</span>
        </Link>
        <div className="eyebrow">FIRST-TIME SETUP · WORKSPACE</div>
        <h1 className="auth-title">Create your organization</h1>
        <p className="muted text-sm">
          Your organization is the secure workspace for projects, contracts, evidence, and team access.
        </p>

        <div className="onboarding-account">
          <span className="onboarding-account-label">SIGNED IN AS</span>
          <span className="onboarding-account-email">{email}</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="organization-name">Organization name</label>
          <input
            id="organization-name"
            value={name}
            onChange={(event) => updateName(event.target.value)}
            minLength={2}
            maxLength={80}
            required
            placeholder="e.g. BlesProduction"
            autoComplete="organization"
          />

          <label htmlFor="organization-slug">Workspace slug</label>
          <div className="onboarding-slug-row">
            <span aria-hidden="true">trustchain /</span>
            <input
              id="organization-slug"
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(makeSlug(event.target.value));
              }}
              minLength={2}
              maxLength={40}
              pattern="[a-z0-9]+([a-z0-9-]{0,38}[a-z0-9])?"
              required
              placeholder={suggestedSlug || "your-workspace"}
              autoCapitalize="none"
              autoComplete="off"
            />
          </div>
          <p className="onboarding-hint">2–40 characters · lowercase letters, numbers, and hyphens.</p>

          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button auth-submit" type="submit" disabled={busy || name.trim().length < 2 || slug.length < 2}>
            {busy ? "Creating workspace…" : "Create organization"}
          </button>
        </form>

        <div className="onboarding-steps">
          <div><span>01</span><strong>Organization</strong><small>Create your secure workspace</small></div>
          <div><span>02</span><strong>Projects</strong><small>Register your first Web3 project</small></div>
          <div><span>03</span><strong>Evidence</strong><small>Start collecting verifiable facts</small></div>
        </div>
        <p className="auth-disclaimer">You will become the organization Owner. You can invite teammates after workspace setup is complete.</p>
      </section>
    </main>
  );
}
