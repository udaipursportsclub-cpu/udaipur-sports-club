/**
 * FILE: src/app/members/page.tsx
 *
 * Public member directory — browse all USC members.
 * Shows name, role, sports played, games count.
 * Click any member to see their full profile.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient }      from "@/lib/supabase/server";
import { getSportEmoji }     from "@/lib/types";
import Link from "next/link";
import NavLogo from "@/components/NavLogo";

export const revalidate = 60;

export default async function MembersPage() {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  // All profiles
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: true });

  // RSVP counts per user
  const { data: rsvps } = await admin
    .from("rsvps")
    .select("user_id, events(sport)");

  // Build stats map
  const statsMap: Record<string, { count: number; sports: Set<string> }> = {};
  for (const r of rsvps ?? []) {
    if (!statsMap[r.user_id]) statsMap[r.user_id] = { count: 0, sports: new Set() };
    statsMap[r.user_id].count++;
    const sport = (r.events as { sport?: string } | null)?.sport;
    if (sport) statsMap[r.user_id].sports.add(sport);
  }

  const ROLE_COLORS: Record<string, string> = {
    admin:  "text-red-500 bg-red-50 border-red-200",
    proxy:  "text-blue-600 bg-blue-50 border-blue-200",
    host:   "text-amber-600 bg-amber-50 border-amber-200",
    member: "text-slate-500 bg-stone-50 border-stone-200",
  };
  const ROLE_LABELS: Record<string, string> = {
    admin: "Admin", proxy: "Proxy Owner", host: "Host", member: "Member",
  };

  return (
    <main className="min-h-screen bg-[#F9F7F4]" style={{ fontFamily: "var(--font-geist-sans)" }}>

      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <NavLogo />
        <div className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Leaderboard</Link>
          {user && <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Dashboard</Link>}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full mb-4">
            Community
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Members</h1>
          <p className="text-slate-500 text-sm">
            {profiles?.length ?? 0} athletes in Udaipur Sports Club
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="divide-y divide-stone-100">
            {(profiles ?? []).map((p) => {
              const stats       = statsMap[p.id] ?? { count: 0, sports: new Set<string>() };
              const topSports   = Array.from(stats.sports).slice(0, 3);
              const isMe        = user?.id === p.id;

              return (
                <Link
                  key={p.id}
                  href={`/profile/${p.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${
                    p.role === "admin"  ? "bg-red-400"   :
                    p.role === "proxy"  ? "bg-blue-400"  :
                    p.role === "host"   ? "bg-amber-400" : "bg-slate-300"
                  }`}>
                    {(p.full_name ?? "?").charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {p.full_name ?? "Unknown"}
                      </span>
                      {isMe && <span className="text-xs text-amber-500">(you)</span>}
                      <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${ROLE_COLORS[p.role] ?? ROLE_COLORS.member}`}>
                        {ROLE_LABELS[p.role] ?? "Member"}
                      </span>
                    </div>
                    {topSports.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {topSports.map((s) => getSportEmoji(s)).join(" ")} {topSports.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Games count */}
                  {stats.count > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-extrabold text-amber-500">{stats.count}</p>
                      <p className="text-xs text-slate-400">games</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
