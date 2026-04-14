/**
 * FILE: src/app/api/events/[id]/complete/route.ts
 *
 * What this does:
 * Host calls this to mark their event as "completed".
 * Once completed:
 *   - Event status changes to "completed"
 *   - The "I Played" share card unlocks for all attendees
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin   = createAdminClient();
  const eventId = params.id;

  // Verify the caller is the host of this event (or admin)
  const { data: event } = await admin
    .from("events").select("host_id").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", user.id).single();

  if (event.host_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await admin.from("events")
    .update({ status: "completed" })
    .eq("id", eventId);

  return NextResponse.json({ success: true });
}
