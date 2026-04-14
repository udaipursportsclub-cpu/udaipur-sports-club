/**
 * FILE: src/app/api/events/[id]/route.ts
 *
 * PATCH — host edits their event details
 * DELETE — host cancels their event (emails all RSVPed members)
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

// ── PATCH: Edit event ────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin   = createAdminClient();
  const eventId = params.id;

  const { data: event } = await admin.from("events").select("host_id").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (event.host_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const allowed = ["title", "sport", "description", "date", "time", "location", "capacity", "total_cost", "upi_id"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  await admin.from("events").update(updates).eq("id", eventId);
  return NextResponse.json({ success: true });
}

// ── DELETE: Cancel event ──────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin   = createAdminClient();
  const eventId = params.id;

  const { data: event } = await admin.from("events").select("*").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (event.host_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Mark as cancelled (don't delete — preserve history)
  await admin.from("events").update({ status: "cancelled" }).eq("id", eventId);

  // Email all RSVPed members about cancellation
  const { data: rsvps } = await admin
    .from("rsvps").select("user_email, user_name").eq("event_id", eventId);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usc-platform-beta.vercel.app";

  if (rsvps && process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    for (const r of rsvps) {
      if (!r.user_email) continue;
      resend.emails.send({
        from:    "Udaipur Sports Club <noreply@usc-platform-beta.vercel.app>",
        to:      [r.user_email],
        subject: `Event cancelled: ${event.title}`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#F9F7F4;padding:40px 20px;">
            <div style="background:white;border-radius:20px;padding:40px;border:1px solid #e7e5e4;">
              <p style="color:#F59E0B;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;margin:0 0 24px;">Udaipur Sports Club</p>
              <h1 style="color:#0f172a;font-size:24px;font-weight:800;margin:0 0 12px;">Event Cancelled</h1>
              <p style="color:#64748b;font-size:14px;margin:0 0 24px;">
                Hey ${r.user_name.split(" ")[0]}, the event <strong>${event.title}</strong> has been cancelled by the host. Sorry for the inconvenience.
              </p>
              <a href="${siteUrl}/events" style="display:block;background:#0f172a;color:white;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;">
                Browse Other Events →
              </a>
            </div>
          </div>
        `,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
