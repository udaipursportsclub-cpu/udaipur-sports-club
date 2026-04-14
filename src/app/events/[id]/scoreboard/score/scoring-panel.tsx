/**
 * FILE: src/app/events/[id]/scoreboard/score/scoring-panel.tsx
 *
 * "use client" component — the host's live scoring dashboard.
 * Big tap buttons for recording runs, extras, and wickets.
 * Handles starting new innings, changing bowlers, and all scoring logic.
 */

"use client";

import { useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────

interface Innings {
  id: string;
  event_id: string;
  innings_number: number;
  batting_team: string;
  bowling_team: string;
  total_runs: number;
  total_wickets: number;
  total_overs: number;
  extras: {
    wides: number;
    noballs: number;
    byes: number;
    legbyes: number;
    total: number;
  };
  status: string;
}

interface BattingRecord {
  id: string;
  innings_id: string;
  player_id: string | null;
  player_name: string;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  how_out: string;
  bowler_name: string | null;
  batting_order: number;
  status: string;
}

interface BowlingRecord {
  id: string;
  innings_id: string;
  player_id: string | null;
  player_name: string;
  overs: number;
  maidens: number;
  runs_conceded: number;
  wickets: number;
  economy: number;
  wides: number;
  noballs: number;
  dot_balls: number;
}

interface Ball {
  id: string;
  innings_id: string;
  over_number: number;
  ball_number: number;
  batsman_name: string;
  bowler_name: string;
  runs: number;
  is_wicket: boolean;
  wicket_type: string | null;
  is_wide: boolean;
  is_noball: boolean;
  is_bye: boolean;
  is_legbye: boolean;
  is_four: boolean;
  is_six: boolean;
}

interface Props {
  eventId: string;
  allInnings: Innings[];
  activeInnings: Innings | null;
  initialBatting: BattingRecord[];
  initialBowling: BowlingRecord[];
  initialOverBalls: Ball[];
}

// ── Component ────────────────────────────────────────────────────────────

export default function ScoringPanel({
  eventId,
  allInnings,
  activeInnings: initialActiveInnings,
  initialBatting,
  initialBowling,
  initialOverBalls,
}: Props) {
  // State
  const [innings, setInnings] = useState<Innings | null>(initialActiveInnings);
  const [batting, setBatting] = useState<BattingRecord[]>(initialBatting);
  const [bowling, setBowling] = useState<BowlingRecord[]>(initialBowling);
  const [overBalls, setOverBalls] = useState<Ball[]>(initialOverBalls);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showNewInnings, setShowNewInnings] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showNewBowlerModal, setShowNewBowlerModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState<
    "wide" | "noball" | "bye" | "legbye" | null
  >(null);

  // Pending wicket data
  const [, setPendingWicket] = useState<{
    wicketType: string;
    fielderName: string;
    batsmanOut: string;
  } | null>(null);

  // New innings form
  const [newInningsForm, setNewInningsForm] = useState({
    battingTeam: "",
    bowlingTeam: "",
    batsman1: "",
    batsman2: "",
    bowler: "",
  });

  // New bowler
  const [newBowlerName, setNewBowlerName] = useState("");

  // Pending new bowler callback
  const [, setPendingBowlerCallback] = useState<
    (() => void) | null
  >(null);
  void setPendingBowlerCallback;

  // Derived state
  const striker = batting.find((b) => b.status === "striker");
  const nonStriker = batting.find((b) => b.status === "non_striker");
  const currentBowler =
    bowling.length > 0 ? bowling[bowling.length - 1] : null;

  const formatOvers = (overs: number) => {
    const completed = Math.floor(overs);
    const balls = Math.round((overs - completed) * 10);
    return `${completed}.${balls}`;
  };

  // ── Record a ball ─────────────────────────────────────────────────

  const recordBall = useCallback(
    async (opts: {
      runs: number;
      isWicket?: boolean;
      wicketType?: string;
      isWide?: boolean;
      isNoball?: boolean;
      isBye?: boolean;
      isLegbye?: boolean;
      isFour?: boolean;
      isSix?: boolean;
      fielderName?: string;
      newBatsmanName?: string;
      newBatsmanId?: string;
      batsmanOut?: string;
    }) => {
      if (!innings) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/events/${eventId}/scoreboard/ball`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inningsId: innings.id,
              runs: opts.runs,
              isWicket: opts.isWicket ?? false,
              wicketType: opts.wicketType ?? null,
              isWide: opts.isWide ?? false,
              isNoball: opts.isNoball ?? false,
              isBye: opts.isBye ?? false,
              isLegbye: opts.isLegbye ?? false,
              isFour: opts.isFour ?? false,
              isSix: opts.isSix ?? false,
              fielderName: opts.fielderName ?? null,
              newBatsmanName: opts.newBatsmanName ?? null,
              newBatsmanId: opts.newBatsmanId ?? null,
              batsmanOut: opts.batsmanOut ?? null,
            }),
          }
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to record ball");
        }

        const data = await res.json();

        // Update state
        setInnings(data.innings);
        setBatting(data.batting);
        setBowling(data.bowling);
        setOverBalls(data.currentOverBalls);

        // If over just completed, prompt for new bowler
        if (data.overJustCompleted) {
          setShowNewBowlerModal(true);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [innings, eventId]
  );

  // ── Handle run buttons ────────────────────────────────────────────

  const handleRuns = (runs: number) => {
    recordBall({
      runs,
      isFour: runs === 4,
      isSix: runs === 6,
    });
  };

  // ── Handle extras ─────────────────────────────────────────────────

  const handleExtra = (
    type: "wide" | "noball" | "bye" | "legbye",
    extraRuns: number
  ) => {
    setShowExtraModal(null);
    recordBall({
      runs: extraRuns,
      isWide: type === "wide",
      isNoball: type === "noball",
      isBye: type === "bye",
      isLegbye: type === "legbye",
    });
  };

  // ── Handle wicket ─────────────────────────────────────────────────

  const handleWicket = (
    wicketType: string,
    fielderName: string,
    newBatsmanName: string,
    batsmanOut: string
  ) => {
    setShowWicketModal(false);
    setPendingWicket(null);
    recordBall({
      runs: 0,
      isWicket: true,
      wicketType,
      fielderName: fielderName || undefined,
      newBatsmanName: newBatsmanName || undefined,
      batsmanOut: batsmanOut || undefined,
    });
  };

  // ── Start new innings ─────────────────────────────────────────────

  const startNewInnings = async () => {
    if (
      !newInningsForm.battingTeam ||
      !newInningsForm.bowlingTeam ||
      !newInningsForm.batsman1 ||
      !newInningsForm.batsman2 ||
      !newInningsForm.bowler
    ) {
      setError("Fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/scoreboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battingTeam: newInningsForm.battingTeam,
          bowlingTeam: newInningsForm.bowlingTeam,
          batsmen: [
            { name: newInningsForm.batsman1 },
            { name: newInningsForm.batsman2 },
          ],
          bowler: { name: newInningsForm.bowler },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start innings");
      }

      // Reload the page to get fresh data
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // ── Add new bowler ────────────────────────────────────────────────

  const addNewBowler = async () => {
    if (!newBowlerName.trim() || !innings) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/scoreboard`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_bowler",
          inningsId: innings.id,
          bowlerName: newBowlerName.trim(),
        }),
      });

      // If PATCH doesn't exist, just reload
      if (!res.ok) {
        // Fallback: reload the page
        window.location.reload();
        return;
      }

      const data = await res.json();
      if (data.bowling) {
        setBowling(data.bowling);
      }
      setShowNewBowlerModal(false);
      setNewBowlerName("");
    } catch {
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  // ── No active innings — show start form ───────────────────────────

  if (!innings) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏏</div>
          <h1 className="text-2xl font-extrabold text-white mb-2">
            Start Scoring
          </h1>
          <p className="text-white/40 text-sm">
            {allInnings.length === 0
              ? "Set up the first innings to begin"
              : "Start the next innings"}
          </p>
        </div>

        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-white/30 mb-2">
              Batting Team
            </label>
            <input
              type="text"
              value={newInningsForm.battingTeam}
              onChange={(e) =>
                setNewInningsForm((f) => ({
                  ...f,
                  battingTeam: e.target.value,
                }))
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
              placeholder="Team A"
            />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-white/30 mb-2">
              Bowling Team
            </label>
            <input
              type="text"
              value={newInningsForm.bowlingTeam}
              onChange={(e) =>
                setNewInningsForm((f) => ({
                  ...f,
                  bowlingTeam: e.target.value,
                }))
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
              placeholder="Team B"
            />
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-3">
              Opening Batsmen
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={newInningsForm.batsman1}
                onChange={(e) =>
                  setNewInningsForm((f) => ({
                    ...f,
                    batsman1: e.target.value,
                  }))
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
                placeholder="Striker name"
              />
              <input
                type="text"
                value={newInningsForm.batsman2}
                onChange={(e) =>
                  setNewInningsForm((f) => ({
                    ...f,
                    batsman2: e.target.value,
                  }))
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
                placeholder="Non-striker name"
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-3">
              Opening Bowler
            </p>
            <input
              type="text"
              value={newInningsForm.bowler}
              onChange={(e) =>
                setNewInningsForm((f) => ({ ...f, bowler: e.target.value }))
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
              placeholder="Bowler name"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            onClick={startNewInnings}
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start Innings"}
          </button>
        </div>
      </div>
    );
  }

  // ── Active innings — show scoring controls ────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* ── Score Summary ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-2xl border border-white/5 p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold tracking-widest uppercase text-amber-400">
            {innings.batting_team}
          </span>
          <span className="text-xs text-white/30">
            Innings {innings.innings_number}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-white tabular-nums">
            {innings.total_runs}/{innings.total_wickets}
          </span>
          <span className="text-base text-white/40">
            ({formatOvers(innings.total_overs)} ov)
          </span>
        </div>
      </div>

      {/* ── Batsmen at crease ──────────────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4">
        <div className="space-y-2">
          {[striker, nonStriker].filter(Boolean).map((b) => (
            <div key={b!.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {b!.status === "striker" && (
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    b!.status === "striker" ? "text-white" : "text-white/50"
                  }`}
                >
                  {b!.player_name}
                </span>
              </div>
              <span className="text-sm text-white/70 tabular-nums font-bold">
                {b!.runs}
                <span className="text-white/30 font-normal">
                  ({b!.balls_faced})
                </span>
              </span>
            </div>
          ))}
        </div>
        {currentBowler && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-white/30">
              {currentBowler.player_name}
            </span>
            <span className="text-xs text-white/40 tabular-nums">
              {formatOvers(currentBowler.overs)}-{currentBowler.maidens}-
              {currentBowler.runs_conceded}-{currentBowler.wickets}
            </span>
          </div>
        )}
      </div>

      {/* ── This Over Balls ────────────────────────────────────────── */}
      {overBalls.length > 0 && (
        <div className="flex items-center gap-2 px-1 flex-wrap">
          <span className="text-xs text-white/20 mr-1">This over:</span>
          {overBalls.map((ball) => {
            let label = String(ball.runs);
            let colorClass = "bg-white/10 text-white/60";

            if (ball.is_wicket) {
              label = "W";
              colorClass = "bg-red-500/20 text-red-400";
            } else if (ball.is_wide) {
              label = `${ball.runs}wd`;
              colorClass = "bg-yellow-500/20 text-yellow-400";
            } else if (ball.is_noball) {
              label = `${ball.runs}nb`;
              colorClass = "bg-yellow-500/20 text-yellow-400";
            } else if (ball.is_four) {
              label = "4";
              colorClass = "bg-blue-500/20 text-blue-400";
            } else if (ball.is_six) {
              label = "6";
              colorClass = "bg-purple-500/20 text-purple-400";
            } else if (ball.runs === 0) {
              label = "\u2022";
              colorClass = "bg-white/5 text-white/30";
            }

            return (
              <div
                key={ball.id}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}
              >
                {label}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Run Buttons ────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4 space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase text-white/20 mb-1">
          Runs
        </p>
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 6].map((runs) => (
            <button
              key={runs}
              onClick={() => handleRuns(runs)}
              disabled={loading}
              className={`aspect-square rounded-2xl text-xl font-black flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 ${
                runs === 4
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:bg-blue-500/30"
                  : runs === 6
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/20 hover:bg-purple-500/30"
                    : runs === 0
                      ? "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10"
                      : "bg-white/10 text-white border border-white/10 hover:bg-white/15"
              }`}
            >
              {runs === 0 ? "\u2022" : runs}
            </button>
          ))}
        </div>
      </div>

      {/* ── Extras & Wicket Buttons ────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2">
        <button
          onClick={() => setShowExtraModal("wide")}
          disabled={loading}
          className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/15 rounded-xl py-3 text-xs font-bold hover:bg-yellow-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          Wide
        </button>
        <button
          onClick={() => setShowExtraModal("noball")}
          disabled={loading}
          className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/15 rounded-xl py-3 text-xs font-bold hover:bg-yellow-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          No Ball
        </button>
        <button
          onClick={() => setShowExtraModal("bye")}
          disabled={loading}
          className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 rounded-xl py-3 text-xs font-bold hover:bg-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          Bye
        </button>
        <button
          onClick={() => setShowExtraModal("legbye")}
          disabled={loading}
          className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 rounded-xl py-3 text-xs font-bold hover:bg-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          Leg Bye
        </button>
        <button
          onClick={() => setShowWicketModal(true)}
          disabled={loading}
          className="bg-red-500/10 text-red-400 border border-red-500/15 rounded-xl py-3 text-xs font-bold hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          Wicket
        </button>
      </div>

      {/* ── New Innings Button ─────────────────────────────────────── */}
      <div className="pt-2">
        <button
          onClick={() => {
            setShowNewInnings(true);
            setNewInningsForm({
              battingTeam: innings.bowling_team,
              bowlingTeam: innings.batting_team,
              batsman1: "",
              batsman2: "",
              bowler: "",
            });
          }}
          className="w-full bg-white/5 border border-white/10 text-white/50 rounded-xl py-3 text-sm font-bold hover:bg-white/10 transition-colors"
        >
          End Innings / Start Next
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ── EXTRAS MODAL ───────────────────────────────────────────── */}
      {showExtraModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0a0f1a] rounded-2xl border border-white/10 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-white text-center capitalize">
              {showExtraModal === "noball" ? "No Ball" : showExtraModal}
            </h3>
            <p className="text-white/40 text-xs text-center">
              How many additional runs?
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((r) => (
                <button
                  key={r}
                  onClick={() => handleExtra(showExtraModal, r)}
                  className="aspect-square rounded-xl bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowExtraModal(null)}
              className="w-full text-white/40 text-sm py-2 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── WICKET MODAL ───────────────────────────────────────────── */}
      {showWicketModal && (
        <WicketModal
          striker={striker}
          nonStriker={nonStriker}
          bowlerName={currentBowler?.player_name ?? ""}
          onConfirm={handleWicket}
          onCancel={() => setShowWicketModal(false)}
        />
      )}

      {/* ── NEW BOWLER MODAL ───────────────────────────────────────── */}
      {showNewBowlerModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0a0f1a] rounded-2xl border border-white/10 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-white text-center">
              Over Complete
            </h3>
            <p className="text-white/40 text-sm text-center">
              Enter the name of the next bowler
            </p>
            <input
              type="text"
              value={newBowlerName}
              onChange={(e) => setNewBowlerName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
              placeholder="Bowler name"
              autoFocus
            />
            {/* Show previous bowlers for quick selection */}
            {bowling.length > 0 && (
              <div>
                <p className="text-xs text-white/20 mb-2">Previous bowlers:</p>
                <div className="flex flex-wrap gap-2">
                  {bowling
                    .filter(
                      (b) =>
                        currentBowler &&
                        b.player_name !== currentBowler.player_name
                    )
                    .map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setNewBowlerName(b.player_name)}
                        className="text-xs bg-white/5 text-white/50 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        {b.player_name}
                      </button>
                    ))}
                </div>
              </div>
            )}
            <button
              onClick={addNewBowler}
              disabled={!newBowlerName.trim() || loading}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Adding..." : "Start Over"}
            </button>
          </div>
        </div>
      )}

      {/* ── NEW INNINGS MODAL ──────────────────────────────────────── */}
      {showNewInnings && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0f1a] rounded-2xl border border-white/10 w-full max-w-sm p-6 space-y-4 my-8">
            <h3 className="text-lg font-bold text-white text-center">
              Start New Innings
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/30 mb-1">
                  Batting Team
                </label>
                <input
                  type="text"
                  value={newInningsForm.battingTeam}
                  onChange={(e) =>
                    setNewInningsForm((f) => ({
                      ...f,
                      battingTeam: e.target.value,
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
                  placeholder="Team B"
                />
              </div>
              <div>
                <label className="block text-xs text-white/30 mb-1">
                  Bowling Team
                </label>
                <input
                  type="text"
                  value={newInningsForm.bowlingTeam}
                  onChange={(e) =>
                    setNewInningsForm((f) => ({
                      ...f,
                      bowlingTeam: e.target.value,
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
                  placeholder="Team A"
                />
              </div>
              <div>
                <label className="block text-xs text-white/30 mb-1">
                  Striker
                </label>
                <input
                  type="text"
                  value={newInningsForm.batsman1}
                  onChange={(e) =>
                    setNewInningsForm((f) => ({
                      ...f,
                      batsman1: e.target.value,
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
                  placeholder="Batsman 1"
                />
              </div>
              <div>
                <label className="block text-xs text-white/30 mb-1">
                  Non-Striker
                </label>
                <input
                  type="text"
                  value={newInningsForm.batsman2}
                  onChange={(e) =>
                    setNewInningsForm((f) => ({
                      ...f,
                      batsman2: e.target.value,
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
                  placeholder="Batsman 2"
                />
              </div>
              <div>
                <label className="block text-xs text-white/30 mb-1">
                  Opening Bowler
                </label>
                <input
                  type="text"
                  value={newInningsForm.bowler}
                  onChange={(e) =>
                    setNewInningsForm((f) => ({
                      ...f,
                      bowler: e.target.value,
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
                  placeholder="Bowler name"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowNewInnings(false)}
                className="flex-1 bg-white/5 text-white/50 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startNewInnings}
                disabled={loading}
                className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? "Starting..." : "Start"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wicket Modal Sub-Component ──────────────────────────────────────────

function WicketModal({
  striker,
  nonStriker,
  bowlerName,
  onConfirm,
  onCancel,
}: {
  striker: BattingRecord | undefined;
  nonStriker: BattingRecord | undefined;
  bowlerName: string;
  onConfirm: (
    wicketType: string,
    fielderName: string,
    newBatsmanName: string,
    batsmanOut: string
  ) => void;
  onCancel: () => void;
}) {
  void bowlerName; // Reserved for future commentary display
  const [step, setStep] = useState<"type" | "details">("type");
  const [wicketType, setWicketType] = useState("");
  const [fielderName, setFielderName] = useState("");
  const [newBatsmanName, setNewBatsmanName] = useState("");
  const [batsmanOut, setBatsmanOut] = useState(
    striker?.player_name ?? ""
  );

  const wicketTypes = [
    { value: "bowled", label: "Bowled", icon: "🏏" },
    { value: "caught", label: "Caught", icon: "🤲" },
    { value: "lbw", label: "LBW", icon: "🦵" },
    { value: "run_out", label: "Run Out", icon: "🏃" },
    { value: "stumped", label: "Stumped", icon: "🧤" },
    { value: "hit_wicket", label: "Hit Wicket", icon: "💥" },
  ];

  const needsFielder =
    wicketType === "caught" ||
    wicketType === "run_out" ||
    wicketType === "stumped";

  const canSelectBatsmanOut = wicketType === "run_out";

  if (step === "type") {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-[#0a0f1a] rounded-2xl border border-white/10 w-full max-w-sm p-6 space-y-4">
          <h3 className="text-lg font-bold text-white text-center">
            Wicket Type
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {wicketTypes.map((wt) => (
              <button
                key={wt.value}
                onClick={() => {
                  setWicketType(wt.value);
                  setStep("details");
                }}
                className="bg-red-500/5 border border-red-500/10 rounded-xl py-4 text-center hover:bg-red-500/15 transition-colors"
              >
                <span className="text-2xl block mb-1">{wt.icon}</span>
                <span className="text-sm text-red-400 font-bold">
                  {wt.label}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={onCancel}
            className="w-full text-white/40 text-sm py-2 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0a0f1a] rounded-2xl border border-white/10 w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-white text-center capitalize">
          {wicketType.replace("_", " ")}
        </h3>

        {/* Who is out? (for run outs) */}
        {canSelectBatsmanOut && (
          <div>
            <label className="block text-xs text-white/30 mb-2">
              Who is out?
            </label>
            <div className="flex gap-2">
              {[striker, nonStriker].filter(Boolean).map((b) => (
                <button
                  key={b!.id}
                  onClick={() => setBatsmanOut(b!.player_name)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    batsmanOut === b!.player_name
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-white/5 text-white/50 border border-white/10"
                  }`}
                >
                  {b!.player_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fielder name */}
        {needsFielder && (
          <div>
            <label className="block text-xs text-white/30 mb-1">
              {wicketType === "caught"
                ? "Caught by"
                : wicketType === "stumped"
                  ? "Stumped by"
                  : "Fielder"}
            </label>
            <input
              type="text"
              value={fielderName}
              onChange={(e) => setFielderName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-red-400/50"
              placeholder="Fielder name"
              autoFocus
            />
          </div>
        )}

        {/* New batsman */}
        <div>
          <label className="block text-xs text-white/30 mb-1">
            New Batsman
          </label>
          <input
            type="text"
            value={newBatsmanName}
            onChange={(e) => setNewBatsmanName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50"
            placeholder="Next batsman name"
            autoFocus={!needsFielder}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("type")}
            className="flex-1 bg-white/5 text-white/50 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() =>
              onConfirm(
                wicketType,
                fielderName,
                newBatsmanName,
                batsmanOut
              )
            }
            disabled={!newBatsmanName.trim()}
            className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            Confirm Wicket
          </button>
        </div>
      </div>
    </div>
  );
}

