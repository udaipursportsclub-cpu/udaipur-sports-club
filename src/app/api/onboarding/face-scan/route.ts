/**
 * FILE: src/app/api/onboarding/face-scan/route.ts
 *
 * POST — saves the user's face descriptor from the onboarding face scan.
 * Stores the 128-dimension face-api.js descriptor as JSON on the profiles table
 * (face_descriptor column) and sets face_scan_done = true.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function POST(request: Request) {
  // 1. Check login
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  // 2. Read the descriptor
  const { descriptor } = await request.json() as { descriptor: number[] };

  if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
    return NextResponse.json({ error: "Invalid face descriptor" }, { status: 400 });
  }

  // 3. Save to profile
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      face_descriptor: descriptor,
      face_scan_done: true,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Face scan save error:", error);
    return NextResponse.json({ error: "Could not save face scan" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
