/**
 * FILE: src/app/api/events/[id]/guest-rsvp/route.ts
 *
 * Guest RSVP endpoint — allows anyone to book an event without
 * logging in or having a Supabase account. Uses the admin client
 * to bypass RLS since there is no authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { userName, userEmail, userPhone, spots } = body;
    const eventId = params.id;

    // ── Validation ────────────────────────────────────────────────
    if (!userName || !userName.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    if (!userPhone || !userPhone.trim()) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    // Accept 10-digit Indian phone (with optional +91 / 0 prefix)
    const cleanPhone = userPhone.replace(/[\s\-\+]/g, "");
    const phoneDigits = cleanPhone.replace(/^(91|0)/, "");
    if (!/^\d{10}$/.test(phoneDigits)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian phone number." },
        { status: 400 }
      );
    }

    if (!userEmail || !userEmail.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const spotCount = Number(spots) || 1;
    if (spotCount < 1 || spotCount > 10) {
      return NextResponse.json(
        { error: "Spots must be between 1 and 10." },
        { status: 400 }
      );
    }

    // ── Check event exists & capacity ─────────────────────────────
    const supabase = createAdminClient();

    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, capacity, total_cost, status")
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    if (event.status === "completed") {
      return NextResponse.json(
        { error: "This event has already been completed." },
        { status: 400 }
      );
    }

    // Count existing RSVPs
    const { count } = await supabase
      .from("rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    const currentCount = count ?? 0;
    const spotsLeft = event.capacity - currentCount;

    if (spotCount > spotsLeft) {
      return NextResponse.json(
        { error: spotsLeft === 0 ? "This event is full." : `Only ${spotsLeft} spot(s) left.` },
        { status: 400 }
      );
    }

    // ── Insert RSVP rows ──────────────────────────────────────────
    const isFree = !event.total_cost || event.total_cost === 0;

    const rows = Array.from({ length: spotCount }, () => ({
      event_id: eventId,
      user_id: null,
      user_name: userName.trim(),
      user_email: userEmail.trim(),
      user_phone: userPhone.trim(),
      payment_status: isFree ? "free" : "pending",
      is_guest: true,
    }));

    const { error: insertErr } = await supabase.from("rsvps").insert(rows);

    if (insertErr) {
      console.error("Guest RSVP insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to book. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, spots: spotCount });
  } catch (err) {
    console.error("Guest RSVP error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
