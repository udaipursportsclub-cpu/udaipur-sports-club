/**
 * FILE: src/app/page.tsx  — Homepage
 *
 * The face of USC. Now fully live — real stats, real activity.
 * Designed to make a 22-year-old open it and immediately want to share it.
 *
 * Sections:
 *   1. Nav — USC wordmark + Login/Dashboard
 *   2. Hero — big, dark, cinematic
 *   3. Live stats strip — real member count, games played, events
 *   4. Recent activity feed — "Arjun just joined Cricket" (live)
 *   5. Sport pills — what USC plays
 *   6. Leaderboard preview — top 3 athletes
 *   7. Footer CTA
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient }      from "@/lib/supabase/server";
import { getSportEmoji }     from "@/lib/types";
import Link                  from "next/link";
import Image                 from "next/image";

export const revalidate = 30; // Refresh every 30 seconds

export default async function Home() {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  // ── Live platform stats ───────────────────────────────────────────────
  const [
    { count: memberCount },
    { count: eventCount  },
    { count: gameCount   },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("events").select("*", { count: "exact", head: true }),
    admin.from("rsvps").select("*", { count: "exact", head: true }),
  ]);

  // ── Recent activity (last 6 RSVPs) ────────────────────────────────────
  const { data: recentActivity } = await admin
    .from("rsvps")
    .select("user_name, created_at, events(title, sport)")
    .order("created_at", { ascending: false })
    .limit(5);

  // ── Top 3 players (leaderboard preview) ───────────────────────────────
  const { data: allRsvps } = await admin
    .from("rsvps")
    .select("user_id, user_name");

  const playerCounts: Record<string, { name: string; count: number }> = {};
  for (const r of allRsvps ?? []) {
    if (!playerCounts[r.user_id]) playerCounts[r.user_id] = { name: r.user_name, count: 0 };
    playerCounts[r.user_id].count++;
  }
  const top3 = Object.values(playerCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // ── Upcoming events preview ─────────────────────────────────────────
  const { data: upcomingEvents } = await admin
    .from("events")
    .select("id, title, sport, date, location")
    .eq("status", "upcoming")
    .order("date", { ascending: true })
    .limit(3);

  // ── Sport mix ──────────────────────────────────────────────────────────
  const { data: sportData } = await admin
    .from("events")
    .select("sport");

  const sportSet = new Set((sportData ?? []).map((e) => e.sport));
  const sports   = Array.from(sportSet).slice(0, 8);

  // ── Active today + this week's champion ───────────────────────────────
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const lastWeek  = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { data: todayRsvps },
    { data: weekRsvps  },
  ] = await Promise.all([
    admin.from("rsvps").select("user_id").gte("created_at", yesterday),
    admin.from("rsvps").select("user_id, user_name").gte("created_at", lastWeek),
  ]);

  const activeToday = new Set((todayRsvps ?? []).map((r) => r.user_id)).size;

  // Week champion — most RSVPs in last 7 days
  const weekCounts: Record<string, { name: string; count: number; id: string }> = {};
  for (const r of weekRsvps ?? []) {
    if (!weekCounts[r.user_id]) weekCounts[r.user_id] = { name: r.user_name, count: 0, id: r.user_id };
    weekCounts[r.user_id].count++;
  }
  const weekChampion = Object.values(weekCounts).sort((a, b) => b.count - a.count)[0] ?? null;

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 2)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <main className="min-h-screen bg-[#F9F7F4]" style={{ fontFamily: "var(--font-geist-sans)" }}>

      {/* ── NAV ────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/logo.svg" alt="USC" width={38} height={38} className="rounded-full" priority />
          <span className="text-sm font-black tracking-[0.15em] uppercase text-slate-900 hidden sm:block">USC</span>
        </Link>

        {/* Centre links — visible on desktop */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/events" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">Events</Link>
          <Link href="/leaderboard" className="text-xs font-semibold text-slate-500 hover:text-amber-500 transition-colors">Leaderboard</Link>
          <Link href="/members" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">Members</Link>
        </div>

        {/* Right — auth */}
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className="text-xs font-bold bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-full transition-colors">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors hidden sm:block">
                Sign in
              </Link>
              <Link href="/login" className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-full transition-colors">
                Join Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-[#050A18] text-white relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-8 py-20 md:py-28 relative">
          {/* Location */}
          <div className="flex items-center gap-2 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-amber-400">
              Udaipur, Rajasthan · Live
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-extrabold leading-none tracking-tight mb-4"
            style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}>
            <span className="text-white">Udaipur </span>
            <span className="text-amber-400">Sports</span>
            <br />
            <span className="text-white">Club</span>
          </h1>

          <p className="text-slate-400 text-lg mb-10 max-w-md leading-relaxed">
            The home for every sport in the City of Lakes.
            Play, compete, and build your legacy.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/events"
              className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-3.5 rounded-full transition-colors text-sm">
              Browse Events →
            </Link>
            <Link href="/leaderboard"
              className="border border-white/20 hover:border-amber-400 text-white font-semibold px-6 py-3.5 rounded-full transition-colors text-sm">
              🏆 Leaderboard
            </Link>
          </div>

          {/* Live stat badges */}
          <div className="flex flex-wrap gap-6 mt-12 pt-12 border-t border-white/10">
            {[
              { value: memberCount ?? 0,  label: "Athletes" },
              { value: eventCount ?? 0,   label: "Events Created" },
              { value: gameCount ?? 0,    label: "Games Played" },
            ].map((s) => (
              <div key={s.label}>
                <span className="text-2xl font-extrabold text-white">{s.value}</span>
                <span className="text-xs text-slate-400 ml-2 font-medium">{s.label}</span>
              </div>
            ))}
            {activeToday > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-2xl font-extrabold text-green-400">{activeToday}</span>
                <span className="text-xs text-slate-400 ml-1 font-medium">Active Today</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── THIS WEEK'S CHAMPION ─────────────────────────────────── */}
      {weekChampion && weekChampion.count > 0 && (
        <section className="max-w-5xl mx-auto px-6 pt-10">
          <Link
            href={`/profile/${weekChampion.id}`}
            className="flex items-center gap-4 bg-[#050A18] border border-amber-400/30 hover:border-amber-400/60 rounded-2xl px-6 py-5 transition-all group"
          >
            <span className="text-3xl flex-shrink-0">👑</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-400 mb-0.5">
                This Week&apos;s Champion
              </p>
              <p className="text-lg font-extrabold text-white truncate">
                {weekChampion.name}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-extrabold text-amber-400">{weekChampion.count}</p>
              <p className="text-xs text-white/40">games this week</p>
            </div>
            <span className="text-amber-400/40 group-hover:text-amber-400 transition-colors ml-2">→</span>
          </Link>
        </section>
      )}

      {/* ── ACTIVITY FEED + LEADERBOARD PREVIEW ──────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">Live Activity</h2>
          </div>
          {(!recentActivity || recentActivity.length === 0) ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">
              No activity yet — be the first to join an event!
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentActivity.map((a, i) => {
                const ev     = a.events as { title?: string; sport?: string } | null;
                const sport  = ev?.sport ?? "Other";
                return (
                  <div key={i} className="flex items-center gap-3 px-6 py-3.5">
                    <span className="text-xl flex-shrink-0">{getSportEmoji(sport)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700">
                        <strong>{a.user_name.split(" ")[0]}</strong> joined{" "}
                        <span className="text-slate-500 truncate">{ev?.title ?? sport}</span>
                      </p>
                    </div>
                    <span className="text-xs text-slate-300 flex-shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-6 py-3 border-t border-stone-100">
            <Link href="/events" className="text-xs font-semibold text-amber-500 hover:text-amber-400">
              Join an event →
            </Link>
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">Top Athletes</h2>
          </div>
          {top3.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">
              Leaderboard is empty — go play!
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {top3.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 px-6 py-4">
                  <span className="text-xl w-8 text-center">{MEDALS[i]}</span>
                  <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-sm">
                    {p.name.charAt(0)}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                  <span className="text-sm font-extrabold text-amber-500">{p.count}</span>
                </div>
              ))}
            </div>
          )}
          <div className="px-6 py-3 border-t border-stone-100">
            <Link href="/leaderboard" className="text-xs font-semibold text-amber-500 hover:text-amber-400">
              Full leaderboard →
            </Link>
          </div>
        </div>

      </section>

      {/* ── UPCOMING EVENTS PREVIEW ──────────────────────────────── */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">Happening Soon</h2>
            <Link href="/events" className="text-xs font-semibold text-amber-500 hover:text-amber-400">See all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="bg-white rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-sm transition-all p-5"
              >
                <span className="text-3xl mb-3 block">{getSportEmoji(ev.sport)}</span>
                <p className="text-sm font-bold text-slate-900 mb-1 leading-tight">{ev.title}</p>
                <p className="text-xs text-slate-400">{ev.location}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── SPORT PILLS ──────────────────────────────────────────── */}
      {sports.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">Sports on USC</p>
          <div className="flex flex-wrap gap-2">
            {sports.map((s) => (
              <Link
                key={s}
                href={`/events?sport=${encodeURIComponent(s)}`}
                className="flex items-center gap-1.5 bg-white border border-stone-200 hover:border-amber-300 hover:text-amber-600 text-slate-600 text-xs font-semibold px-4 py-2 rounded-full transition-all"
              >
                <span>{getSportEmoji(s)}</span>
                <span>{s}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER CTA ────────────────────────────────────────────── */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-extrabold text-slate-900">Ready to play?</p>
            <p className="text-sm text-slate-400">Join the fastest-growing sports community in Udaipur.</p>
          </div>
          <Link
            href={user ? "/events" : "/login"}
            className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-8 py-3.5 rounded-full transition-colors flex-shrink-0"
          >
            {user ? "Browse Events →" : "Join Free →"}
          </Link>
        </div>
      </section>

    </main>
  );
}
