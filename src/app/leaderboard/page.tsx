/**
 * FILE: src/app/leaderboard/page.tsx
 *
 * Gaming-style leaderboard. Dark. Glowing. Tournament vibes.
 * XP system, level badges, tier colors. Screenshot-worthy.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSportEmoji }     from "@/lib/types";
import { getXP, getPlayerLevel, getNextLevel } from "@/lib/xp";
import { maskName }          from "@/lib/privacy";
import Link from "next/link";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const admin    = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fire all independent queries in parallel
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { data: rsvpRaw },
    { data: hostRaw },
    { data: optedInProfiles },
    { data: weekRsvps },
  ] = await Promise.all([
    admin.from("rsvps").select("user_id, user_name, events(sport)"),
    admin.from("events").select("host_id, host_name, sport"),
    admin.from("profiles").select("id").eq("show_on_leaderboard", true),
    admin.from("rsvps").select("user_id, user_name").gte("created_at", lastWeek),
  ]);

  const optedInIds = new Set((optedInProfiles ?? []).map(p => p.id));

  // Build player stats
  const playerMap: Record<string, { id: string; name: string; games: number; hosted: number; sports: string[] }> = {};
  for (const r of rsvpRaw ?? []) {
    if (!playerMap[r.user_id]) playerMap[r.user_id] = { id: r.user_id, name: r.user_name, games: 0, hosted: 0, sports: [] };
    playerMap[r.user_id].games++;
    const sport = (r.events as { sport?: string } | null)?.sport;
    if (sport) playerMap[r.user_id].sports.push(sport);
  }
  for (const e of hostRaw ?? []) {
    if (!playerMap[e.host_id]) playerMap[e.host_id] = { id: e.host_id, name: e.host_name, games: 0, hosted: 0, sports: [] };
    playerMap[e.host_id].hosted++;
  }

  const allPlayers = Object.values(playerMap)
    .map(p => ({ ...p, xp: getXP(p.games, p.hosted), level: getPlayerLevel(getXP(p.games, p.hosted)) }))
    .sort((a, b) => b.xp - a.xp);

  // Filter to only opted-in players (always include the viewer's own row)
  const players = allPlayers.filter(p => optedInIds.has(p.id) || (user && p.id === user.id));

  // This week's hot players
  const weekMap: Record<string, { id: string; name: string; count: number }> = {};
  for (const r of weekRsvps ?? []) {
    if (!weekMap[r.user_id]) weekMap[r.user_id] = { id: r.user_id, name: r.user_name, count: 0 };
    weekMap[r.user_id].count++;
  }
  const weekTop = Object.values(weekMap).sort((a, b) => b.count - a.count).slice(0, 5);

  // Sport stats
  const sportCounts: Record<string, number> = {};
  for (const r of rsvpRaw ?? []) {
    const sport = (r.events as { sport?: string } | null)?.sport ?? "Other";
    sportCounts[sport] = (sportCounts[sport] ?? 0) + 1;
  }
  const topSports = Object.entries(sportCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalGames = (rsvpRaw ?? []).length;

  // My rank
  const myRank = user ? players.findIndex(p => p.id === user.id) + 1 : 0;
  const myPlayer = user ? players.find(p => p.id === user.id) : null;
  const myNext = myPlayer ? getNextLevel(myPlayer.xp) : null;

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
          <Link href="/events" className="text-xs font-semibold text-white/40 hover:text-white transition-colors">Events</Link>
          {user && (
            <Link href={`/profile/${user.id}`} className="text-xs font-semibold text-white/40 hover:text-white transition-colors">Profile</Link>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        {/* Header */}
        <div className="text-center">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-400/60 mb-3">Hall of Fame</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Leaderboard</h1>
          <p className="text-white/50 text-sm">Every game counts. Every player ranked.</p>
        </div>

        {/* My rank card */}
        {myPlayer && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-400/5 blur-3xl" />
            <div className="flex items-center gap-4 relative">
              <div className="text-center">
                <p className="text-3xl font-black text-white">#{myRank}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase">Your Rank</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-black ${myPlayer.level.color}`}>
                    {myPlayer.level.emoji} {myPlayer.level.name}
                  </span>
                  <span className="text-xs text-white/40">·</span>
                  <span className="text-xs font-bold text-white/40">{myPlayer.xp} XP</span>
                </div>
                {myNext && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">Next: {myNext.level.emoji} {myNext.level.name}</span>
                      <span className="text-[10px] text-white/40">{myNext.xpNeeded} XP to go</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all" style={{ width: `${myNext.progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hot this week */}
        {weekTop.length > 0 && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-red-500/10 flex items-center gap-2">
              <span className="text-sm">🔥</span>
              <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-red-400/80">Hot This Week</h2>
            </div>
            <div className="divide-y divide-white/5">
              {weekTop.map((p, i) => (
                <Link key={p.id} href={`/profile/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <span className="text-lg w-6 text-center">{i === 0 ? "👑" : ["⚡","🔥","💪","🎯"][i-1]}</span>
                  <span className="text-sm font-bold text-white/80 flex-1 truncate">{maskName(p.name)}</span>
                  <span className="text-sm font-black text-red-400">{p.count}</span>
                  <span className="text-[10px] text-white/40">games</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All-time rankings */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/50">All-Time Rankings</h2>
          </div>

          {players.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-4xl mb-3">🏟️</p>
              <p className="text-white/50 text-sm">No games played yet — be the first legend</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {players.slice(0, 25).map((p, i) => {
                const isMe = user?.id === p.id;
                const uniqueSports = new Set(p.sports).size;
                return (
                  <Link
                    key={p.id}
                    href={`/profile/${p.id}`}
                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${isMe ? "bg-amber-400/5" : ""}`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center flex-shrink-0">
                      {i === 0 ? <span className="text-xl">👑</span> :
                       i === 1 ? <span className="text-xl">⚡</span> :
                       i === 2 ? <span className="text-xl">🔥</span> :
                       <span className="text-xs font-bold text-white/40">#{i + 1}</span>}
                    </div>

                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                      i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                      i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400" :
                      i === 2 ? "bg-gradient-to-br from-orange-600 to-orange-700" :
                      "bg-white/10"
                    }`}>
                      {maskName(p.name).charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white/80 truncate">{isMe ? p.name : maskName(p.name)}</span>
                        {isMe && <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">you</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold ${p.level.color}`}>{p.level.emoji} {p.level.name}</span>
                        <span className="text-[10px] text-white/30">·</span>
                        <span className="text-[10px] text-white/40">{uniqueSports} sport{uniqueSports !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-white/60">{p.xp}</p>
                      <p className="text-[10px] text-white/30">XP</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sport breakdown */}
        {topSports.length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/50 mb-5">Most Played</h2>
            <div className="space-y-4">
              {topSports.map(([sport, count]) => {
                const pct = totalGames > 0 ? Math.round((count / totalGames) * 100) : 0;
                return (
                  <div key={sport}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-white/60">{getSportEmoji(sport)} {sport}</span>
                      <span className="text-xs text-white/40">{count} · {pct}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Opt-in notice */}
        <p className="text-center text-xs text-white/40">
          Only showing players who opted in.{" "}
          {user ? (
            <Link href="/settings" className="text-amber-400 hover:underline">Go to Settings</Link>
          ) : (
            <span>Log in and go to Settings</span>
          )}{" "}
          to appear on the leaderboard.
        </p>

        {/* CTA */}
        <div className="text-center py-8">
          <Link
            href={user ? "/events" : "/login"}
            className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm px-10 py-4 rounded-full hover:shadow-lg hover:shadow-amber-500/25 transition-all"
          >
            {user ? "Play to climb →" : "Join the Club →"}
          </Link>
        </div>
      </div>
    </main>
  );
}
