/**
 * FILE: src/app/tournaments/[id]/match-result-client.tsx
 *
 * Client component — form to record a single match result.
 * Host enters scores and picks a winner, then submits.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState }  from "react";

export default function MatchResultClient({
  matchId,
  tournamentId,
  teamAId,
  teamBId,
  teamAName,
  teamBName,
}: {
  matchId: string;
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
}) {
  const router = useRouter();
  const [scoreA, setScoreA]     = useState("");
  const [scoreB, setScoreB]     = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!winnerId) {
      setError("Pick a winner");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winner_id: winnerId,
        score_a:   scoreA ? Number(scoreA) : null,
        score_b:   scoreB ? Number(scoreB) : null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to save result");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      <div className="flex items-center gap-2 mb-3">
        {/* Score A */}
        <input
          type="number"
          value={scoreA}
          onChange={e => setScoreA(e.target.value)}
          placeholder="0"
          min={0}
          className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:border-amber-400/50 focus:outline-none transition"
        />
        <span className="text-xs text-white/40">-</span>
        {/* Score B */}
        <input
          type="number"
          value={scoreB}
          onChange={e => setScoreB(e.target.value)}
          placeholder="0"
          min={0}
          className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:border-amber-400/50 focus:outline-none transition"
        />
      </div>

      {/* Winner selection */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setWinnerId(teamAId)}
          className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all ${
            winnerId === teamAId
              ? "bg-green-400/10 border-green-400/30 text-green-400"
              : "bg-white/[0.03] border-white/5 text-white/40 hover:text-white/60"
          }`}
        >
          {teamAName} wins
        </button>
        <button
          type="button"
          onClick={() => setWinnerId(teamBId)}
          className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all ${
            winnerId === teamBId
              ? "bg-green-400/10 border-green-400/30 text-green-400"
              : "bg-white/[0.03] border-white/5 text-white/40 hover:text-white/60"
          }`}
        >
          {teamBName} wins
        </button>
      </div>

      <button
        type="submit"
        disabled={saving || !winnerId}
        className="text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black px-4 py-2 rounded-lg disabled:opacity-40 transition"
      >
        {saving ? "Saving..." : "Save Result"}
      </button>
    </form>
  );
}
