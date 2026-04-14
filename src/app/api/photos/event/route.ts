/**
 * FILE: src/app/api/photos/event/route.ts
 *
 * Get all photos for an event.
 * Also supports getting all photos a specific user appears in.
 *
 * GET query params:
 *   - eventId:  Get all photos for this event
 *   - userId:   (optional) Filter to photos containing this user's face
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const userId  = searchParams.get("userId");

  const admin = createAdminClient();

  // If userId is provided without eventId, get ALL photos this user appears in
  if (userId && !eventId) {
    const { data: faces } = await admin
      .from("photo_faces")
      .select("photo_id")
      .eq("matched_user_id", userId);

    if (!faces || faces.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    const photoIds = Array.from(new Set(faces.map((f) => f.photo_id)));

    const { data: photos } = await admin
      .from("event_photos")
      .select("id, photo_url, event_id, created_at")
      .in("id", photoIds)
      .order("created_at", { ascending: false });

    return NextResponse.json({ photos: photos ?? [] });
  }

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const { data: photos } = await admin
    .from("event_photos")
    .select("id, photo_url, r2_key, created_at, uploaded_by")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ photos: photos ?? [] });
}
