/**
 * FILE: src/app/api/events/[id]/waive-payment/route.ts
 *
 * POST — waive payment for an attendee. Only the event host or an admin can do this.
 * Sets payment_status = 'waived', payment_waived = true, waived_by = current user.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { rsvpId } = await request.json();
  if (!rsvpId) {
    return NextResponse.json({ error: "rsvpId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch the event to check host
  const { data: event } = await admin
    .from("events")
    .select("host_id")
    .eq("id", params.id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Check if current user is host or admin
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isHost = user.id === event.host_id;
  const isAdmin = profile?.role === "admin";

  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or admin can waive payments" }, { status: 403 });
  }

  // Verify the RSVP belongs to this event
  const { data: rsvp } = await admin
    .from("rsvps")
    .select("id, event_id")
    .eq("id", rsvpId)
    .single();

  if (!rsvp || rsvp.event_id !== params.id) {
    return NextResponse.json({ error: "RSVP not found for this event" }, { status: 404 });
  }

  // Update the RSVP
  const { error } = await admin
    .from("rsvps")
    .update({
      payment_status: "waived",
      payment_waived: true,
      waived_by: user.id,
    })
    .eq("id", rsvpId);

  if (error) {
    return NextResponse.json({ error: "Could not waive payment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
