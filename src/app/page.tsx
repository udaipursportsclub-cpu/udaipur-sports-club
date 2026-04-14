/**
 * FILE: src/app/page.tsx — Homepage
 *
 * The face of USC. Dark, cinematic, alive.
 * Designed to make a 22-year-old screenshot it and send to their friends.
 *
 * Think: CRED meets Dream11 meets Strava.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient }      from "@/lib/supabase/server";
import { getSportEmoji }     from "@/lib/types";
import Link                  from "next/link";

export const revalidate = 30;

export default async function Home() {
  const supabase = await createClient();
  const admin    = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { count: memberCount },
    { count: eventCount  },
    { count: gameCount   },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("events").select("*", { count: "exact", head: true }),
    admin.from("rsvps").select("*", { count: "exact", head: true }),
  ]);

  // Recent activity
  const { data: recentActivity } = await admin
    .from("rsvps")
    .select("user_name, created_at, events(title, sport)")
    .order("created_at", { ascending: false })
    .limit(8);

  // Top 5 players
  const { data: allRsvps } = await admin.from("rsvps").select("user_id, user_name");
  const playerCounts: Record<string, { name: string; count: number; id: string }> = {};
  for (const r of allRsvps ?? []) {
    if (!playerCounts[r.user_id]) playerCounts[r.user_id] = { name: r.user_name, count: 0, id: r.user_id };
    playerCounts[r.user_id].count++;
  }
  const top5 = Object.values(playerCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  // Upcoming events
  const { data: upcomingEvents } = await admin
    .from("events")
    .select("id, title, sport, date, time, location, capacity, host_name")
    .eq("status", "upcoming")
    .order("date", { ascending: true })
    .limit(4);

  // Upcoming RSVPs for spot counts
  const eventIds = (upcomingEvents ?? []).map(e => e.id);
  const eventRsvpCounts: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: rsvps } = await admin.from("rsvps").select("event_id").in("event_id", eventIds);
    for (const r of rsvps ?? []) {
      eventRsvpCounts[r.event_id] = (eventRsvpCounts[r.event_id] ?? 0) + 1;
    }
  }

  // Sports played
  const { data: sportData } = await admin.from("events").select("sport");
  const sportSet = new Set((sportData ?? []).map(e => e.sport));
  const sports = Array.from(sportSet).slice(0, 10);

  // Week champion
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: weekRsvps } = await admin.from("rsvps").select("user_id, user_name").gte("created_at", lastWeek);
  const weekCounts: Record<string, { name: string; count: number; id: string }> = {};
  for (const r of weekRsvps ?? []) {
    if (!weekCounts[r.user_id]) weekCounts[r.user_id] = { name: r.user_name, count: 0, id: r.user_id };
    weekCounts[r.user_id].count++;
  }
  const weekChampion = Object.values(weekCounts).sort((a, b) => b.count - a.count)[0] ?? null;

  // Active today
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const { data: todayRsvps } = await admin.from("rsvps").select("user_id").gte("created_at", yesterday);
  const activeToday = new Set((todayRsvps ?? []).map(r => r.user_id)).size;

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function getXP(games: number) { return games * 100; }
  function getLevel(games: number) {
    if (games >= 50) return { name: "Legend", color: "text-red-400", bg: "bg-red-400" };
    if (games >= 25) return { name: "Pro", color: "text-purple-400", bg: "bg-purple-400" };
    if (games >= 10) return { name: "Warrior", color: "text-amber-400", bg: "bg-amber-400" };
    if (games >= 5) return { name: "Rising", color: "text-blue-400", bg: "bg-blue-400" };
    return { name: "Rookie", color: "text-slate-400", bg: "bg-slate-400" };
  }

  const RANK_BADGES = ["👑", "⚡", "🔥", "💪", "🎯"];

  return (
    <main className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>

      {/* ── NAV ────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/events" className="text-xs font-semibold text-white/40 hover:text-white transition-colors">Events</Link>
          <Link href="/leaderboard" className="text-xs font-semibold text-white/40 hover:text-amber-400 transition-colors">Leaderboard</Link>
          <Link href="/photos" className="text-xs font-semibold text-white/40 hover:text-white transition-colors">Photos</Link>
          <Link href="/members" className="text-xs font-semibold text-white/40 hover:text-white transition-colors">Members</Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="text-xs font-bold bg-white text-black px-5 py-2.5 rounded-full hover:bg-amber-400 hover:text-black transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
              Join the Club
            </Link>
          )}
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Glows */}
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full bg-amber-500/8 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
        <div className="absolute top-[50%] left-[50%] w-[300px] h-[300px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-8 md:pt-24 md:pb-12 relative">
          {/* Live badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
            </span>
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-green-400">
              {activeToday > 0 ? `${activeToday} playing now` : "Udaipur, Rajasthan"}
            </span>
          </div>

          {/* Main heading */}
          <h1 className="font-black leading-[0.85] tracking-tight mb-6"
            style={{ fontSize: "clamp(3.5rem, 12vw, 8rem)" }}>
            <span className="text-white">Play.</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">Compete.</span>
            <br />
            <span className="text-white">Flex.</span>
          </h1>

          <p className="text-white/30 text-lg md:text-xl mb-10 max-w-lg leading-relaxed font-medium">
            Udaipur&apos;s first sports community.
            Every game counts. Every player ranked.
            Your city, your court, your legacy.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <Link href={user ? "/events" : "/login"}
              className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold px-8 py-4 rounded-full text-sm hover:shadow-lg hover:shadow-amber-500/25 transition-all">
              {user ? "Find a Game" : "Join Free"} →
            </Link>
            <Link href="/leaderboard"
              className="border border-white/10 hover:border-amber-400/50 text-white font-bold px-7 py-4 rounded-full text-sm transition-all hover:bg-white/5">
              See Rankings
            </Link>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-8 mt-16 pt-8 border-t border-white/5">
            {[
              { value: memberCount ?? 0, label: "Athletes", icon: "👥" },
              { value: eventCount ?? 0,  label: "Events", icon: "🏟️" },
              { value: gameCount ?? 0,   label: "Games Played", icon: "🔥" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/20">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WEEK CHAMPION ──────────────────────────────────────── */}
      {weekChampion && weekChampion.count > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-8">
          <Link
            href={`/profile/${weekChampion.id}`}
            className="block relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-400/10 via-transparent to-orange-400/10 p-6 md:p-8 hover:border-amber-400/40 transition-all group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl flex-shrink-0">
                👑
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-400/60 mb-1">Champion of the Week</p>
                <p className="text-xl md:text-2xl font-black text-white">{weekChampion.name}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-amber-400">{weekChampion.count}</p>
                <p className="text-[10px] font-bold tracking-wider uppercase text-white/20">games</p>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ── UPCOMING EVENTS — ticket style ───────────────────────── */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30">Upcoming Games</h2>
            <Link href="/events" className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingEvents.map(ev => {
              const rsvpCount = eventRsvpCounts[ev.id] ?? 0;
              const spotsLeft = ev.capacity - rsvpCount;
              const fillPct = Math.min((rsvpCount / ev.capacity) * 100, 100);
              const formattedDate = new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
              const [hours, minutes] = ev.time.split(":");
              const td = new Date(); td.setHours(parseInt(hours), parseInt(minutes));
              const formattedTime = td.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all p-5"
                >
                  {/* Fill bar background */}
                  <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${fillPct}%` }} />

                  <div className="flex items-start gap-4">
                    {/* Sport emoji */}
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl flex-shrink-0">
                      {getSportEmoji(ev.sport)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                        {ev.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-white/30">{formattedDate} · {formattedTime}</span>
                        <span className="text-xs text-white/20">·</span>
                        <span className="text-xs text-white/30">{ev.location}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-bold text-white/20">{ev.host_name}</span>
                        {spotsLeft <= 3 && spotsLeft > 0 && (
                          <span className="text-[10px] font-bold text-red-400 animate-pulse">
                            {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                          </span>
                        )}
                        {spotsLeft <= 0 && (
                          <span className="text-[10px] font-bold text-white/20">Full — waitlist open</span>
                        )}
                      </div>
                    </div>

                    {/* Spots indicator */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-white">{rsvpCount}</p>
                      <p className="text-[10px] text-white/20">/{ev.capacity}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── LIVE FEED + RANKINGS — side by side ──────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-5 gap-6">

        {/* Live Feed — 3 cols */}
        <div className="md:col-span-3 rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30">Live Feed</h2>
          </div>
          {(!recentActivity || recentActivity.length === 0) ? (
            <div className="px-5 py-12 text-center">
              <p className="text-white/20 text-sm">No activity yet — be the first to make a move</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentActivity.map((a, i) => {
                const ev = a.events as { title?: string; sport?: string } | null;
                const sport = ev?.sport ?? "Other";
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm flex-shrink-0">
                      {getSportEmoji(sport)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60">
                        <span className="font-bold text-white/90">{a.user_name.split(" ")[0]}</span>
                        {" "}joined{" "}
                        <span className="text-amber-400/70">{ev?.title ?? sport}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-white/15 flex-shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rankings — 2 cols */}
        <div className="md:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/30">Top Players</h2>
          </div>
          {top5.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-white/20 text-sm">Leaderboard is empty — go play!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {top5.map((p, i) => {
                const level = getLevel(p.count);
                return (
                  <Link key={p.id} href={`/profile/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className="text-lg w-6 text-center">{RANK_BADGES[i]}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white/80 truncate">{p.name}</p>
                      <p className={`text-[10px] font-bold ${level.color}`}>{level.name} · {getXP(p.count)} XP</p>
                    </div>
                    <span className="text-sm font-black text-white/40">{p.count}</span>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="px-5 py-3 border-t border-white/5">
            <Link href="/leaderboard" className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
              Full rankings →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SPORTS WE PLAY ────────────────────────────────────────── */}
      {sports.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-12">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/20 mb-4">Sports on USC</p>
          <div className="flex flex-wrap gap-2">
            {sports.map(s => (
              <Link
                key={s}
                href={`/events?sport=${encodeURIComponent(s)}`}
                className="flex items-center gap-2 bg-white/[0.03] border border-white/5 hover:border-amber-400/30 hover:bg-amber-400/5 text-white/50 hover:text-amber-400 text-xs font-bold px-4 py-2.5 rounded-full transition-all"
              >
                <span>{getSportEmoji(s)}</span>
                <span>{s}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── BOTTOM CTA ────────────────────────────────────────────── */}
      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/20 mb-4">Ready?</p>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-3">
            Your city. Your game. Your{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">legacy.</span>
          </h2>
          <p className="text-white/30 text-sm mb-8 max-w-md mx-auto">
            Join Udaipur&apos;s fastest-growing sports community. Every game earns XP. Every player gets ranked.
          </p>
          <Link
            href={user ? "/events" : "/login"}
            className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm px-10 py-4 rounded-full hover:shadow-lg hover:shadow-amber-500/25 transition-all"
          >
            {user ? "Find a Game →" : "Join the Club →"}
          </Link>
        </div>
      </section>

    </main>
  );
}
