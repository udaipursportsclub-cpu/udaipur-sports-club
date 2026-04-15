/**
 * FILE: src/app/events/[id]/scoreboard/page.tsx
 *
 * Live cricket scoreboard viewer. Shows the full match scorecard
 * with batting, bowling, ball-by-ball timeline, and fall of wickets.
 * Dark cinematic theme matching the rest of the USC platform.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskName } from "@/lib/privacy";
import { notFound } from "next/navigation";
import Link from "next/link";


export default async function ScoreboardPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { innings?: string };
}) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const eventId = params.id;

  // Check who's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch event
  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const isHost = user?.id === event.host_id;

  // Fetch all innings
  const { data: innings } = await admin
    .from("cricket_innings")
    .select("*")
    .eq("event_id", eventId)
    .order("innings_number", { ascending: true });

  const allInnings = innings ?? [];

  // No scoreboard yet
  if (allInnings.length === 0) {
    return (
      <main
        className="min-h-screen bg-[#030712]"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">U</span>
            </div>
            <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            &larr; Back to Event
          </Link>
        </nav>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="text-6xl mb-6">🏏</div>
          <h1 className="text-2xl font-extrabold text-white mb-3">
            No Scoreboard Yet
          </h1>
          <p className="text-white/40 mb-8">
            The host hasn&apos;t started scoring for this match.
          </p>
          {isHost && (
            <Link
              href={`/events/${eventId}/scoreboard/score`}
              className="inline-block bg-amber-400 text-black font-bold px-8 py-3 rounded-xl hover:bg-amber-300 transition-colors"
            >
              Start Scoring
            </Link>
          )}
        </div>
      </main>
    );
  }

  // Determine which innings to show
  const selectedInningsNum = searchParams.innings
    ? parseInt(searchParams.innings)
    : allInnings.find((i) => i.status === "in_progress")?.innings_number ??
      allInnings[allInnings.length - 1].innings_number;

  const currentInnings = allInnings.find(
    (i) => i.innings_number === selectedInningsNum
  )!;

  // Fetch batting for this innings
  const { data: batting } = await admin
    .from("cricket_batting")
    .select("*")
    .eq("innings_id", currentInnings.id)
    .order("batting_order", { ascending: true });

  const battingList = batting ?? [];

  // Fetch bowling for this innings
  const { data: bowling } = await admin
    .from("cricket_bowling")
    .select("*")
    .eq("innings_id", currentInnings.id)
    .order("id", { ascending: true });

  const bowlingList = bowling ?? [];

  // Fetch all balls for this innings
  const { data: allBalls } = await admin
    .from("cricket_balls")
    .select("*")
    .eq("innings_id", currentInnings.id)
    .order("id", { ascending: true });

  const ballsList = allBalls ?? [];

  // Current over balls
  const currentOver = Math.floor(currentInnings.total_overs);
  const currentOverBalls = ballsList.filter(
    (b) => b.over_number === currentOver
  );

  // Current batsmen
  const striker = battingList.find((b) => b.status === "striker");
  const nonStriker = battingList.find((b) => b.status === "non_striker");

  // Current bowler (last in the list)
  const currentBowler = bowlingList.length > 0 ? bowlingList[bowlingList.length - 1] : null;

  // Fall of wickets
  const fallOfWickets = battingList
    .filter((b) => b.status === "out")
    .map((b) => {
      // Find the ball where this batsman was dismissed
      return {
        playerName: b.player_name,
        runs: b.runs,
        howOut: b.how_out,
      };
    });

  // Format overs display
  const formatOvers = (overs: number) => {
    const completed = Math.floor(overs);
    const balls = Math.round((overs - completed) * 10);
    return `${completed}.${balls}`;
  };

  return (
    <main
      className="min-h-screen bg-[#030712]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <div className="flex items-center gap-4">
          {isHost && (
            <Link
              href={`/events/${eventId}/scoreboard/score`}
              className="text-xs font-semibold bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 px-4 py-2 rounded-full transition-colors"
            >
              Score Match
            </Link>
          )}
          <Link
            href={`/events/${eventId}`}
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            &larr; Event
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* ── INNINGS TABS ─────────────────────────────────────────── */}
        {allInnings.length > 1 && (
          <div className="flex gap-2">
            {allInnings.map((inn) => (
              <Link
                key={inn.id}
                href={`/events/${eventId}/scoreboard?innings=${inn.innings_number}`}
                className={`flex-1 text-center text-xs font-bold py-2.5 rounded-xl transition-colors ${
                  inn.innings_number === selectedInningsNum
                    ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                    : "bg-white/[0.03] text-white/40 border border-white/5 hover:border-white/10"
                }`}
              >
                {inn.batting_team} - Innings {inn.innings_number}
              </Link>
            ))}
          </div>
        )}

        {/* ── LIVE SCORE HEADER ────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-2xl border border-white/5 p-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold tracking-widest uppercase text-amber-400">
              {currentInnings.batting_team}
              {currentInnings.status === "in_progress" && (
                <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </p>
            <p className="text-xs text-white/50">
              vs {currentInnings.bowling_team}
            </p>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-black text-white tabular-nums">
              {currentInnings.total_runs}/{currentInnings.total_wickets}
            </span>
            <span className="text-lg text-white/40 font-medium">
              ({formatOvers(currentInnings.total_overs)} ov)
            </span>
          </div>
          {currentInnings.extras && currentInnings.extras.total > 0 && (
            <p className="text-xs text-white/50 mt-2">
              Extras: {currentInnings.extras.total} (
              {currentInnings.extras.wides > 0
                ? `w ${currentInnings.extras.wides} `
                : ""}
              {currentInnings.extras.noballs > 0
                ? `nb ${currentInnings.extras.noballs} `
                : ""}
              {currentInnings.extras.byes > 0
                ? `b ${currentInnings.extras.byes} `
                : ""}
              {currentInnings.extras.legbyes > 0
                ? `lb ${currentInnings.extras.legbyes}`
                : ""}
              )
            </p>
          )}

          {/* Target info for 2nd innings */}
          {selectedInningsNum === 2 && allInnings.length > 1 && (
            <p className="text-xs text-amber-400/60 mt-2 font-medium">
              Target: {allInnings[0].total_runs + 1} &middot; Need{" "}
              {allInnings[0].total_runs + 1 - currentInnings.total_runs} from{" "}
              remaining overs
            </p>
          )}
        </div>

        {/* ── CURRENT BATSMEN ──────────────────────────────────────── */}
        {(striker || nonStriker) && currentInnings.status === "in_progress" && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3">
              At the Crease
            </p>
            <div className="space-y-2">
              {[striker, nonStriker].filter(Boolean).map((b) => (
                <div
                  key={b!.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {b!.status === "striker" && (
                      <span className="text-amber-400 text-xs">*</span>
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        b!.status === "striker"
                          ? "text-white"
                          : "text-white/60"
                      }`}
                    >
                      {maskName(b!.player_name)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm tabular-nums">
                    <span className="text-white font-bold">
                      {b!.runs}
                      <span className="text-white/50 font-normal">
                        ({b!.balls_faced})
                      </span>
                    </span>
                    <span className="text-white/50 text-xs">
                      SR {b!.strike_rate}
                    </span>
                    {b!.fours > 0 && (
                      <span className="text-xs text-blue-400">
                        {b!.fours}x4
                      </span>
                    )}
                    {b!.sixes > 0 && (
                      <span className="text-xs text-purple-400">
                        {b!.sixes}x6
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CURRENT BOWLER ───────────────────────────────────────── */}
        {currentBowler && currentInnings.status === "in_progress" && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
              Bowling
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {maskName(currentBowler.player_name)}
              </span>
              <div className="flex items-center gap-4 text-sm tabular-nums">
                <span className="text-white/60">
                  {formatOvers(currentBowler.overs)}-{currentBowler.maidens}-
                  {currentBowler.runs_conceded}-{currentBowler.wickets}
                </span>
                <span className="text-white/50 text-xs">
                  Econ {currentBowler.economy}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── BALL-BY-BALL CURRENT OVER ────────────────────────────── */}
        {currentOverBalls.length > 0 && currentInnings.status === "in_progress" && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3">
              This Over
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {currentOverBalls.map((ball) => {
                let label = String(ball.runs);
                let colorClass = "bg-white/10 text-white/60";

                if (ball.is_wicket) {
                  label = "W";
                  colorClass = "bg-red-500/20 text-red-400 ring-1 ring-red-400/30";
                } else if (ball.is_wide) {
                  label = `${ball.runs}wd`;
                  colorClass = "bg-yellow-500/20 text-yellow-400";
                } else if (ball.is_noball) {
                  label = `${ball.runs}nb`;
                  colorClass = "bg-yellow-500/20 text-yellow-400";
                } else if (ball.is_four) {
                  label = "4";
                  colorClass = "bg-blue-500/20 text-blue-400 ring-1 ring-blue-400/30";
                } else if (ball.is_six) {
                  label = "6";
                  colorClass = "bg-purple-500/20 text-purple-400 ring-1 ring-purple-400/30";
                } else if (ball.runs === 0) {
                  label = "\u2022";
                  colorClass = "bg-white/5 text-white/50";
                }

                return (
                  <div
                    key={ball.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BATTING SCORECARD ────────────────────────────────────── */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40">
              Batting
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/50 text-xs border-b border-white/5">
                  <th className="text-left px-4 py-2 font-medium">Batter</th>
                  <th className="text-right px-2 py-2 font-medium">R</th>
                  <th className="text-right px-2 py-2 font-medium">B</th>
                  <th className="text-right px-2 py-2 font-medium">4s</th>
                  <th className="text-right px-2 py-2 font-medium">6s</th>
                  <th className="text-right px-4 py-2 font-medium">SR</th>
                </tr>
              </thead>
              <tbody>
                {battingList.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-white/[0.03] last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <div>
                        <span
                          className={`font-medium ${
                            b.status === "striker" || b.status === "non_striker"
                              ? "text-white"
                              : "text-white/60"
                          }`}
                        >
                          {maskName(b.player_name)}
                          {b.status === "striker" && (
                            <span className="text-amber-400 ml-1">*</span>
                          )}
                        </span>
                        {b.status === "out" && (
                          <p className="text-xs text-white/25 mt-0.5">
                            {b.how_out}
                          </p>
                        )}
                        {(b.status === "striker" ||
                          b.status === "non_striker") && (
                          <p className="text-xs text-green-400/60 mt-0.5">
                            not out
                          </p>
                        )}
                      </div>
                    </td>
                    <td
                      className={`text-right px-2 py-2.5 tabular-nums font-bold ${
                        b.status === "striker" || b.status === "non_striker"
                          ? "text-white"
                          : "text-white/60"
                      }`}
                    >
                      {b.runs}
                    </td>
                    <td className="text-right px-2 py-2.5 text-white/40 tabular-nums">
                      {b.balls_faced}
                    </td>
                    <td className="text-right px-2 py-2.5 text-white/40 tabular-nums">
                      {b.fours}
                    </td>
                    <td className="text-right px-2 py-2.5 text-white/40 tabular-nums">
                      {b.sixes}
                    </td>
                    <td className="text-right px-4 py-2.5 text-white/40 tabular-nums">
                      {b.strike_rate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── BOWLING SCORECARD ────────────────────────────────────── */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40">
              Bowling
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/50 text-xs border-b border-white/5">
                  <th className="text-left px-4 py-2 font-medium">Bowler</th>
                  <th className="text-right px-2 py-2 font-medium">O</th>
                  <th className="text-right px-2 py-2 font-medium">M</th>
                  <th className="text-right px-2 py-2 font-medium">R</th>
                  <th className="text-right px-2 py-2 font-medium">W</th>
                  <th className="text-right px-4 py-2 font-medium">Econ</th>
                </tr>
              </thead>
              <tbody>
                {bowlingList.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-white/[0.03] last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-white/70">
                      {maskName(b.player_name)}
                    </td>
                    <td className="text-right px-2 py-2.5 text-white/50 tabular-nums">
                      {formatOvers(b.overs)}
                    </td>
                    <td className="text-right px-2 py-2.5 text-white/50 tabular-nums">
                      {b.maidens}
                    </td>
                    <td className="text-right px-2 py-2.5 text-white/50 tabular-nums">
                      {b.runs_conceded}
                    </td>
                    <td className="text-right px-2 py-2.5 text-white font-bold tabular-nums">
                      {b.wickets}
                    </td>
                    <td className="text-right px-4 py-2.5 text-white/50 tabular-nums">
                      {b.economy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FALL OF WICKETS ──────────────────────────────────────── */}
        {fallOfWickets.length > 0 && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3">
              Fall of Wickets
            </p>
            <div className="flex flex-wrap gap-3">
              {fallOfWickets.map((fow, idx) => (
                <div
                  key={idx}
                  className="bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-1.5"
                >
                  <span className="text-xs text-red-400/80 font-medium">
                    {maskName(fow.playerName)} ({fow.runs})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── OVER-BY-OVER HISTORY ─────────────────────────────────── */}
        {ballsList.length > 0 && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3">
              Over History
            </p>
            <div className="space-y-2">
              {(() => {
                // Group balls by over
                const overs: Record<number, typeof ballsList> = {};
                ballsList.forEach((b) => {
                  if (!overs[b.over_number]) overs[b.over_number] = [];
                  overs[b.over_number].push(b);
                });

                return Object.entries(overs)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([overNum, balls]) => {
                    const overRuns = balls.reduce(
                      (sum, b) =>
                        sum +
                        b.runs +
                        (b.is_wide ? 1 : 0) +
                        (b.is_noball ? 1 : 0),
                      0
                    );

                    return (
                      <div
                        key={overNum}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xs text-white/50 font-mono w-10 shrink-0">
                          Ov {Number(overNum) + 1}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                          {balls.map((ball) => {
                            let label = String(ball.runs);
                            let cls = "text-white/40";

                            if (ball.is_wicket) {
                              label = "W";
                              cls = "text-red-400 font-bold";
                            } else if (ball.is_wide) {
                              label = `${ball.runs}wd`;
                              cls = "text-yellow-400";
                            } else if (ball.is_noball) {
                              label = `${ball.runs}nb`;
                              cls = "text-yellow-400";
                            } else if (ball.is_four) {
                              label = "4";
                              cls = "text-blue-400 font-bold";
                            } else if (ball.is_six) {
                              label = "6";
                              cls = "text-purple-400 font-bold";
                            } else if (ball.runs === 0) {
                              label = "\u2022";
                              cls = "text-white/40";
                            }

                            return (
                              <span
                                key={ball.id}
                                className={`text-xs ${cls}`}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                        <span className="text-xs text-white/50 font-mono tabular-nums w-8 text-right shrink-0">
                          {overRuns}r
                        </span>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

