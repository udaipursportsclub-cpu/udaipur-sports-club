/**
 * FILE: src/app/tournaments/[id]/tournament-actions.tsx
 *
 * Client component — host controls: add teams, generate fixtures.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState }  from "react";

export default function TournamentActions({
  tournamentId,
  status,
  teamCount,
  maxTeams,
  hasMatches,
}: {
  tournamentId: string;
  status: string;
  teamCount: number;
  maxTeams: number;
  hasMatches: boolean;
}) {
  const router = useRouter();

  // Add team state
  const [showAddTeam, setShowAddTeam]   = useState(false);
  const [teamName, setTeamName]         = useState("");
  const [playerNames, setPlayerNames]   = useState("");
  const [addingTeam, setAddingTeam]     = useState(false);
  const [teamError, setTeamError]       = useState<string | null>(null);

  // Fixture generation state
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState<string | null>(null);

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    setAddingTeam(true);
    setTeamError(null);

    const players = playerNames
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map((name, i) => ({
        user_name: name,
        role:      i === 0 ? "captain" : "player",
      }));

    const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: teamName.trim(), players }),
    });

    const data = await res.json();

    if (!res.ok) {
      setTeamError(data.error ?? "Failed to add team");
      setAddingTeam(false);
      return;
    }

    setTeamName("");
    setPlayerNames("");
    setShowAddTeam(false);
    setAddingTeam(false);
    router.refresh();
  }

  async function handleGenerateFixtures() {
    if (!confirm("This will generate fixtures and start the tournament. Any existing fixtures will be replaced. Continue?")) return;

    setGenerating(true);
    setGenError(null);

    const res = await fetch(`/api/tournaments/${tournamentId}/fixtures`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok) {
      setGenError(data.error ?? "Failed to generate fixtures");
      setGenerating(false);
      return;
    }

    setGenerating(false);
    router.refresh();
  }

  const canAddTeams = teamCount < maxTeams && status !== "completed";
  const canGenerate = teamCount >= 2 && status !== "completed";

  return (
    <div className="bg-amber-400/5 border border-amber-400/10 rounded-2xl p-6 mb-6">
      <h2 className="text-xs font-bold tracking-widest uppercase text-amber-400 mb-4">Host Controls</h2>

      <div className="flex flex-wrap gap-3 mb-4">
        {canAddTeams && (
          <button
            onClick={() => setShowAddTeam(!showAddTeam)}
            className="text-xs font-bold bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2.5 rounded-xl transition-colors border border-white/5"
          >
            + Add Team
          </button>
        )}

        {canGenerate && (
          <button
            onClick={handleGenerateFixtures}
            disabled={generating}
            className="text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black px-4 py-2.5 rounded-xl transition-opacity disabled:opacity-50"
          >
            {generating ? "Generating..." : hasMatches ? "Regenerate Fixtures" : "Generate Fixtures & Start"}
          </button>
        )}
      </div>

      {genError && (
        <p className="text-xs text-red-400 mb-3">{genError}</p>
      )}

      {/* Add Team Form */}
      {showAddTeam && (
        <form onSubmit={handleAddTeam} className="bg-white/[0.03] rounded-xl border border-white/5 p-4 space-y-3">
          {teamError && (
            <p className="text-xs text-red-400">{teamError}</p>
          )}
          <div>
            <label className="block text-[10px] font-bold tracking-widest uppercase text-white/50 mb-1">
              Team Name *
            </label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              required
              placeholder="e.g. Udaipur Warriors"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest uppercase text-white/50 mb-1">
              Players <span className="normal-case text-white/30">(one per line, first = captain)</span>
            </label>
            <textarea
              value={playerNames}
              onChange={e => setPlayerNames(e.target.value)}
              rows={4}
              placeholder={"Rahul Sharma\nAmit Patel\nVikram Singh"}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none transition resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addingTeam}
              className="text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black px-4 py-2 rounded-lg disabled:opacity-50 transition"
            >
              {addingTeam ? "Adding..." : "Add Team"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddTeam(false)}
              className="text-xs font-bold text-white/50 hover:text-white/50 px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
