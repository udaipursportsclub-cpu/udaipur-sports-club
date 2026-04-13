/**
 * FILE: src/app/api/admin/change-role/route.ts
 *
 * What this does:
 * Server-side API that changes a user's role.
 * Only callable by admins.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const VALID_ROLES = ["member", "host", "proxy", "admin"];

export async function POST(request: Request) {
  const { profileId, role } = await request.json();

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Only admins can change roles
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Apply the role change
  const admin = createAdminClient();
  await admin.from("profiles").update({ role }).eq("id", profileId);

  return NextResponse.json({ success: true });
}
