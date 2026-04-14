/**
 * FILE: src/app/tournaments/page.tsx
 *
 * Tournaments list page — shows all active + past tournaments.
 * Card for each with title, sport, format, status, teams count.
 * "Create Tournament" button for hosts.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSportEmoji }     from "@/lib/types";
import Link                  from "next/link";

export default async function TournamentsPage() {
  const supabase = await createClient();
  const admin    = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is host/admin
  let isHost = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    isHost = !!profile && ["host", "proxy", "admin"].includes(profile.role);
  }

  // Fetch all tournaments with team counts
  const { data } = await admin
    .from("tournaments")
    .select("*, tournament_teams(count)")
    .order("created_at", { ascending: false });

  const tournaments = data ?? [];

  // Split into active and past
  const active = tournaments.filter((t: Record<string, unknown>) => t.status !== "completed");
  const past   = tournaments.filter((t: Record<string, unknown>) => t.status === "completed");

  function formatLabel(format: string) {
    const labels: Record<string, string> = {
      knockout:        "Knockout",
      league:          "League",
      round_robin:     "Round Robin",
      groups_knockout: "Groups + KO",
    };
    return labels[format] ?? format;
  }

  function statusColor(status: string) {
    if (status === "active")    return "bg-green-400/10 text-green-400";
    if (status === "completed") return "bg-white/5 text-white/30";
    return "bg-amber-400/10 text-amber-400"; // draft
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function TournamentCard({ t }: { t: any }) {
    const teamCount = t.tournament_teams?.[0]?.count ?? 0;
    return (
      <Link
        key={t.id}
        href={`/tournaments/${t.id}`}
        className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all p-5 flex flex-col"
      >
        {/* Sport + Format */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl">
              {getSportEmoji(t.sport)}
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/20 block">
                {t.sport}
              </span>
              <span className="text-[10px] font-semibold text-white/15">
                {formatLabel(t.format)}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColor(t.status)}`}>
            {t.status === "active" ? "Live" : t.status === "completed" ? "Done" : "Draft"}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors leading-tight mb-3">
          {t.title}
        </h2>

        {/* Details */}
        <div className="space-y-1.5 mb-4">
          {t.start_date && (
            <p className="text-xs text-white/30">
              📅 {formatDate(t.start_date)}{t.end_date ? ` — ${formatDate(t.end_date)}` : ""}
            </p>
          )}
          {t.entry_fee > 0 && (
            <p className="text-xs font-bold text-amber-400/70">
              Entry: ₹{t.entry_fee}/team
            </p>
          )}
        </div>

        <div className="flex-1" />

        {/* Bottom */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-[10px] font-bold text-white/15">{t.host_name}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-white/40">{teamCount}</span>
            <span className="text-[10px] text-white/15">/{t.max_teams} teams</span>
          </div>
        </div>
      </Link>
    );
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
              {isHost && (
                <Link href="/tournaments/new" className="text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
                  + Create
                </Link>
              )}
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
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
          Tournaments
        </h1>
        <p className="text-white/30 text-sm">
          Compete in knockout brackets and league formats.
        </p>
      </div>

      {/* Active Tournaments */}
      <div className="max-w-5xl mx-auto px-6 pb-8">
        {active.length > 0 && (
          <>
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/20 mb-4">
              Active & Upcoming
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {active.map((t: any) => <TournamentCard key={t.id} t={t} />)}
            </div>
          </>
        )}
      </div>

      {/* Past Tournaments */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        {past.length > 0 && (
          <>
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/20 mb-4 mt-6">
              Past Tournaments
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {past.map((t: any) => <TournamentCard key={t.id} t={t} />)}
            </div>
          </>
        )}

        {tournaments.length === 0 && (
          <div className="text-center py-24">
            <p className="text-5xl mb-6">🏆</p>
            <h2 className="text-xl font-bold text-white mb-2">No tournaments yet</h2>
            <p className="text-white/30 text-sm mb-8">Be the first to create one.</p>
            {isHost ? (
              <Link
                href="/tournaments/new"
                className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm px-8 py-3.5 rounded-full transition-all"
              >
                Create Tournament
              </Link>
            ) : user ? (
              <p className="text-white/20 text-sm">Only hosts can create tournaments.</p>
            ) : (
              <Link
                href="/login"
                className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm px-8 py-3.5 rounded-full transition-all"
              >
                Sign in
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
