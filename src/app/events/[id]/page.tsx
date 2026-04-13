/**
 * FILE: src/app/events/[id]/page.tsx
 *
 * What this does:
 * This is the individual event page — the page you see when you click
 * on a specific event from the events list.
 *
 * It shows:
 * - Event title, sport, date, time, location
 * - Description (if any)
 * - How many spots are left (with a visual progress bar)
 * - List of people who have RSVPed
 * - An RSVP button (or Cancel RSVP if already signed up)
 *
 * [id] in the filename means it's dynamic — the URL could be
 * /events/abc123 or /events/xyz789 and this page handles both.
 */

import { createClient } from "@/lib/supabase/server";
import { getSportEmoji } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import RSVPButton from "./rsvp-button";

export default async function EventPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // Check who's logged in (if anyone)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the event details from the database
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.id)
    .single();

  // If the event doesn't exist, show a 404 page
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

  // Check if the logged-in user has already RSVPed
  const hasRSVPed = user
    ? rsvpList.some((r) => r.user_id === user.id)
    : false;

  // Format date nicely — e.g. "Thu, 1 May 2025"
  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Format time — e.g. "7:00 AM"
  const [hours, minutes] = event.time.split(":");
  const timeDate = new Date();
  timeDate.setHours(parseInt(hours), parseInt(minutes));
  const formattedTime = timeDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <main
      className="min-h-screen bg-[#F9F7F4]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── TOP NAVIGATION ──────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <Link
          href="/"
          className="text-sm font-bold tracking-[0.25em] uppercase text-slate-900 hover:text-amber-500 transition-colors"
        >
          USC
        </Link>
        <Link
          href="/events"
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          ← All Events
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* ── EVENT HEADER ────────────────────────────────────────────── */}
        <div className="mb-8">

          {/* Sport badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{getSportEmoji(event.sport)}</span>
            <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
              {event.sport}
            </span>
          </div>

          {/* Event title */}
          <h1 className="text-3xl font-extrabold text-slate-900 mb-6 leading-tight">
            {event.title}
          </h1>

          {/* Event details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="text-lg">📅</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="text-lg">⏰</span>
              <span>{formattedTime}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="text-lg">📍</span>
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="text-lg">👤</span>
              <span>Hosted by <strong>{event.host_name}</strong></span>
            </div>
          </div>
        </div>

        {/* ── DESCRIPTION ─────────────────────────────────────────────── */}
        {event.description && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">
              About this event
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {/* ── CAPACITY ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">
              Spots
            </h2>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                isFull
                  ? "bg-red-50 text-red-500"
                  : spotsLeft <= 5
                  ? "bg-orange-50 text-orange-500"
                  : "bg-green-50 text-green-600"
              }`}
            >
              {isFull ? "Full" : `${spotsLeft} spots left`}
            </span>
          </div>

          {/* Progress bar — shows how full the event is */}
          <div className="w-full bg-stone-100 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isFull ? "bg-red-400" : "bg-amber-400"
              }`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            {rsvpCount} of {event.capacity} players joined
          </p>
        </div>

        {/* ── RSVP BUTTON ─────────────────────────────────────────────── */}
        <div className="mb-8">
          <RSVPButton
            eventId={event.id}
            userId={user?.id ?? null}
            userName={user?.user_metadata?.full_name ?? ""}
            userEmail={user?.email ?? ""}
            hasRSVPed={hasRSVPed}
            isFull={isFull}
          />
        </div>

        {/* ── ATTENDEES LIST ───────────────────────────────────────────── */}
        {rsvpList.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
              Who&apos;s coming ({rsvpCount})
            </h2>
            <div className="space-y-3">
              {rsvpList.map((rsvp, index) => (
                <div key={rsvp.id} className="flex items-center gap-3">
                  {/* Avatar circle with first letter of name */}
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm font-bold flex-shrink-0">
                    {rsvp.user_name.charAt(0)}
                  </div>
                  <span className="text-sm text-slate-700">
                    {rsvp.user_name}
                    {/* Show "(you)" next to the logged-in user's name */}
                    {user?.id === rsvp.user_id && (
                      <span className="text-slate-400 ml-1">(you)</span>
                    )}
                  </span>
                  {/* Show a star next to the first person (the host) */}
                  {index === 0 && event.host_id === rsvp.user_id && (
                    <span className="text-xs text-amber-500 font-semibold">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
