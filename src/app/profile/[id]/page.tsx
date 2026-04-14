/**
 * FILE: src/app/profile/[id]/page.tsx
 *
 * What this does:
 * A member's public profile page — their sports history and stats.
 * Inspired by Strava profiles: shows what sports they play,
 * how many events they've joined/hosted, and their recent activity.
 *
 * URL: /profile/[userId]
 */

import { createClient }                             from "@/lib/supabase/server";
import { getSportEmoji }                            from "@/lib/types";
import { computeAchievements }                      from "@/lib/achievements";
import { notFound }                                 from "next/navigation";
import Link from "next/link";
import NavLogo from "@/components/NavLogo";

export default async function ProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // Who's viewing
  const { data: { user: viewer } } = await supabase.auth.getUser();

  // Fetch the profile being viewed
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!profile) notFound();

  // Fetch events they've RSVPed to (joined)
  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("event_id, created_at, events(id, title, sport, date, status)")
    .eq("user_id", params.id)
    .order("created_at", { ascending: false });

  // Fetch events they've hosted
  const { data: hostedEvents } = await supabase
    .from("events")
    .select("id, title, sport, date, status, capacity")
    .eq("host_id", params.id)
    .order("date", { ascending: false });

  const joined  = rsvps ?? [];
  const hosted  = hostedEvents ?? [];

  // ── Stats ──────────────────────────────────────────────────────────────
  const totalPlayed  = joined.length;
  const totalHosted  = hosted.length;
  const completedPlayed = joined.filter((r) => {
    const ev = r.events as { status?: string } | null;
    return ev?.status === "completed";
  }).length;

  // Sports breakdown — how many times they played each sport
  const sportCounts: Record<string, number> = {};
  for (const r of joined) {
    const ev = r.events as { sport?: string } | null;
    const sp = ev?.sport ?? "Other";
    sportCounts[sp] = (sportCounts[sp] ?? 0) + 1;
  }
  // Sort by most played
  const topSports = Object.entries(sportCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Compute achievements
  const achievements = computeAchievements({
    totalPlayed:  totalPlayed,
    totalHosted:  totalHosted,
    sportsPlayed: joined.map((r) => (r.events as { sport?: string } | null)?.sport ?? "Other"),
    sportsHosted: hosted.map((e) => e.sport),
  });
  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  // Member since
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-IN", {
    month: "long", year: "numeric",
  });

  const isOwnProfile = viewer?.id === params.id;

  const ROLE_LABELS: Record<string, string> = {
    admin:  "Admin",
    proxy:  "Proxy Owner",
    host:   "Host",
    member: "Member",
  };
  const ROLE_COLORS: Record<string, string> = {
    admin:  "text-red-500 bg-red-50 border-red-200",
    proxy:  "text-blue-600 bg-blue-50 border-blue-200",
    host:   "text-amber-600 bg-amber-50 border-amber-200",
    member: "text-slate-500 bg-stone-50 border-stone-200",
  };

  return (
    <main
      className="min-h-screen bg-[#F9F7F4]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <NavLogo />
        <Link href="/events" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← Events
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">

        {/* ── PROFILE HEADER ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black flex-shrink-0 ${
              profile.role === "admin" ? "bg-red-400" :
              profile.role === "proxy" ? "bg-blue-400" :
              profile.role === "host"  ? "bg-amber-400" : "bg-slate-300"
            }`}>
              {(profile.full_name ?? "?").charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-900">
                  {profile.full_name ?? "Unknown"}
                </h1>
                {isOwnProfile && (
                  <span className="text-xs text-slate-400">(you)</span>
                )}
              </div>
              <span className={`inline-block text-xs font-semibold border px-2.5 py-0.5 rounded-full mt-1.5 ${ROLE_COLORS[profile.role] ?? ROLE_COLORS.member}`}>
                {ROLE_LABELS[profile.role] ?? "Member"}
              </span>
              <p className="text-xs text-slate-400 mt-1.5">Member since {memberSince}</p>
            </div>
          </div>
        </div>

        {/* ── SHARE BUTTONS (own profile only) ─────────────────────── */}
        {isOwnProfile && (
          <div className="flex gap-3">
            <Link
              href={`/wrapped/${params.id}`}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0C1B35] hover:bg-[#122040] rounded-2xl py-3.5 px-4 text-xs font-bold text-amber-400 border border-amber-400/20 hover:border-amber-400/40 transition-all"
            >
              ✨ My Wrapped
            </Link>
            <Link
              href={`/invite/${params.id}`}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-stone-200 hover:border-amber-300 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-700 transition-all"
            >
              🔗 Invite Friends
            </Link>
          </div>
        )}

        {/* ── STATS STRIP ──────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Games Played",   value: totalPlayed,    color: "text-amber-500" },
            { label: "Completed",      value: completedPlayed, color: "text-green-500" },
            { label: "Events Hosted",  value: totalHosted,    color: "text-blue-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-stone-200 p-5 text-center">
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mt-1 leading-tight">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── ACHIEVEMENT BADGES ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">
              Badges
            </h2>
            <span className="text-xs text-slate-400">
              {unlockedAchievements.length} / {achievements.length} unlocked
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {achievements.map((a) => (
              <div
                key={a.id}
                title={a.description}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  a.unlocked
                    ? "bg-amber-50 border-amber-200"
                    : "bg-stone-50 border-stone-100 opacity-40 grayscale"
                }`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className={`text-xs font-bold leading-tight ${a.unlocked ? "text-slate-700" : "text-slate-400"}`}>
                  {a.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── SPORTS BREAKDOWN ─────────────────────────────────────── */}
        {topSports.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-5">
              Sports Played
            </h2>
            <div className="space-y-3">
              {topSports.map(([sport, count]) => {
                const pct = Math.round((count / totalPlayed) * 100);
                return (
                  <div key={sport}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-700">
                        {getSportEmoji(sport)} {sport}
                      </span>
                      <span className="text-xs text-slate-400">
                        {count} {count === 1 ? "game" : "games"}
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RECENT EVENTS JOINED ─────────────────────────────────── */}
        {joined.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100">
              <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">
                Recent Events
              </h2>
            </div>
            <div className="divide-y divide-stone-100">
              {joined.slice(0, 8).map((r) => {
                const ev = r.events as {
                  id?: string; title?: string; sport?: string;
                  date?: string; status?: string;
                } | null;
                if (!ev?.id) return null;

                const formattedDate = new Date(ev.date ?? "").toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                });

                return (
                  <Link
                    key={r.event_id}
                    href={`/events/${ev.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors"
                  >
                    <span className="text-2xl flex-shrink-0">
                      {getSportEmoji(ev.sport ?? "")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {ev.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{formattedDate}</p>
                    </div>
                    {ev.status === "completed" && (
                      <span className="text-xs font-semibold text-green-500 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        Played ✓
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── EVENTS HOSTED ────────────────────────────────────────── */}
        {hosted.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100">
              <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">
                Events Hosted
              </h2>
            </div>
            <div className="divide-y divide-stone-100">
              {hosted.slice(0, 5).map((ev) => {
                const formattedDate = new Date(ev.date).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                });
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors"
                  >
                    <span className="text-2xl flex-shrink-0">{getSportEmoji(ev.sport)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{ev.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formattedDate}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 border ${
                      ev.status === "completed"
                        ? "text-green-500 bg-green-50 border-green-100"
                        : "text-amber-500 bg-amber-50 border-amber-100"
                    }`}>
                      {ev.status === "completed" ? "Done" : "Upcoming"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {joined.length === 0 && hosted.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-4">🏅</p>
            <p className="text-sm">No events yet — get out and play!</p>
            {isOwnProfile && (
              <Link href="/events" className="inline-block mt-4 text-sm font-semibold text-amber-500 hover:text-amber-400">
                Browse events →
              </Link>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
