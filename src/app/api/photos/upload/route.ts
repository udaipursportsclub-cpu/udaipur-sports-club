/**
 * FILE: src/app/api/photos/upload/route.ts
 *
 * Upload event photos to ImgBB (free, unlimited).
 * Host or admin uploads photos from an event → stored on ImgBB,
 * metadata saved in Supabase event_photos table.
 *
 * POST body (multipart/form-data):
 *   - files:    One or more image files
 *   - eventId:  Which event these photos belong to
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadToImgBB }     from "@/lib/imgbb";
import { NextResponse }      from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const role = profile?.role;
  if (role !== "admin" && role !== "proxy" && role !== "host") {
    return NextResponse.json({ error: "Only hosts can upload photos" }, { status: 403 });
  }

  const formData = await request.formData();
  const eventId  = formData.get("eventId") as string | null;

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  // Collect all files from the form
  const files: File[] = [];
  const entries = formData.getAll("files");
  for (const value of entries) {
    if (value instanceof File && value.size > 0) {
      files.push(value);
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const admin = createAdminClient();
  const uploaded: { id: string; photo_url: string }[] = [];

  for (const file of files) {
    try {
      const bytes  = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const name   = `usc-${eventId}-${Date.now()}`;

      const { url } = await uploadToImgBB(buffer, name);

      // Save to database
      const { data: photo, error } = await admin
        .from("event_photos")
        .insert({
          event_id:    eventId,
          uploaded_by: user.id,
          r2_key:      name,       // reusing column for imgbb filename
          photo_url:   url,
        })
        .select("id, photo_url")
        .single();

      if (!error && photo) {
        uploaded.push(photo);
      }
    } catch (e) {
      console.error("Upload failed for", file.name, e);
    }
  }

  return NextResponse.json({
    success: true,
    count:   uploaded.length,
    photos:  uploaded,
  });
}
