/**
 * FILE: src/app/events/page.tsx
 *
 * Events page — dark theme, ticket-style cards.
 * Find your next game. Filter by sport. Search by name.
 */

import { createClient }              from "@/lib/supabase/server";
import { getSportEmoji, type Event } from "@/lib/types";
import { maskName }                  from "@/lib/privacy";
import Link       from "next/link";
import { Suspense } from "react";
import SportFilter  from "./sport-filter";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { sport?: string; tab?: string; q?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const activeSport = searchParams.sport ?? "All";
  const activeTab   = searchParams.tab   ?? "upcoming";
  const searchQuery = searchParams.q     ?? "";

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
      weekday: "short", day: "numeric", month: "short",
    });
  }
  function formatTime(timeStr: string) {
    const [hours, minutes] = timeStr.split(":");
    const d = new Date(); d.setHours(parseInt(hours), parseInt(minutes));
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  return (
    <main className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="text-xs font-semibold text-white/40 hover:text-white transition-colors">Dashboard</Link>
              <Link href="/events/new" className="text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
                + Create
              </Link>
            </>
          ) : (
            <Link href="/login" className="text-xs font-bold bg-white text-black px-5 py-2.5 rounded-full hover:bg-amber-400 transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-6">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-6">
          {activeTab === "past" ? "Past Games" : "Find a Game"}
        </h1>

        {/* Search */}
        <form method="GET" className="mb-5">
          {activeSport !== "All" && <input type="hidden" name="sport" value={activeSport} />}
          {activeTab !== "upcoming" && <input type="hidden" name="tab" value={activeTab} />}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Search events..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.05] transition"
            />
          </div>
        </form>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: "upcoming", label: "Upcoming" },
            { key: "past",     label: "Past" },
          ].map(t => (
            <a
              key={t.key}
              href={`/events?tab=${t.key}${activeSport !== "All" ? `&sport=${encodeURIComponent(activeSport)}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === t.key
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>

        <Suspense>
          <SportFilter activeSport={activeSport} />
        </Suspense>
      </div>

      {/* Events Grid */}
      <div className="max-w-5xl mx-auto px-6 pb-20">

        {error && (
          <div className="text-center py-20 text-red-400 text-sm">Could not load events.</div>
        )}

        {!error && (!events || events.length === 0) && (
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">{activeSport !== "All" ? getSportEmoji(activeSport) : "🏟️"}</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              {activeSport !== "All" ? `No ${activeSport} games yet` : "No games on the board"}
            </h2>
            <p className="text-white/40 text-sm mb-2 max-w-sm mx-auto">
              {activeSport !== "All"
                ? `Be the legend who kicks off ${activeSport} in Udaipur.`
                : "The court is empty. The field is waiting. Someone has to go first."}
            </p>
            <p className="text-white/25 text-xs mb-8">It takes 30 seconds to create a game.</p>
            <Link
              href={user ? "/events/new" : "/login"}
              className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm px-8 py-3.5 rounded-full hover:shadow-lg hover:shadow-amber-500/25 transition-all"
            >
              {user ? "Create a Game" : "Sign in to create"}
            </Link>
          </div>
        )}

        {events && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {events.map((event: Event & { rsvps: { count: number }[] }) => {
              const rsvpCount = event.rsvps?.[0]?.count ?? 0;
              const spotsLeft = event.capacity - rsvpCount;
              const isFull    = spotsLeft <= 0;
              const isFree    = !event.total_cost || event.total_cost === 0;
              const perPerson = isFree ? 0 : Math.ceil((event.total_cost ?? 0) / event.capacity);
              const fillPct   = Math.min((rsvpCount / event.capacity) * 100, 100);

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all p-5 flex flex-col"
                >
                  {/* Fill indicator */}
                  <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${fillPct}%` }} />

                  {/* Sport + badges */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/10 flex items-center justify-center text-2xl">
                        {getSportEmoji(event.sport)}
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">
                        {event.sport}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isFree && (
                        <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
                          Free
                        </span>
                      )}
                      {!isFull && spotsLeft <= 3 && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full animate-pulse">
                          {spotsLeft} left
                        </span>
                      )}
                      {isFull && (
                        <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-1 rounded-full">
                          Waitlist
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors leading-tight mb-3">
                    {event.title}
                  </h2>

                  {/* Price — prominent for paid events */}
                  {!isFree && (
                    <p className="text-lg font-black text-amber-400 mb-2">
                      ₹{perPerson}<span className="text-xs font-bold text-white/40">/person</span>
                    </p>
                  )}

                  {/* Details */}
                  <div className="space-y-1.5 mb-4">
                    <p className="text-xs text-white/50">
                      {formatDate(event.date)} · {formatTime(event.time)}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {event.location}
                    </p>
                  </div>

                  <div className="flex-1" />

                  {/* RSVP bar + social proof */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white/50">{rsvpCount} joined</span>
                      <span className="text-xs text-white/30">{rsvpCount}/{event.capacity}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>

                  {/* Bottom */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[10px] font-bold text-white/30">{maskName(event.host_name)}</span>
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
