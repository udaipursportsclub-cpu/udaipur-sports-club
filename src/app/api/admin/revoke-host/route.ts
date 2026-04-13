/**
 * FILE: src/app/api/admin/revoke-host/route.ts
 *
 * What this does:
 * Server-side API that removes someone's host status.
 * Only callable by admins.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { profileId } = await request.json();

  // Verify caller is an admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Downgrade target user to member
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ role: "member" })
    .eq("id", profileId);

  return NextResponse.json({ success: true });
}
