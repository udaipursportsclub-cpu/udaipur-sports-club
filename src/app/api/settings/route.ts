/**
 * FILE: src/app/api/settings/route.ts
 * PATCH — update notification preferences
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { notify_email, phone, full_name } = await request.json();
  const admin = createAdminClient();

  await admin.from("profiles").update({
    notify_email: notify_email?.trim() || null,
    phone:        phone?.trim()        || null,
    full_name:    full_name?.trim()    || null,
  }).eq("id", user.id);

  return NextResponse.json({ success: true });
}
