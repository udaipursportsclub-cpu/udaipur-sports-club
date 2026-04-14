/**
 * FILE: src/app/api/photos/match/route.ts
 *
 * After the browser finds face matches, save them to the database.
 * This links a photo_faces row to a user profile.
 *
 * POST body (JSON):
 *   - faceIds:  Array of photo_faces UUIDs that matched
 *   - userId:   The user who was matched
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient }      from "@/lib/supabase/server";
import { NextResponse }      from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { faceIds, userId } = await request.json() as {
    faceIds: string[];
    userId: string;
  };

  // Users can only match their own face
  if (userId !== user.id) {
    return NextResponse.json({ error: "Can only match your own face" }, { status: 403 });
  }

  if (!faceIds || faceIds.length === 0) {
    return NextResponse.json({ error: "No face IDs" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Update all matching face rows
  const { error } = await admin
    .from("photo_faces")
    .update({ matched_user_id: userId })
    .in("id", faceIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, matched: faceIds.length });
}
