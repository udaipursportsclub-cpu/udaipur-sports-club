/**
 * FILE: src/app/api/events/[id]/cancel/route.ts
 *
 * What this does:
 * Cancels a user's RSVP. If the event was full and someone cancels,
 * we automatically notify the #1 person on the waitlist that a spot opened.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";
import { sendSpotOpenedEmail } from "@/lib/email";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin  = createAdminClient();
  const eventId = params.id;

  // Get event details before deleting RSVP
  const { data: event } = await admin
    .from("events").select("*").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Check current RSVP count (before cancellation)
  const { count: rsvpCountBefore } = await admin
    .from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", eventId);

  const wasFull = (rsvpCountBefore ?? 0) >= event.capacity;

  // Delete the RSVP
  await admin.from("rsvps")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  // If event WAS full, notify next person on waitlist
  if (wasFull) {
    const { data: next } = await admin
      .from("waitlist")
      .select("*")
      .eq("event_id", eventId)
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (next?.user_email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://udaipursportsclub.vercel.app";
      sendSpotOpenedEmail({
        to:         next.user_email,
        userName:   next.user_name,
        eventTitle: event.title,
        eventUrl:   `${siteUrl}/events/${eventId}`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
