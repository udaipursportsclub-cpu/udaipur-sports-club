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
import NavLogo from "@/components/NavLogo";
import RSVPButton           from "./rsvp-button";
import WaitlistButton       from "./waitlist-button";
import MarkPaidButton       from "./mark-paid-button";
import ShareButton          from "./share-button";
import CompleteEventButton  from "./complete-event-button";
import SharePlayedCard      from "./share-played-card";
import ChallengeFriend      from "./challenge-friend";

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

  // Fetch waitlist for this event
  const { data: waitlist } = await supabase
    .from("waitlist")
    .select("*")
    .eq("event_id", params.id)
    .order("position", { ascending: true });

  const waitlistList = waitlist ?? [];

  // Find this user's RSVP (if any)
  const myRSVP = user ? rsvpList.find((r) => r.user_id === user.id) : null;
  const hasRSVPed = !!myRSVP;

  // Find this user's waitlist entry (if any)
  const myWaitlist    = user ? waitlistList.find((w) => w.user_id === user.id) : null;
  const onWaitlist    = !!myWaitlist;
  const waitlistPos   = myWaitlist?.position ?? null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usc-platform-beta.vercel.app";
  const isCompleted = event.status === "completed";

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
      className="min-h-screen bg-[#030712]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── TOP NAV ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white/[0.03] border-b border-white/5">
        <NavLogo />
        <div className="flex items-center gap-4">
          {isHost && event.status === "upcoming" && (
            <Link href={`/events/${event.id}/edit`}
              className="text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-full transition-colors">
              Edit Event
            </Link>
          )}
          <Link href="/events" className="text-sm text-white/40 hover:text-white transition-colors">
            ← All Events
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* ── EVENT HEADER ─────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{getSportEmoji(event.sport)}</span>
            <span className="text-xs font-bold tracking-widest uppercase text-white/20">{event.sport}</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-6 leading-tight">
            {event.title}
          </h1>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span>📅</span><span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span>⏰</span><span>{formattedTime}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span>📍</span><span>{event.location}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span>👤</span>
              <span>Hosted by <strong>{event.host_name}</strong></span>
            </div>
          </div>
        </div>

        {/* ── CONTRIBUTION AMOUNT (paid events only) ───────────────── */}
        {!isFree && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold tracking-widest uppercase text-amber-400 mb-1">
              Contribution
            </p>
            <p className="text-3xl font-extrabold text-amber-400">
              ₹{perPerson}
              <span className="text-base font-medium text-amber-400/60 ml-2">per person</span>
            </p>
            <p className="text-xs text-amber-400/70 mt-2">
              Total event cost ₹{event.total_cost} ÷ {event.capacity} players.
              Pay directly to host via UPI.
            </p>
          </div>
        )}

        {/* ── DESCRIPTION ──────────────────────────────────────────── */}
        {event.description && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/20 mb-3">
              About this event
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* ── CAPACITY BAR ─────────────────────────────────────────── */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/20">Spots</h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isFull ? "bg-red-400/10 text-red-400" : spotsLeft <= 5 ? "bg-orange-400/10 text-orange-400" : "bg-green-400/10 text-green-400"
            }`}>
              {isFull ? "Full" : `${spotsLeft} spots left`}
            </span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${isFull ? "bg-red-400" : "bg-amber-400"}`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
          <p className="text-xs text-white/20">{rsvpCount} of {event.capacity} players joined</p>
        </div>

        {/* ── ACTION BUTTONS ───────────────────────────────────────── */}
        <div className="mb-8 space-y-3">

          {/* Completed event — show "I Played" card to attendees */}
          {isCompleted && hasRSVPed && !isHost && (
            <SharePlayedCard
              eventId={event.id}
              userName={user?.user_metadata?.full_name ?? "Player"}
              eventTitle={event.title}
              sport={event.sport}
              siteUrl={siteUrl}
            />
          )}

          {/* Event completed badge */}
          {isCompleted && (
            <div className="w-full text-center bg-green-400/10 border border-green-400/20 text-green-400 font-semibold text-sm py-3.5 rounded-xl">
              ✓ This event has been completed
            </div>
          )}

          {/* Normal RSVP flow — only for upcoming events */}
          {!isCompleted && (
            <>
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

              {/* Waitlist — shown when event is full and user hasn't RSVPed */}
              {isFull && !hasRSVPed && !isHost && (
                <WaitlistButton
                  eventId={event.id}
                  userId={user?.id ?? null}
                  onWaitlist={onWaitlist}
                  waitlistPos={waitlistPos}
                />
              )}

              {/* Host: mark event as complete */}
              {isHost && (
                <CompleteEventButton eventId={event.id} />
              )}
            </>
          )}

          {/* Photos + Share */}
          <div className="flex gap-3">
            <Link
              href={`/events/${event.id}/photos`}
              className="flex-1 flex items-center justify-center gap-2 bg-white/[0.03] border border-white/5 hover:border-amber-400/30 text-white/70 rounded-xl py-3 text-sm font-bold transition-colors"
            >
              📷 Photos
            </Link>
            <div className="flex-1">
              <ShareButton
                eventId={event.id}
                eventTitle={event.title}
                eventUrl={`${siteUrl}/events/${event.id}`}
              />
            </div>
          </div>

          {/* Challenge friends — shown when user has RSVPed an upcoming event */}
          {hasRSVPed && !isCompleted && user && (
            <ChallengeFriend
              eventTitle={event.title}
              sport={event.sport}
              spotsLeft={spotsLeft}
              eventUrl={`${siteUrl}/events/${event.id}`}
              userName={user.user_metadata?.full_name ?? "A friend"}
            />
          )}
        </div>

        {/* ── ATTENDEES LIST ────────────────────────────────────────── */}
        {rsvpList.length > 0 && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/20 mb-4">
              Who&apos;s coming ({rsvpCount})
            </h2>
            <div className="space-y-3">
              {rsvpList.map((rsvp) => (
                <div key={rsvp.id} className="flex items-center justify-between">

                  {/* Left: avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 text-sm font-bold flex-shrink-0">
                      {rsvp.user_name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-sm text-white/70 font-medium">
                        {rsvp.user_name}
                        {user?.id === rsvp.user_id && (
                          <span className="text-white/20 font-normal ml-1">(you)</span>
                        )}
                      </span>
                      {/* Payment status label for non-free events */}
                      {!isFree && (
                        <p className={`text-xs mt-0.5 ${
                          rsvp.payment_status === "paid" ? "text-green-400" : "text-amber-400"
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
              <p className="text-xs text-white/15 mt-6 border-t border-white/5 pt-4">
                Tap &quot;Mark paid&quot; next to each player once you receive their payment.
              </p>
            )}
          </div>
        )}

        {/* ── WAITLIST ─────────────────────────────────────────────── */}
        {waitlistList.length > 0 && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mt-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/20 mb-4">
              Waitlist ({waitlistList.length})
            </h2>
            <div className="space-y-3">
              {waitlistList.map((w) => (
                <div key={w.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                      #{w.position}
                    </div>
                    <span className="text-sm text-white/60">
                      {w.user_name}
                      {user?.id === w.user_id && (
                        <span className="text-white/20 ml-1">(you)</span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-blue-400 font-medium">waiting</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
