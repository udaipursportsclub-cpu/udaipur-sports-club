/**
 * FILE: src/app/events/page.tsx
 *
 * The Events page — public list of all upcoming sports events.
 * Has a sport filter bar at the top so people can find their game fast.
 * Anyone can see this page, even without logging in.
 */

import { createClient }           from "@/lib/supabase/server";
import { getSportEmoji, type Event } from "@/lib/types";
import Link from "next/link";
import NavLogo from "@/components/NavLogo";
import { Suspense }               from "react";
import SportFilter                from "./sport-filter";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { sport?: string; tab?: string; q?: string };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const activeSport = searchParams.sport ?? "All";
  const activeTab   = searchParams.tab   ?? "upcoming";  // "upcoming" | "past"
  const searchQuery = searchParams.q     ?? "";

  // Build query
  let query = supabase
    .from("events")
    .select(`*, rsvps(count)`)
    .eq("status", activeTab === "past" ? "completed" : "upcoming")
    .order("date", { ascending: activeTab !== "past" });

  if (activeSport !== "All") query = query.eq("sport", activeSport);
  if (searchQuery.trim())    query = query.ilike("title", `%${searchQuery.trim()}%`);

  const { data: events, error } = await query;

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "long", year: "numeric",
    });
  }

  function formatTime(timeStr: string) {
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  return (
    <main className="min-h-screen bg-[#F9F7F4]" style={{ fontFamily: "var(--font-geist-sans)" }}>

      {/* ── TOP NAVIGATION ──────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <NavLogo />
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href={`/profile/${user.id}`} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                Profile
              </Link>
              <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                Dashboard
              </Link>
              <Link href="/events/new" className="text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-full transition-colors">
                + Create Event
              </Link>
            </>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-6">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full mb-5">
          Udaipur Sports Club
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Events</h1>

        {/* Search bar */}
        <form method="GET" className="mb-5">
          {activeSport !== "All" && <input type="hidden" name="sport" value={activeSport} />}
          {activeTab !== "upcoming" && <input type="hidden" name="tab" value={activeTab} />}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Search events by name..."
              className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
            />
          </div>
        </form>

        {/* Upcoming / Past tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: "upcoming", label: "Upcoming" },
            { key: "past",     label: "Past Events" },
          ].map((t) => (
            <a
              key={t.key}
              href={`/events?tab=${t.key}${activeSport !== "All" ? `&sport=${encodeURIComponent(activeSport)}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === t.key
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-stone-200 text-slate-500 hover:border-amber-300"
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>

        {/* Sport filter tabs */}
        <Suspense>
          <SportFilter activeSport={activeSport} />
        </Suspense>
      </div>

      {/* ── EVENTS GRID ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-20">

        {error && (
          <div className="text-center py-20 text-red-400 text-sm">
            Could not load events. Please refresh.
          </div>
        )}

        {/* Empty state */}
        {!error && (!events || events.length === 0) && (
          <div className="text-center py-24">
            <p className="text-5xl mb-6">
              {activeSport !== "All" ? getSportEmoji(activeSport) : "🏅"}
            </p>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              {activeSport !== "All"
                ? `No ${activeSport} events yet`
                : "No events yet"}
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              {activeSport !== "All"
                ? "Be the first to host one!"
                : "Be the first to create a sports event in Udaipur."}
            </p>
            {user ? (
              <Link href="/events/new" className="inline-block bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors">
                Create event
              </Link>
            ) : (
              <Link href="/login" className="inline-block bg-slate-900 hover:bg-slate-700 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors">
                Sign in to create
              </Link>
            )}
          </div>
        )}

        {/* Events grid */}
        {events && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {events.map((event: Event & { rsvps: { count: number }[] }) => {
              const rsvpCount = event.rsvps?.[0]?.count ?? 0;
              const spotsLeft = event.capacity - rsvpCount;
              const isFull    = spotsLeft <= 0;
              const isFree    = !event.total_cost || event.total_cost === 0;
              const perPerson = isFree ? 0 : Math.ceil((event.total_cost ?? 0) / event.capacity);

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all p-6 flex flex-col"
                >
                  {/* Sport */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{getSportEmoji(event.sport)}</span>
                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
                      {event.sport}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-extrabold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors leading-tight">
                    {event.title}
                  </h2>

                  {/* Details */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>📅</span><span>{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>⏰</span><span>{formatTime(event.time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>📍</span><span className="truncate">{event.location}</span>
                    </div>
                    {!isFree && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold">
                        <span>💰</span><span>₹{perPerson} per person</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1" />

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        isFull
                          ? "bg-red-50 text-red-500"
                          : spotsLeft <= 3
                          ? "bg-orange-50 text-orange-500"
                          : spotsLeft <= 5
                          ? "bg-amber-50 text-amber-600"
                          : "bg-green-50 text-green-600"
                      }`}>
                        {isFull ? "Full" : `${spotsLeft} spots left`}
                      </span>
                      {!isFull && spotsLeft <= 3 && (
                        <span className="text-xs font-bold text-orange-500 animate-pulse">
                          ⚡ Filling fast
                        </span>
                      )}
                    </div>
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
