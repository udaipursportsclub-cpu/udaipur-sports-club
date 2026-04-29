import { createClient }               from "@/lib/supabase/server";
import { createAdminClient }           from "@/lib/supabase/admin";
import { NextResponse }                from "next/server";
import { sendBookingConfirmationEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { playerNames, email, spots, isFree, perPerson } = await request.json();

  if (!playerNames?.length || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch event details for the confirmation email
  const { data: event } = await admin
    .from("events")
    .select("title, sport, date, time, location")
    .eq("id", params.id)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Insert one RSVP per player
  for (let i = 0; i < spots; i++) {
    const { error } = await admin.from("rsvps").insert({
      event_id:       params.id,
      user_id:        user.id,
      user_name:      playerNames[i]?.trim() ?? playerNames[0].trim(),
      user_email:     email.trim(),
      payment_status: isFree ? "free" : "pending",
    });
    if (error) return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }

  // Send confirmation email in background (don't block the response)
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://udaipursportsclub.vercel.app";
  const eventUrl = `${siteUrl}/events/${params.id}`;

  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const [h, m]  = event.time.split(":");
  const td      = new Date(); td.setHours(parseInt(h), parseInt(m));
  const formattedTime = td.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

  sendBookingConfirmationEmail({
    to:         email.trim(),
    userName:   playerNames[0].trim(),
    eventTitle: event.title,
    sport:      event.sport,
    date:       formattedDate,
    time:       formattedTime,
    location:   event.location,
    spots,
    perPerson,
    isFree,
    eventUrl,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
