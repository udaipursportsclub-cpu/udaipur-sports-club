/**
 * FILE: src/app/api/events/[id]/attendance/route.ts
 *
 * POST — host or admin marks a member's attendance (present / absent / late)
 * GET  — returns all attendance records for this event
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

// ── POST: Mark attendance ───────────────────────────────────────────────
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin   = createAdminClient();
  const eventId = params.id;

  // 2. Make sure the event exists & get host
  const { data: event } = await admin
    .from("events")
    .select("host_id")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // 3. Only the host or an admin can mark attendance
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (event.host_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // 4. Validate body
  const { userId, status } = await request.json();

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!["present", "absent", "late"].includes(status)) {
    return NextResponse.json(
      { error: "status must be present, absent, or late" },
      { status: 400 }
    );
  }

  // 5. Upsert attendance record
  const { error: upsertErr } = await admin
    .from("attendance")
    .upsert(
      { event_id: eventId, user_id: userId, status, marked_by: user.id },
      { onConflict: "event_id,user_id" }
    );

  if (upsertErr) {
    return NextResponse.json({ error: "Could not save attendance" }, { status: 500 });
  }

  // 6. If marking absent — bump no_show_count and maybe deduct reliability
  if (status === "absent") {
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("no_show_count, reliability_score")
      .eq("id", userId)
      .single();

    if (targetProfile) {
      const newNoShow = (targetProfile.no_show_count ?? 0) + 1;
      const updates: Record<string, number> = { no_show_count: newNoShow };

      // Deduct reliability only if the user already had previous no-shows
      if ((targetProfile.no_show_count ?? 0) > 0) {
        updates.reliability_score = Math.max(
          0,
          (targetProfile.reliability_score ?? 100) - 5
        );
      }

      await admin.from("profiles").update(updates).eq("id", userId);
    }
  }

  return NextResponse.json({ success: true });
}

// ── GET: List attendance for the event ──────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin   = createAdminClient();
  const eventId = params.id;

  const { data, error } = await admin
    .from("attendance")
    .select("*")
    .eq("event_id", eventId);

  if (error) {
    return NextResponse.json({ error: "Could not load attendance" }, { status: 500 });
  }

  return NextResponse.json({ attendance: data });
}
