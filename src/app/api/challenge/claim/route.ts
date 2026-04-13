/**
 * FILE: src/app/api/challenge/claim/route.ts
 *
 * What this does:
 * The server-side handler for claiming a host challenge code.
 *
 * When a user submits a code on /challenge:
 * 1. We verify they're logged in
 * 2. We check if the code exists, is active, and hasn't been claimed
 * 3. If valid: we upgrade their profile to "host" AND mark the code as claimed
 * 4. If invalid: return a clear error message
 *
 * This runs on the server so users can't cheat — all validation
 * happens here, not in the browser.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "No code provided." }, { status: 400 });
  }

  // Check who's calling this — must be logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  // Check if user is already a host — no need to claim again
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "host" || profile?.role === "admin") {
    return NextResponse.json({ error: "You are already a host!" }, { status: 400 });
  }

  // Use admin client to bypass RLS for the next operations
  const admin = createAdminClient();

  // Find the challenge code
  const { data: challengeCode } = await admin
    .from("challenge_codes")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .single();

  // Code doesn't exist
  if (!challengeCode) {
    return NextResponse.json(
      { error: "Invalid code. Double-check and try again." },
      { status: 400 }
    );
  }

  // Code exists but is no longer active
  if (!challengeCode.is_active) {
    return NextResponse.json(
      { error: "This code has been deactivated." },
      { status: 400 }
    );
  }

  // Code already claimed by someone else
  if (challengeCode.claimed_by) {
    return NextResponse.json(
      { error: "This code has already been claimed. Ask Avi for a new one." },
      { status: 400 }
    );
  }

  // ── Everything checks out — make them a host! ─────────────────────

  // 1. Upgrade their profile role to "host"
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({
      id:       user.id,
      role:     "host",
      full_name: user.user_metadata?.full_name ?? "",
      avatar_url: user.user_metadata?.avatar_url ?? "",
    });

  if (profileError) {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  // 2. Mark the code as claimed so nobody else can use it
  await admin
    .from("challenge_codes")
    .update({
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
      is_active:  false,
    })
    .eq("id", challengeCode.id);

  return NextResponse.json({ success: true });
}
