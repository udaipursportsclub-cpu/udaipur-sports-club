/**
 * FILE: src/app/api/events/[id]/waitlist/route.ts
 *
 * What this does:
 * POST  → join the waitlist for a full event
 * DELETE → leave the waitlist
 *
 * When someone joins the waitlist:
 * - They get added with a position number
 * - They receive a "you're #X on the waitlist" email
 *
 * When someone cancels their RSVP from a full event:
 * - Person #1 on the waitlist gets a "spot opened!" email
 * - Their waitlist entry is NOT auto-deleted (they still have to RSVP)
 */

import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { NextResponse }       from "next/server";
import { sendWaitlistEmail } from "@/lib/email";

// ── POST: Join waitlist ──────────────────────────────────────────────────
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const eventId = params.id;
  const admin = createAdminClient();

  // Make sure event exists and is full
  const { data: event } = await admin
    .from("events").select("*").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { count: rsvpCount } = await admin
    .from("rsvps").select("*", { count: "exact", head: true }).eq("event_id", eventId);

  const isFull = (rsvpCount ?? 0) >= event.capacity;
  if (!isFull) {
    return NextResponse.json({ error: "Event still has spots — just RSVP!" }, { status: 400 });
  }

  // Check already on waitlist
  const { data: existing } = await admin
    .from("waitlist").select("id").eq("event_id", eventId).eq("user_id", user.id).single();
  if (existing) {
    return NextResponse.json({ error: "Already on waitlist" }, { status: 400 });
  }

  // Get current waitlist count for position
  const { count: waitlistCount } = await admin
    .from("waitlist").select("*", { count: "exact", head: true }).eq("event_id", eventId);

  const position = (waitlistCount ?? 0) + 1;

  // Insert into waitlist
  await admin.from("waitlist").insert({
    event_id:   eventId,
    user_id:    user.id,
    user_name:  user.user_metadata?.full_name ?? "Unknown",
    user_email: user.email ?? null,
    position,
  });

  // Send waitlist confirmation email (if they have an email)
  const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://udaipursportsclub.vercel.app"}/events/${eventId}`;
  if (user.email) {
    sendWaitlistEmail({
      to:         user.email,
      userName:   user.user_metadata?.full_name ?? "there",
      eventTitle: event.title,
      position,
      eventUrl,
    }).catch(() => {});
  }

  return NextResponse.json({ position });
}

// ── DELETE: Leave waitlist ───────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("waitlist")
    .delete()
    .eq("event_id", params.id)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}

