/**
 * FILE: src/app/events/[id]/page.tsx
 *
 * The individual event page. Shows all event details, the RSVP button,
 * the contribution amount (for paid events), and the attendees list.
 *
 * If the logged-in user is the HOST, they also see a "Mark as Paid"
 * button next to each attendee's name.
 */

import { createClient } from "@/lib/supabase/server";
import { getSportEmoji } from "@/lib/types";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import Link from "next/link";
import RSVPButton from "./rsvp-button";
import MarkPaidButton from "./mark-paid-button";
import ShareButton from "./share-button";

/**
 * generateMetadata — runs on the server before the page loads.
 * This sets the OG (Open Graph) tags so that when anyone shares
 * the event URL on WhatsApp, iMessage, Twitter, etc., it shows
 * a rich preview with the beautiful event card image.
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, sport, location, date")
    .eq("id", params.id)
    .single();

  if (!event) return { title: "Event | USC" };

  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return {
    title: `${event.title} | Udaipur Sports Club`,
    description: `${event.sport} event at ${event.location} on ${formattedDate}. Join us!`,
    openGraph: {
      title:       event.title,
      description: `${event.sport} · ${event.location} · ${formattedDate}`,
      // This tells WhatsApp/iMessage/Twitter to show our beautiful card image
      images: [`/api/og/event/${params.id}`],
    },
    twitter: {
      card:        "summary_large_image",
      title:       event.title,
      description: `${event.sport} · ${event.location} · ${formattedDate}`,
      images:      [`/api/og/event/${params.id}`],
    },
  };
}

export default async function EventPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // Check who's logged in
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!event) notFound();

  // Fetch all RSVPs for this event
  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("*")
    .eq("event_id", params.id)
    .order("created_at", { ascending: true });

  const rsvpList = rsvps ?? [];
  const rsvpCount = rsvpList.length;
  const spotsLeft = event.capacity - rsvpCount;
  const isFull = spotsLeft <= 0;
  const fillPercent = Math.min((rsvpCount / event.capacity) * 100, 100);

  // Is this a free event?
  const isFree = !event.total_cost || event.total_cost === 0;

  // Per-person contribution (fixed at creation: total ÷ capacity)
  const perPerson = isFree ? 0 : Math.ceil(event.total_cost / event.capacity);

  // Is the logged-in user the host?
  const isHost = user?.id === event.host_id;

  // Find this user's RSVP (if any)
  const myRSVP = user ? rsvpList.find((r) => r.user_id === user.id) : null;
  const hasRSVPed = !!myRSVP;

  // Format date
  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Format time
  const [hours, minutes] = event.time.split(":");
  const timeDate = new Date();
  timeDate.setHours(parseInt(hours), parseInt(minutes));
  const formattedTime = timeDate.toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  return (
    <main
      className="min-h-screen bg-[#F9F7F4]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── TOP NAV ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <Link href="/" className="text-sm font-bold tracking-[0.25em] uppercase text-slate-900 hover:text-amber-500 transition-colors">
          USC
        </Link>
        <Link href="/events" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← All Events
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* ── EVENT HEADER ─────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{getSportEmoji(event.sport)}</span>
            <span className="text-xs font-bold tracking-widest uppercase text-slate-400">{event.sport}</span>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-6 leading-tight">
            {event.title}
          </h1>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>📅</span><span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>⏰</span><span>{formattedTime}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>📍</span><span>{event.location}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>👤</span>
              <span>Hosted by <strong>{event.host_name}</strong></span>
            </div>
          </div>
        </div>

        {/* ── CONTRIBUTION AMOUNT (paid events only) ───────────────── */}
        {!isFree && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-1">
              Contribution
            </p>
            <p className="text-3xl font-extrabold text-amber-600">
              ₹{perPerson}
              <span className="text-base font-medium text-amber-400 ml-2">per person</span>
            </p>
            <p className="text-xs text-amber-500 mt-2">
              Total event cost ₹{event.total_cost} ÷ {event.capacity} players.
              Pay directly to host via UPI.
            </p>
          </div>
        )}

        {/* ── DESCRIPTION ──────────────────────────────────────────── */}
        {event.description && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">
              About this event
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* ── CAPACITY BAR ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">Spots</h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isFull ? "bg-red-50 text-red-500" : spotsLeft <= 5 ? "bg-orange-50 text-orange-500" : "bg-green-50 text-green-600"
            }`}>
              {isFull ? "Full" : `${spotsLeft} spots left`}
            </span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${isFull ? "bg-red-400" : "bg-amber-400"}`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">{rsvpCount} of {event.capacity} players joined</p>
        </div>

        {/* ── RSVP BUTTON + SHARE BUTTON ───────────────────────────── */}
        <div className="mb-8 space-y-3">
          <RSVPButton
            eventId={event.id}
            userId={user?.id ?? null}
            userName={user?.user_metadata?.full_name ?? ""}
            userEmail={user?.email ?? ""}
            hasRSVPed={hasRSVPed}
            isFull={isFull}
            isFree={isFree}
            perPersonAmount={perPerson}
            upiId={event.upi_id ?? null}
            hostId={event.host_id}
            paymentStatus={myRSVP?.payment_status ?? null}
          />

          {/* Share button — always visible below the RSVP button */}
          <ShareButton
            eventId={event.id}
            eventTitle={event.title}
            eventUrl={`https://usc-platform-beta.vercel.app/events/${event.id}`}
          />
        </div>

        {/* ── ATTENDEES LIST ────────────────────────────────────────── */}
        {rsvpList.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
              Who&apos;s coming ({rsvpCount})
            </h2>
            <div className="space-y-3">
              {rsvpList.map((rsvp) => (
                <div key={rsvp.id} className="flex items-center justify-between">

                  {/* Left: avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm font-bold flex-shrink-0">
                      {rsvp.user_name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-sm text-slate-700 font-medium">
                        {rsvp.user_name}
                        {user?.id === rsvp.user_id && (
                          <span className="text-slate-400 font-normal ml-1">(you)</span>
                        )}
                      </span>
                      {/* Payment status label for non-free events */}
                      {!isFree && (
                        <p className={`text-xs mt-0.5 ${
                          rsvp.payment_status === "paid" ? "text-green-500" : "text-amber-500"
                        }`}>
                          {rsvp.payment_status === "paid" ? "✓ Paid" : "⏳ Payment pending"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: "Mark as Paid" button — only visible to host */}
                  {isHost && !isFree && rsvp.user_id !== event.host_id && (
                    <MarkPaidButton
                      rsvpId={rsvp.id}
                      paymentStatus={rsvp.payment_status}
                    />
                  )}

                </div>
              ))}
            </div>

            {/* Host tip — only shown to the host */}
            {isHost && !isFree && (
              <p className="text-xs text-slate-300 mt-6 border-t border-stone-100 pt-4">
                Tap &quot;Mark paid&quot; next to each player once you receive their payment.
              </p>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
