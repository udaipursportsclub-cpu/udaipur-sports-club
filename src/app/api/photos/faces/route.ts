/**
 * FILE: src/app/api/photos/faces/route.ts
 *
 * Save face descriptors detected by the browser (face-api.js).
 * After uploading photos, the browser runs face detection client-side
 * and sends the face embeddings here to store in Supabase.
 *
 * POST body (JSON):
 *   - photoId:     UUID of the event_photos row
 *   - faces:       Array of { descriptor: number[], box: { x, y, width, height } }
 *
 * GET query:
 *   - eventId:     Get all face descriptors for an event (for matching)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient }      from "@/lib/supabase/server";
import { NextResponse }      from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { photoId, faces } = body as {
    photoId: string;
    faces: { descriptor: number[]; box: { x: number; y: number; width: number; height: number } }[];
  };

  if (!photoId || !faces || faces.length === 0) {
    return NextResponse.json({ error: "photoId and faces required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const rows = faces.map((f) => ({
    photo_id:   photoId,
    descriptor: f.descriptor,
    box:        f.box,
  }));

  const { error } = await admin.from("photo_faces").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: faces.length });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get all photos for this event with their face descriptors
  const { data: photos } = await admin
    .from("event_photos")
    .select("id, photo_url")
    .eq("event_id", eventId);

  if (!photos || photos.length === 0) {
    return NextResponse.json({ photos: [], faces: [] });
  }

  const photoIds = photos.map((p) => p.id);

  const { data: faces } = await admin
    .from("photo_faces")
    .select("id, photo_id, descriptor, box, matched_user_id")
    .in("photo_id", photoIds);

  return NextResponse.json({ photos, faces: faces ?? [] });
}
