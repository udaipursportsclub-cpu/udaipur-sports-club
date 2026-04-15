/**
 * FILE: src/app/api/settings/avatar/route.ts
 *
 * POST — upload a profile picture to ImgBB, save URL to profiles.avatar_url.
 * Accepts multipart form data with an "image" field.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadToImgBB }     from "@/lib/imgbb";
import { NextResponse }      from "next/server";

export async function POST(request: Request) {
  // 1. Check login
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  // 2. Read the uploaded file
  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
  }

  // Validate it's an image
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  try {
    // 3. Upload to ImgBB
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `avatar_${user.id}_${Date.now()}`;
    const { url } = await uploadToImgBB(buffer, filename);

    // 4. Save URL to profiles
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "Could not save avatar" }, { status: 500 });
    }

    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error("Avatar upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }
}
