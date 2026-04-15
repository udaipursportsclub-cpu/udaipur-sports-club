/**
 * FILE: src/app/api/onboarding/complete/route.ts
 *
 * POST — marks onboarding as done. Only works if the user has
 * already set their avatar_url and phone number.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function POST() {
  // 1. Check login
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  // 2. Check that avatar and phone are set
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_url, phone")
    .eq("id", user.id)
    .single();

  if (!profile?.avatar_url) {
    return NextResponse.json({ error: "Profile picture is required" }, { status: 400 });
  }

  if (!profile?.phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  // 3. Mark onboarding as complete
  const { error } = await admin
    .from("profiles")
    .update({ onboarding_done: true })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not complete onboarding" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
