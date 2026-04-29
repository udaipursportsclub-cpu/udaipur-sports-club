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
import { maskName }          from "@/lib/privacy";
import Link                  from "next/link";
import AppSwitcher           from "@/components/AppSwitcher";
import HeroSlideshow         from "@/components/HeroSlideshow";

export const revalidate = 30;

export default async function Home() {
  const supabase = await createClient();
  const admin    = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { count: memberCount },
    { count: eventCount  },
    { count: gameCount   },
    { data: heroSlides   },
    { data: heroConfig   },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("events").select("*", { count: "exact", head: true }),
    admin.from("rsvps").select("*", { count: "exact", head: true }),
    admin.from("hero_slides").select("id, image_url").eq("active", true).order("display_order", { ascending: true }),
    admin.from("hero_config").select("rotation_seconds").eq("id", 1).single(),
  ]);

  // Fire all independent queries in parallel
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  const [
    { data: recentActivity },
    { data: allRsvps },
    { data: upcomingEvents },
    { data: sportData },
    { data: weekRsvps },
    { data: todayRsvps },
  ] = await Promise.all([
    admin.from("rsvps").select("user_name, created_at, events(title, sport)").order("created_at", { ascending: false }).limit(8),
    admin.from("rsvps").select("user_id, user_name"),
    admin.from("events").select("id, title, sport, date, time, location, capacity, host_name, total_cost").eq("status", "upcoming").order("date", { ascending: true }).limit(4),
    admin.from("events").select("sport"),
    admin.from("rsvps").select("user_id, user_name").gte("created_at", lastWeek),
    admin.from("rsvps").select("user_id").gte("created_at", yesterday),
  ]);

  // Top 5 players
  const playerCounts: Record<string, { name: string; count: number; id: string }> = {};
  for (const r of allRsvps ?? []) {
    if (!playerCounts[r.user_id]) playerCounts[r.user_id] = { name: r.user_name, count: 0, id: r.user_id };
    playerCounts[r.user_id].count++;
  }
  const top5 = Object.values(playerCounts).sort((a, b) => b.count - a.count).slice(0, 5);

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
  const sportSet = new Set((sportData ?? []).map(e => e.sport));
  const sports = Array.from(sportSet).slice(0, 10);

  // Week champion
  const weekCounts: Record<string, { name: string; count: number; id: string }> = {};
  for (const r of weekRsvps ?? []) {
    if (!weekCounts[r.user_id]) weekCounts[r.user_id] = { name: r.user_name, count: 0, id: r.user_id };
    weekCounts[r.user_id].count++;
  }
  const weekChampion = Object.values(weekCounts).sort((a, b) => b.count - a.count)[0] ?? null;

  // Active today
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
          {user && <AppSwitcher />}
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
      <HeroSlideshow
        slides={heroSlides ?? []}
        rotationSeconds={heroConfig?.rotation_seconds ?? 5}
      >
        {/* Ambient glows — only visible when no photo */}
        {(!heroSlides || heroSlides.length === 0) && <>
          <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full bg-amber-500/8 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
        </>}

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16">
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

          <p className="text-white/60 text-lg md:text-xl mb-10 max-w-lg leading-relaxed font-medium">
            Udaipur&apos;s first sports community.
            Every game counts. Every player ranked.
            Your city, your court, your legacy.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            {user ? (
              <>
                <Link href="/events"
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold px-8 py-4 rounded-full text-sm hover:shadow-lg hover:shadow-amber-500/25 transition-all">
                  Find a Game →
                </Link>
                <Link href="/leaderboard"
                  className="border border-white/20 hover:border-amber-400/50 text-white font-bold px-7 py-4 rounded-full text-sm transition-all hover:bg-white/10">
                  See Rankings
                </Link>
              </>
            ) : (
              <>
                <Link href="/login"
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold px-8 py-4 rounded-full text-sm hover:shadow-lg hover:shadow-amber-500/25 transition-all">
                  Login →
                </Link>
                <Link href="/login"
                  className="border border-white/20 hover:border-amber-400/50 text-white font-bold px-7 py-4 rounded-full text-sm transition-all hover:bg-white/10">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-10 mt-16 pt-8 border-t border-white/10">
            {[
              { value: Math.max(memberCount ?? 0, 100), label: "Athletes" },
              { value: Math.max(eventCount ?? 0, 40),   label: "Events" },
              { value: Math.max(gameCount ?? 0, 30),    label: "Games Played" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-3xl font-black text-white">{s.value}+</p>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </HeroSlideshow>

      {/* ── Sections below hero: only for logged-in users ────── */}
      {user && (<>

      {/* ── NEXT GAME — featured event ────────────────────────── */}
      {upcomingEvents && upcomingEvents.length > 0 && (() => {
        const next = upcomingEvents[0];
        const nextRsvps = eventRsvpCounts[next.id] ?? 0;
        const nextSpotsLeft = next.capacity - nextRsvps;
        const nextIsFree = !next.total_cost || next.total_cost === 0;
        const nextPerPerson = nextIsFree ? 0 : Math.ceil((next.total_cost ?? 0) / next.capacity);
        const nextDate = new Date(next.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        const [nh, nm] = next.time.split(":");
        const ntd = new Date(); ntd.setHours(parseInt(nh), parseInt(nm));
        const nextTime = ntd.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
        return (
          <section className="max-w-6xl mx-auto px-6 pt-10 pb-4">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-400/60 mb-3">Next Game</p>
            <Link
              href={`/events/${next.id}`}
              className="block relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-amber-400/30 transition-all group"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
              <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
                {/* Sport emoji */}
                <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-3xl flex-shrink-0">
                  {getSportEmoji(next.sport)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-amber-400 transition-colors mb-2">
                    {next.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
                    <span>{nextDate} · {nextTime}</span>
                    <span>{next.location}</span>
                  </div>
                  {nextSpotsLeft > 0 && nextSpotsLeft <= 5 && (
                    <p className="text-xs font-bold text-red-400 mt-2 animate-pulse">
                      Only {nextSpotsLeft} spot{nextSpotsLeft !== 1 ? "s" : ""} left
                    </p>
                  )}
                  {nextSpotsLeft <= 0 && (
                    <p className="text-xs font-bold text-white/40 mt-2">Full — waitlist open</p>
                  )}
                </div>

                {/* Price + CTA */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {nextIsFree ? (
                    <span className="text-xs font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-full">Free</span>
                  ) : (
                    <span className="text-xl font-black text-amber-400">₹{nextPerPerson}<span className="text-xs font-bold text-white/40">/person</span></span>
                  )}
                  <span className="text-xs font-bold text-white/40">{nextRsvps}/{next.capacity} joined</span>
                  <span className="mt-1 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-xs px-5 py-2.5 rounded-full group-hover:shadow-lg group-hover:shadow-amber-500/25 transition-all">
                    Book Now →
                  </span>
                </div>
              </div>
            </Link>
          </section>
        );
      })()}

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
                <p className="text-xl md:text-2xl font-black text-white">{maskName(weekChampion.name)}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-amber-400">{weekChampion.count}</p>
                <p className="text-[10px] font-bold tracking-wider uppercase text-white/40">games</p>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ── UPCOMING EVENTS — ticket style ───────────────────────── */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/50">Upcoming Games</h2>
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
                        <span className="text-xs text-white/50">{formattedDate} · {formattedTime}</span>
                        <span className="text-xs text-white/40">·</span>
                        <span className="text-xs text-white/50">{ev.location}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-bold text-white/40">{maskName(ev.host_name)}</span>
                        {spotsLeft <= 3 && spotsLeft > 0 && (
                          <span className="text-[10px] font-bold text-red-400 animate-pulse">
                            {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                          </span>
                        )}
                        {spotsLeft <= 0 && (
                          <span className="text-[10px] font-bold text-white/40">Full — waitlist open</span>
                        )}
                      </div>
                    </div>

                    {/* Spots indicator */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-white">{rsvpCount}</p>
                      <p className="text-[10px] text-white/40">/{ev.capacity}</p>
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
            <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/50">Live Feed</h2>
          </div>
          {(!recentActivity || recentActivity.length === 0) ? (
            <div className="px-5 py-12 text-center">
              <p className="text-white/40 text-sm">No activity yet — be the first to make a move</p>
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
                        <span className="font-bold text-white/90">{maskName(a.user_name).split(" ")[0]}</span>
                        {" "}joined{" "}
                        <span className="text-amber-400/70">{ev?.title ?? sport}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-white/30 flex-shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rankings — 2 cols */}
        <div className="md:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/50">Top Players</h2>
          </div>
          {top5.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-white/40 text-sm">Leaderboard is empty — go play!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {top5.map((p, i) => {
                const level = getLevel(p.count);
                return (
                  <Link key={p.id} href={`/profile/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className="text-lg w-6 text-center">{RANK_BADGES[i]}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {maskName(p.name).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white/80 truncate">{maskName(p.name)}</p>
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
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/40 mb-4">Sports on USC</p>
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

      </>)}

      {/* ── BOTTOM CTA ────────────────────────────────────────────── */}
      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/40 mb-4">Ready?</p>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-3">
            Your city. Your game. Your{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">legacy.</span>
          </h2>
          <p className="text-white/50 text-sm mb-8 max-w-md mx-auto">
            Join {Math.max(memberCount ?? 0, 100)}+ athletes already playing on Udaipur&apos;s sports platform. Every game earns XP. Every player gets ranked.
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
