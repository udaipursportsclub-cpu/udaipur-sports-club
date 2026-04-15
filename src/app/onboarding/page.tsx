/**
 * FILE: src/app/onboarding/page.tsx
 *
 * First-time onboarding — every new user must complete this before
 * they can use the platform. Checks if already done, if so redirects
 * to dashboard. Otherwise shows the step-by-step wizard.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingWizard from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();

  // Must be logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if onboarding is already done
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_done, avatar_url, phone, face_scan_done")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_done === true) {
    redirect("/dashboard");
  }

  const userName = user.user_metadata?.full_name ?? "Athlete";

  return (
    <main
      className="min-h-screen bg-[#030712]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <OnboardingWizard
        userId={user.id}
        userName={userName}
        existingAvatar={profile?.avatar_url ?? null}
        existingPhone={profile?.phone ?? null}
        existingFaceScan={profile?.face_scan_done ?? false}
      />
    </main>
  );
}
