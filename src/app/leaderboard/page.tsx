/**
 * FILE: src/app/leaderboard/page.tsx
 *
 * What this does:
 * The public leaderboard — the most show-off page on the platform.
 * Ranks USC members by games played. Gen Z will screenshot this.
 *
 * Sections:
 *   - Top Athletes (by total games played — all time)
 *   - Top Hosts (by events created)
 *   - Sport Breakdown (what USC plays most)
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSportEmoji }     from "@/lib/types";
import { achievementCount }  from "@/lib/achievements";
import Link from "next/link";
import NavLogo from "@/components/NavLogo";

export const revalidate = 60; // Recompute every 60 seconds

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  // ── Fetch RSVP counts per user ──────────────────────────────────────────
  const { data: rsvpRaw } = await admin
    .from("rsvps")
    .select("user_id, user_name, events(sport)");

  // ── Fetch host counts per user ──────────────────────────────────────────
  const { data: hostRaw } = await admin
    .from("events")
    .select("host_id, host_name, sport");

  // ── Fetch all profiles for role labels ─────────────────────────────────
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role");

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  // Build player stats map
  const playerMap: Record<string, {
    userId:       string;
    name:         string;
    gamesPlayed:  number;
    sportsPlayed: string[];
    role:         string;
  }> = {};

  for (const r of rsvpRaw ?? []) {
    if (!playerMap[r.user_id]) {
      playerMap[r.user_id] = {
        userId:       r.user_id,
        name:         r.user_name,
        gamesPlayed:  0,
        sportsPlayed: [],
        role:         profileMap.get(r.user_id)?.role ?? "member",
      };
    }
    playerMap[r.user_id].gamesPlayed++;
    const sport = (r.events as { sport?: string } | null)?.sport;
    if (sport) playerMap[r.user_id].sportsPlayed.push(sport);
  }

  // Build host stats map
  const hostMap: Record<string, {
    userId:      string;
    name:        string;
    eventsHosted: number;
    sportsHosted: string[];
    role:        string;
  }> = {};

  for (const e of hostRaw ?? []) {
    if (!hostMap[e.host_id]) {
      hostMap[e.host_id] = {
        userId:       e.host_id,
        name:         e.host_name,
        eventsHosted: 0,
        sportsHosted: [],
        role:         profileMap.get(e.host_id)?.role ?? "member",
      };
    }
    hostMap[e.host_id].eventsHosted++;
    if (e.sport) hostMap[e.host_id].sportsHosted.push(e.sport);
  }

  // This week's hottest players
  const lastWeekISO = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: weekRsvps } = await admin
    .from("rsvps")
    .select("user_id, user_name")
    .gte("created_at", lastWeekISO);

  const weekMap: Record<string, { id: string; name: string; count: number }> = {};
  for (const r of weekRsvps ?? []) {
    if (!weekMap[r.user_id]) weekMap[r.user_id] = { id: r.user_id, name: r.user_name, count: 0 };
    weekMap[r.user_id].count++;
  }
  const weekTop3 = Object.values(weekMap).sort((a, b) => b.count - a.count).slice(0, 3);

  // Sort players by games played
  const topPlayers = Object.values(playerMap)
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    .slice(0, 20);

  // Sort hosts by events hosted
  const topHosts = Object.values(hostMap)
    .sort((a, b) => b.eventsHosted - a.eventsHosted)
    .slice(0, 10);

  // Sport popularity
  const allSports: Record<string, number> = {};
  for (const r of rsvpRaw ?? []) {
    const sport = (r.events as { sport?: string } | null)?.sport ?? "Other";
    allSports[sport] = (allSports[sport] ?? 0) + 1;
  }
  const topSportsArr = Object.entries(allSports)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const totalGames  = (rsvpRaw ?? []).length;
  const totalEvents = Object.keys(hostMap).length > 0
    ? (hostRaw ?? []).length
    : 0;

  const RANK_MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <main className="min-h-screen bg-[#F9F7F4]" style={{ fontFamily: "var(--font-geist-sans)" }}>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <NavLogo />
        <div className="flex items-center gap-4">
          <Link href="/events" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Events</Link>
          {user && (
            <Link href={`/profile/${user.id}`} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              My Profile
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        {/* ── HEADER ───────────────────────────────────────────────── */}
        <div>
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full mb-4">
            Hall of Fame
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Leaderboard</h1>
          <p className="text-slate-500 text-sm">The top athletes of Udaipur Sports Club — all time.</p>
        </div>

        {/* ── PLATFORM STATS ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Games",   value: totalGames,              emoji: "🏅" },
            { label: "Total Events",  value: totalEvents,             emoji: "📅" },
            { label: "Athletes",      value: topPlayers.length,       emoji: "👥" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-stone-200 p-5 text-center">
              <p className="text-2xl mb-1">{s.emoji}</p>
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── THIS WEEK ────────────────────────────────────────────── */}
        {weekTop3.length > 0 && (
          <div className="bg-[#050A18] rounded-2xl border border-amber-400/20 overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-400/10 flex items-center gap-2">
              <span className="text-amber-400 text-sm">🔥</span>
              <h2 className="font-extrabold text-white text-sm">Hot This Week</h2>
            </div>
            <div className="divide-y divide-white/5">
              {weekTop3.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/profile/${p.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
                >
                  <span className="text-xl w-8 text-center flex-shrink-0">
                    {i === 0 ? "👑" : RANK_MEDALS[i]}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-white truncate">{p.name}</span>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-extrabold text-amber-400">{p.count}</span>
                    <span className="text-xs text-white/30 ml-1">this week</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── TOP ATHLETES ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100 bg-gradient-to-r from-amber-50 to-white">
            <h2 className="font-extrabold text-slate-900">Top Athletes</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ranked by total games played</p>
          </div>

          {topPlayers.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              No games played yet — be the first on the board!
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {topPlayers.map((player, i) => {
                const uniqueSports = new Set(player.sportsPlayed).size;
                const badges = achievementCount({
                  totalPlayed:  player.gamesPlayed,
                  totalHosted:  hostMap[player.userId]?.eventsHosted ?? 0,
                  sportsPlayed: player.sportsPlayed,
                  sportsHosted: hostMap[player.userId]?.sportsHosted ?? [],
                });
                const isMe = user?.id === player.userId;

                return (
                  <Link
                    key={player.userId}
                    href={`/profile/${player.userId}`}
                    className={`flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors ${isMe ? "bg-amber-50/50" : ""}`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center flex-shrink-0">
                      {i < 3
                        ? <span className="text-xl">{RANK_MEDALS[i]}</span>
                        : <span className="text-sm font-bold text-slate-400">#{i + 1}</span>
                      }
                    </div>

                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      player.role === "admin"  ? "bg-red-400"   :
                      player.role === "proxy"  ? "bg-blue-400"  :
                      player.role === "host"   ? "bg-amber-400" : "bg-slate-300"
                    }`}>
                      {player.name.charAt(0)}
                    </div>

                    {/* Name + sports */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {player.name}
                        </span>
                        {isMe && <span className="text-xs text-amber-500 font-semibold">you</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {uniqueSports} sport{uniqueSports !== 1 ? "s" : ""}
                        {badges > 0 && ` · ${badges} badge${badges !== 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {/* Games count */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-extrabold text-slate-900">{player.gamesPlayed}</p>
                      <p className="text-xs text-slate-400">games</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── TOP HOSTS ────────────────────────────────────────────── */}
        {topHosts.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100">
              <h2 className="font-extrabold text-slate-900">Top Hosts</h2>
              <p className="text-xs text-slate-400 mt-0.5">The people making USC happen</p>
            </div>
            <div className="divide-y divide-stone-100">
              {topHosts.map((host, i) => (
                <Link
                  key={host.userId}
                  href={`/profile/${host.userId}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 text-center flex-shrink-0">
                    {i < 3
                      ? <span className="text-xl">{RANK_MEDALS[i]}</span>
                      : <span className="text-sm font-bold text-slate-400">#{i + 1}</span>
                    }
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {host.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{host.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Set(host.sportsHosted).size} sport{new Set(host.sportsHosted).size !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-extrabold text-amber-500">{host.eventsHosted}</p>
                    <p className="text-xs text-slate-400">events</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── SPORT POPULARITY ─────────────────────────────────────── */}
        {topSportsArr.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="font-extrabold text-slate-900 mb-1">Most Played Sports</h2>
            <p className="text-xs text-slate-400 mb-5">What USC loves</p>
            <div className="space-y-4">
              {topSportsArr.map(([sport, count]) => {
                const pct = totalGames > 0 ? Math.round((count / totalGames) * 100) : 0;
                return (
                  <div key={sport}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-700">
                        {getSportEmoji(sport)} {sport}
                      </span>
                      <span className="text-xs text-slate-400">{count} games · {pct}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── WRAPPED CTA ──────────────────────────────────────────── */}
        {user && (
          <div className="bg-[#050A18] rounded-2xl border border-amber-400/20 p-6 text-center">
            <p className="text-amber-400 text-2xl mb-2">✨</p>
            <h3 className="text-white font-extrabold text-lg mb-1">See your USC Wrapped</h3>
            <p className="text-white/40 text-sm mb-5">Your personal sports story this week — shareable card included</p>
            <Link
              href={`/wrapped/${user.id}`}
              className="inline-block bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-8 py-3.5 rounded-full transition-all shadow-lg shadow-amber-500/30"
            >
              View my Wrapped →
            </Link>
          </div>
        )}

        {/* CTA */}
        <div className="text-center pb-4">
          <Link
            href="/events"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-8 py-3.5 rounded-full transition-colors"
          >
            Play to climb the board →
          </Link>
        </div>

      </div>
    </main>
  );
}
