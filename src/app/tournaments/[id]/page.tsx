/**
 * FILE: src/app/tournaments/[id]/page.tsx
 *
 * Tournament detail page — shows header, teams, bracket/fixtures,
 * match results, and host controls (add teams, generate fixtures,
 * record results).
 */

import { createClient }    from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSportEmoji }   from "@/lib/types";
import { maskName }        from "@/lib/privacy";
import { notFound }        from "next/navigation";
import Link                from "next/link";

import TournamentActions   from "./tournament-actions";

export default async function TournamentPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch tournament
  const { data: tournament } = await admin
    .from("tournaments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!tournament) notFound();

  // Fetch teams with players
  const { data: teams } = await admin
    .from("tournament_teams")
    .select("*, tournament_players(*)")
    .eq("tournament_id", params.id)
    .order("seed", { ascending: true });

  // Fetch matches
  const { data: matches } = await admin
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", params.id)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  const teamList  = teams   ?? [];
  const matchList = matches ?? [];
  const isHost    = user?.id === tournament.host_id;
  const isKnockout = tournament.format === "knockout" || tournament.format === "groups_knockout";
  const isLeague   = tournament.format === "league" || tournament.format === "round_robin";

  // Build team name lookup
  const teamNames: Record<string, string> = {};
  teamList.forEach(t => { teamNames[t.id] = t.name; });

  // Format dates
  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
  }

  function statusLabel(status: string) {
    if (status === "active")    return { text: "Live", color: "bg-green-400/10 text-green-400 border-green-400/20" };
    if (status === "completed") return { text: "Completed", color: "bg-white/5 text-white/50 border-white/5" };
    return { text: "Draft", color: "bg-amber-400/10 text-amber-400 border-amber-400/20" };
  }

  function formatLabel(format: string) {
    const labels: Record<string, string> = {
      knockout: "Knockout", league: "League", round_robin: "Round Robin", groups_knockout: "Groups + KO",
    };
    return labels[format] ?? format;
  }

  const status = statusLabel(tournament.status);

  // League standings calculation
  type Standing = { teamId: string; name: string; played: number; won: number; lost: number; drawn: number; points: number; gf: number; ga: number };
  let standings: Standing[] = [];
  if (isLeague && matchList.length > 0) {
    const map: Record<string, Standing> = {};
    teamList.forEach(t => {
      map[t.id] = { teamId: t.id, name: t.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, gf: 0, ga: 0 };
    });
    matchList.filter(m => m.status === "completed").forEach(m => {
      const a = map[m.team_a_id];
      const b = map[m.team_b_id];
      if (!a || !b) return;
      a.played++; b.played++;
      a.gf += m.score_a ?? 0; a.ga += m.score_b ?? 0;
      b.gf += m.score_b ?? 0; b.ga += m.score_a ?? 0;
      if (m.winner_id === m.team_a_id) {
        a.won++; a.points += 3; b.lost++;
      } else if (m.winner_id === m.team_b_id) {
        b.won++; b.points += 3; a.lost++;
      } else {
        // Draw (score equal, no winner)
        a.drawn++; a.points += 1; b.drawn++; b.points += 1;
      }
    });
    standings = Object.values(map).sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
  }

  // Group matches by round for bracket view
  const rounds: Record<number, typeof matchList> = {};
  matchList.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  function roundLabel(round: number, total: number) {
    if (isKnockout) {
      if (round === total) return "Final";
      if (round === total - 1) return "Semi-Finals";
      if (round === total - 2) return "Quarter-Finals";
      return `Round ${round}`;
    }
    return `Round ${round}`;
  }

  // Winner/Runner-up names
  const winnerName   = tournament.winner_team_id   ? teamNames[tournament.winner_team_id]   ?? "—" : null;
  const runnerUpName = tournament.runner_up_team_id ? teamNames[tournament.runner_up_team_id] ?? "—" : null;

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
        <Link href="/tournaments" className="text-sm text-white/40 hover:text-white transition-colors">
          ← All Tournaments
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* ── TOURNAMENT HEADER ──────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{getSportEmoji(tournament.sport)}</span>
            <span className="text-xs font-bold tracking-widest uppercase text-white/40">{tournament.sport}</span>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${status.color}`}>
              {status.text}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-4 leading-tight">
            {tournament.title}
          </h1>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-4 text-sm text-white/60">
              <span>📋 {formatLabel(tournament.format)}</span>
              <span>👥 {tournament.team_size} per team</span>
              <span>🏟️ {teamList.length}/{tournament.max_teams} teams</span>
            </div>
            {(tournament.start_date || tournament.end_date) && (
              <p className="text-sm text-white/60">
                📅 {formatDate(tournament.start_date)}{tournament.end_date ? ` — ${formatDate(tournament.end_date)}` : ""}
              </p>
            )}
            {tournament.entry_fee > 0 && (
              <p className="text-sm font-bold text-amber-400">
                Entry: ₹{tournament.entry_fee}/team
              </p>
            )}
            <p className="text-sm text-white/40">
              Hosted by <strong className="text-white/60">{maskName(tournament.host_name)}</strong>
            </p>
          </div>
        </div>

        {/* ── WINNER BANNER ──────────────────────────────────────── */}
        {tournament.status === "completed" && winnerName && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold tracking-widest uppercase text-amber-400 mb-2">Champion</p>
            <p className="text-2xl font-extrabold text-amber-400 mb-1">🏆 {winnerName}</p>
            {runnerUpName && (
              <p className="text-sm text-white/40">Runner-up: {runnerUpName}</p>
            )}
          </div>
        )}

        {/* ── DESCRIPTION ────────────────────────────────────────── */}
        {tournament.description && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3">About</h2>
            <p className="text-sm text-white/60 leading-relaxed">{tournament.description}</p>
          </div>
        )}

        {/* ── RULES ──────────────────────────────────────────────── */}
        {tournament.rules && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3">Rules</h2>
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{tournament.rules}</p>
          </div>
        )}

        {/* ── HOST CONTROLS (client component) ───────────────────── */}
        {isHost && (
          <TournamentActions
            tournamentId={params.id}
            status={tournament.status}
            teamCount={teamList.length}
            maxTeams={tournament.max_teams}
            hasMatches={matchList.length > 0}
          />
        )}

        {/* ── TEAMS ──────────────────────────────────────────────── */}
        {teamList.length > 0 && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">
              Teams ({teamList.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamList.map((team) => (
                <div key={team.id} className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 text-sm font-bold">
                      {team.seed}
                    </div>
                    <h3 className="text-sm font-bold text-white">{team.name}</h3>
                  </div>
                  {team.tournament_players && team.tournament_players.length > 0 && (
                    <div className="ml-11 space-y-1">
                      {team.tournament_players.map((p: { id: string; user_name: string; role: string }) => (
                        <p key={p.id} className="text-xs text-white/40">
                          {maskName(p.user_name)}
                          {p.role === "captain" && (
                            <span className="text-amber-400 ml-1">(C)</span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LEAGUE STANDINGS TABLE ─────────────────────────────── */}
        {isLeague && standings.length > 0 && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">Standings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold tracking-widest uppercase text-white/40 border-b border-white/5">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">Team</th>
                    <th className="text-center py-2 px-2">P</th>
                    <th className="text-center py-2 px-2">W</th>
                    <th className="text-center py-2 px-2">D</th>
                    <th className="text-center py-2 px-2">L</th>
                    <th className="text-center py-2 px-2">GF</th>
                    <th className="text-center py-2 px-2">GA</th>
                    <th className="text-center py-2 px-2 text-amber-400">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr key={s.teamId} className="border-b border-white/[0.03] last:border-0">
                      <td className="py-2.5 pr-4 text-white/50 font-bold">{i + 1}</td>
                      <td className="py-2.5 pr-4 text-white font-semibold">{s.name}</td>
                      <td className="text-center py-2.5 px-2 text-white/40">{s.played}</td>
                      <td className="text-center py-2.5 px-2 text-green-400">{s.won}</td>
                      <td className="text-center py-2.5 px-2 text-white/50">{s.drawn}</td>
                      <td className="text-center py-2.5 px-2 text-red-400">{s.lost}</td>
                      <td className="text-center py-2.5 px-2 text-white/40">{s.gf}</td>
                      <td className="text-center py-2.5 px-2 text-white/40">{s.ga}</td>
                      <td className="text-center py-2.5 px-2 text-amber-400 font-extrabold">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── KNOCKOUT BRACKET ───────────────────────────────────── */}
        {isKnockout && matchList.length > 0 && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">Bracket</h2>
            <div className="flex gap-8 overflow-x-auto pb-4">
              {roundNumbers.map(round => (
                <div key={round} className="min-w-[200px] flex-shrink-0">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-white/50 mb-3 text-center">
                    {roundLabel(round, roundNumbers.length)}
                  </p>
                  <div className="space-y-3 flex flex-col justify-around h-full">
                    {rounds[round].map(match => {
                      const teamA = match.team_a_id ? teamNames[match.team_a_id] : "TBD";
                      const teamB = match.team_b_id ? teamNames[match.team_b_id] : "TBD";
                      const isComplete = match.status === "completed";
                      return (
                        <div key={match.id} className="bg-white/[0.03] border border-white/5 rounded-lg overflow-hidden">
                          <div className={`flex items-center justify-between px-3 py-2 border-b border-white/5 ${
                            isComplete && match.winner_id === match.team_a_id ? "bg-green-400/5" : ""
                          }`}>
                            <span className={`text-xs font-semibold truncate ${
                              isComplete && match.winner_id === match.team_a_id ? "text-green-400" : "text-white/60"
                            }`}>
                              {teamA}
                            </span>
                            {isComplete && <span className="text-xs font-bold text-white/40 ml-2">{match.score_a ?? "—"}</span>}
                          </div>
                          <div className={`flex items-center justify-between px-3 py-2 ${
                            isComplete && match.winner_id === match.team_b_id ? "bg-green-400/5" : ""
                          }`}>
                            <span className={`text-xs font-semibold truncate ${
                              isComplete && match.winner_id === match.team_b_id ? "text-green-400" : "text-white/60"
                            }`}>
                              {teamB}
                            </span>
                            {isComplete && <span className="text-xs font-bold text-white/40 ml-2">{match.score_b ?? "—"}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MATCH LIST (all formats) ───────────────────────────── */}
        {matchList.length > 0 && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">
              Matches ({matchList.length})
            </h2>
            <div className="space-y-2">
              {matchList.map(match => {
                const teamA = match.team_a_id ? teamNames[match.team_a_id] : "TBD";
                const teamB = match.team_b_id ? teamNames[match.team_b_id] : "TBD";
                const isComplete = match.status === "completed";
                return (
                  <div key={match.id} className="flex items-center justify-between bg-white/[0.02] rounded-xl px-4 py-3 border border-white/[0.03]">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-white/40 w-8 flex-shrink-0">
                        R{match.round}
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`text-xs font-semibold truncate ${
                          isComplete && match.winner_id === match.team_a_id ? "text-green-400" : "text-white/60"
                        }`}>
                          {teamA}
                        </span>
                        {isComplete ? (
                          <span className="text-xs font-bold text-white/50 flex-shrink-0">
                            {match.score_a ?? 0} - {match.score_b ?? 0}
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/40 flex-shrink-0">vs</span>
                        )}
                        <span className={`text-xs font-semibold truncate ${
                          isComplete && match.winner_id === match.team_b_id ? "text-green-400" : "text-white/60"
                        }`}>
                          {teamB}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      isComplete ? "bg-green-400/10 text-green-400" : "bg-white/5 text-white/40"
                    }`}>
                      {isComplete ? "Done" : "Upcoming"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── HOST: RECORD RESULTS ───────────────────────────────── */}
        {isHost && matchList.some(m => m.status !== "completed" && m.team_a_id && m.team_b_id) && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">
              Record Results
            </h2>
            <div className="space-y-3">
              {matchList
                .filter(m => m.status !== "completed" && m.team_a_id && m.team_b_id)
                .map(match => (
                  <MatchResultForm
                    key={match.id}
                    match={match}
                    teamNames={teamNames}
                    tournamentId={params.id}
                  />
                ))
              }
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

/**
 * Inline client component for recording a single match result.
 * We make this a separate function to keep the server component clean.
 */
function MatchResultForm({
  match,
  teamNames,
  tournamentId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: any;
  teamNames: Record<string, string>;
  tournamentId: string;
}) {
  const teamA = teamNames[match.team_a_id] ?? "Team A";
  const teamB = teamNames[match.team_b_id] ?? "Team B";

  return (
    <form
      action={`/api/tournaments/${tournamentId}/matches/${match.id}`}
      className="bg-white/[0.02] rounded-xl p-4 border border-white/5"
    >
      <p className="text-xs text-white/40 mb-3">
        <span className="font-semibold text-white/60">{teamA}</span>
        {" "}vs{" "}
        <span className="font-semibold text-white/60">{teamB}</span>
        <span className="text-white/40 ml-2">R{match.round} M{match.match_number}</span>
      </p>
      <MatchResultClient
        matchId={match.id}
        tournamentId={tournamentId}
        teamAId={match.team_a_id}
        teamBId={match.team_b_id}
        teamAName={teamA}
        teamBName={teamB}
      />
    </form>
  );
}

// This needs to be a real client component — import from a separate file
// But to keep it self-contained, we use a minimal server-rendered form
// that delegates to the client component
import MatchResultClient from "./match-result-client";
