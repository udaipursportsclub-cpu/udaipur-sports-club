/**
 * FILE: src/app/api/events/route.ts
 *
 * What this does:
 * Server-side API to create a new event.
 * Moved here from the client so we can:
 * 1. Verify the user is a host/admin (server-side, safe)
 * 2. Insert the event
 * 3. Send email notifications to ALL members in the background
 *
 * Called by create-event-form.tsx on submit.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";
import { sendNewEventEmail } from "@/lib/email";
import { postEventToSocial } from "@/lib/social";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify logged-in user is a host or admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["host", "proxy", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Parse the event data
  const body = await request.json();
  const { title, sport, description, date, time, location, capacity, total_cost, upi_id, reserved_slots } = body;

  if (!title || !sport || !date || !time || !location || !capacity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Insert the event
  const admin = createAdminClient();
  const { data: event, error: insertError } = await admin
    .from("events")
    .insert({
      title:       title.trim(),
      sport,
      description: description?.trim() || null,
      date,
      time,
      location:    location.trim(),
      capacity:       Number(capacity),
      reserved_slots: Number(reserved_slots ?? 0),
      total_cost:     Number(total_cost ?? 0),
      upi_id:      Number(total_cost) > 0 ? upi_id?.trim() : null,
      host_id:     user.id,
      host_name:   user.user_metadata?.full_name ?? "Unknown Host",
      status:      "upcoming",
    })
    .select()
    .single();

  if (insertError || !event) {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }

  // ── Post to social media + send emails in the background ────────────
  // We don't await this — the event is created, we return immediately.
  // Emails go out async so the host isn't waiting.
  const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://usc-platform-beta.vercel.app"}/events/${event.id}`;
  const perPerson = Number(total_cost) > 0 ? Math.ceil(Number(total_cost) / Number(capacity)) : 0;

  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const [hours, minutes] = time.split(":");
  const timeDate = new Date();
  timeDate.setHours(parseInt(hours), parseInt(minutes));
  const formattedTime = timeDate.toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  // Fire social posts (no-op if no keys configured)
  postEventToSocial({
    eventId:   event.id,
    title,
    sport,
    date:      formattedDate,
    time:      formattedTime,
    location,
    capacity:  Number(capacity),
    rsvpCount: 0,
    isFree:    Number(total_cost) === 0,
    perPerson,
    siteUrl:   process.env.NEXT_PUBLIC_SITE_URL ?? "https://usc-platform-beta.vercel.app",
  }).catch(() => {});

  // Fetch all member emails (non-host members who want event alerts)
  admin
    .from("profiles")
    .select("full_name, notify_email")
    .neq("id", user.id) // Don't email the host
    .not("notify_email", "is", null)
    .then(({ data: members }) => {
      if (!members) return;
      members.forEach((m) => {
        if (m.notify_email) {
          sendNewEventEmail({
            to:         m.notify_email,
            userName:   m.full_name ?? "there",
            eventTitle: title,
            sport,
            date:       formattedDate,
            time:       formattedTime,
            location,
            eventUrl,
            perPerson,
          }).catch(() => {}); // Swallow errors — emails are best-effort
        }
      });
    });

  return NextResponse.json({ id: event.id });
}
