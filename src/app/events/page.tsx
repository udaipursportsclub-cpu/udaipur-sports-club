/**
 * FILE: src/app/events/page.tsx
 *
 * What this does:
 * This is the Events page — the public list of all upcoming sports events.
 * Anyone can see this page, even without logging in.
 * Logged-in users also see a "Create Event" button at the top.
 *
 * It fetches all upcoming events from Supabase and displays them as cards.
 */

import { createClient } from "@/lib/supabase/server";
import { getSportEmoji, type Event } from "@/lib/types";
import Link from "next/link";

export default async function EventsPage() {
  const supabase = await createClient();

  // Check if someone is logged in (to decide whether to show "Create Event")
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all upcoming events from the database, newest first
  // Also count how many RSVPs each event has
  const { data: events, error } = await supabase
    .from("events")
    .select(`*, rsvps(count)`)
    .eq("status", "upcoming")
    .order("date", { ascending: true });

  // Format the date nicely — e.g. "2025-05-01" → "Thu, 1 May 2025"
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // Format time — e.g. "07:00:00" → "7:00 AM"
  function formatTime(timeStr: string) {
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

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

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Logged-in: show Dashboard link + Create Event button */}
              <Link
                href="/dashboard"
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/events/new"
                className="text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-full transition-colors"
              >
                + Create Event
              </Link>
            </>
          ) : (
            /* Not logged in: show Sign In link */
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-14 pb-8">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full mb-6">
          Udaipur Sports Club
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
          Upcoming Events
        </h1>
        <p className="text-slate-500">
          Find a sport, show up, play.
        </p>
      </div>

      {/* ── EVENTS GRID ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-20">

        {/* Error state */}
        {error && (
          <div className="text-center py-20 text-red-400 text-sm">
            Could not load events. Please refresh the page.
          </div>
        )}

        {/* Empty state — no events yet */}
        {!error && (!events || events.length === 0) && (
          <div className="text-center py-24">
            <p className="text-5xl mb-6">🏅</p>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              No events yet
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              Be the first to create a sports event in Udaipur.
            </p>
            {user ? (
              <Link
                href="/events/new"
                className="inline-block bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors"
              >
                Create the first event
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-block bg-slate-900 hover:bg-slate-700 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors"
              >
                Sign in to create an event
              </Link>
            )}
          </div>
        )}

        {/* Events grid */}
        {events && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event: Event & { rsvps: { count: number }[] }) => {
              // How many spots are left
              const rsvpCount = event.rsvps?.[0]?.count ?? 0;
              const spotsLeft = event.capacity - rsvpCount;
              const isFull = spotsLeft <= 0;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all p-6 flex flex-col"
                >
                  {/* Sport emoji + sport name */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">
                      {getSportEmoji(event.sport)}
                    </span>
                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
                      {event.sport}
                    </span>
                  </div>

                  {/* Event title */}
                  <h2 className="text-lg font-extrabold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors leading-tight">
                    {event.title}
                  </h2>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                    <span>📅</span>
                    <span>{formatDate(event.date)}</span>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                    <span>⏰</span>
                    <span>{formatTime(event.time)}</span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <span>📍</span>
                    <span className="truncate">{event.location}</span>
                  </div>

                  {/* Spacer — pushes the bottom section down */}
                  <div className="flex-1" />

                  {/* Bottom row: spots left + host */}
                  <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                    {/* Spots left pill */}
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        isFull
                          ? "bg-red-50 text-red-500"
                          : spotsLeft <= 5
                          ? "bg-orange-50 text-orange-500"
                          : "bg-green-50 text-green-600"
                      }`}
                    >
                      {isFull ? "Full" : `${spotsLeft} spots left`}
                    </span>

                    {/* Host name */}
                    <span className="text-xs text-slate-400 truncate ml-2">
                      by {event.host_name.split(" ")[0]}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
