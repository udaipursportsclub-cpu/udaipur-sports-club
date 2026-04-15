/**
 * FILE: src/app/api/settings/username/route.ts
 *
 * POST — claim a username for the logged-in user
 * GET  — get 5 username suggestions based on the user's name
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { username: rawUsername } = await request.json();
  if (!rawUsername || typeof rawUsername !== "string") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const username = rawUsername.toLowerCase().trim();

  // Validate format
  if (username.length < 3 || username.length > 20) {
    return NextResponse.json({ error: "Username must be 3-20 characters" }, { status: 400 });
  }
  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: "Only lowercase letters, numbers, and underscores allowed. Must start with a letter." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Check reserved
  const { data: reserved } = await admin
    .from("reserved_usernames")
    .select("username")
    .eq("username", username)
    .single();

  if (reserved) {
    return NextResponse.json({ error: "This username is reserved" }, { status: 400 });
  }

  // Try to claim it (unique constraint will catch duplicates)
  const { error } = await admin
    .from("profiles")
    .update({ username })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This username is already taken" }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not save username" }, { status: 500 });
  }

  return NextResponse.json({ success: true, username });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || user.user_metadata?.full_name || "player";

  const admin = createAdminClient();

  // Generate candidate usernames from the name
  const parts = q.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/);
  const first = parts[0] || "player";
  const last = parts[1] || "";

  const rand2 = () => Math.floor(Math.random() * 90 + 10);
  const rand3 = () => Math.floor(Math.random() * 900 + 100);

  const candidates: string[] = [];

  // Generate a pool of candidates
  if (last) {
    candidates.push(`${first}_${last}`);
    candidates.push(`${first}.${last.charAt(0)}`);
    candidates.push(`${first.charAt(0)}_${last}`);
    candidates.push(`${first}_${last}${rand2()}`);
    candidates.push(`${last}_${first}`);
  }
  candidates.push(`${first}_usc`);
  candidates.push(`${first}${rand2()}`);
  candidates.push(`${first}${rand3()}`);
  candidates.push(`${first}_pro`);
  candidates.push(`${first}_plays`);
  candidates.push(`${first}_sports`);
  candidates.push(`${first}_ace`);
  candidates.push(`${first}${rand2()}_usc`);
  candidates.push(`${first}_star`);
  candidates.push(`${first}_game`);

  // Clean candidates: ensure they match the regex
  const cleaned = candidates
    .map((c) => c.replace(/[^a-z0-9_]/g, "").slice(0, 20))
    .filter((c) => USERNAME_REGEX.test(c));

  // Deduplicate
  const unique = Array.from(new Set(cleaned));

  // Check which are taken or reserved (batch)
  const available: string[] = [];
  for (const candidate of unique) {
    if (available.length >= 5) break;

    // Check reserved
    const { data: res } = await admin
      .from("reserved_usernames")
      .select("username")
      .eq("username", candidate)
      .single();
    if (res) continue;

    // Check taken
    const { data: taken } = await admin
      .from("profiles")
      .select("username")
      .eq("username", candidate)
      .single();
    if (taken) continue;

    available.push(candidate);
  }

  return NextResponse.json({ suggestions: available });
}
