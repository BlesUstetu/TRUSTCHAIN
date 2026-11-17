import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrganizationOnboardingForm } from "@/components/organization/organization-onboarding-form";

export const metadata = {
  title: "Create organization · Trustchain"
};

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login?next=/onboarding");

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1 className="auth-title">Workspace setup unavailable</h1>
          <p className="muted text-sm">We could not check your organization membership. Please refresh or try again later.</p>
        </section>
      </main>
    );
  }

  if (memberships?.length) redirect("/");

  return <OrganizationOnboardingForm email={user.email ?? "Wallet account"} />;
}
