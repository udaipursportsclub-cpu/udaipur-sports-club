/**
 * FILE: src/app/api/admin/generate-code/route.ts
 *
 * What this does:
 * Server-side API that creates a new challenge code.
 * Only callable by admins.
 * Generates a code like "USC-AB12CD" and saves it to the database.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  // Verify caller is an admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Generate a random code: USC-XXXXXX (6 random alphanumeric chars)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const code = `USC-${random}`;

  // Save to database
  const admin = createAdminClient();
  const { error } = await admin
    .from("challenge_codes")
    .insert({ code, is_active: true });

  if (error) {
    return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
  }

  return NextResponse.json({ code });
}
