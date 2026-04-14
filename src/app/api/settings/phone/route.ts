/**
 * FILE: src/app/api/settings/phone/route.ts
 * POST — update the logged-in user's phone number
 *
 * Validates Indian mobile format (10 digits, starts with 6-9)
 * then saves it to the profiles table.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function POST(request: Request) {
  // 1. Check the user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  // 2. Read & validate the phone number
  const { phone } = await request.json();

  if (!phone || typeof phone !== "string") {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const cleaned = phone.replace(/\s+/g, "").replace(/^\+91/, "");

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number" },
      { status: 400 }
    );
  }

  // 3. Save to profiles
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ phone: cleaned })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not save phone number" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
