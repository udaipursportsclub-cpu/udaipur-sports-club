/**
 * FILE: src/app/api/tournaments/[id]/matches/[matchId]/route.ts
 *
 * PUT: Record match result — winner, scores (host only)
 * Auto-advances bracket for knockout tournaments.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string; matchId: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = createAdminClient();

  // Verify host
  const { data: tournament } = await admin
    .from("tournaments")
    .select("host_id, format")
    .eq("id", params.id)
    .single();

  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.host_id !== user.id) {
    return NextResponse.json({ error: "Only the host can record results" }, { status: 403 });
  }

  const body = await request.json();
  const { winner_id, score_a, score_b } = body;

  if (!winner_id) {
    return NextResponse.json({ error: "Winner is required" }, { status: 400 });
  }

  // Update the match
  const { data: match, error: matchErr } = await admin
    .from("tournament_matches")
    .update({
      winner_id,
      score_a:      score_a ?? null,
      score_b:      score_b ?? null,
      status:       "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", params.matchId)
    .select()
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
  }

  // For knockout: advance the winner to the next round
  if (tournament.format === "knockout" || tournament.format === "groups_knockout") {
    await advanceKnockoutWinner(admin, params.id, match, winner_id);
  }

  // Check if tournament is complete
  await checkTournamentComplete(admin, params.id, tournament.format);

  return NextResponse.json({ success: true, match });
}

/**
 * Advance the winner to the next round in a knockout bracket.
 */
async function advanceKnockoutWinner(
  admin: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  match: { round: number; match_number: number },
  winnerId: string
) {
  // Find the next round match this winner should go to
  const nextRound = match.round + 1;

  // Get all matches in the next round
  const { data: nextMatches } = await admin
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("round", nextRound)
    .order("match_number", { ascending: true });

  if (!nextMatches || nextMatches.length === 0) return; // Final match, no next round

  // Find all matches in current round to determine pairing
  const { data: currentRoundMatches } = await admin
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("round", match.round)
    .order("match_number", { ascending: true });

  if (!currentRoundMatches) return;

  // Find the index of this match in the current round
  const matchIndex = currentRoundMatches.findIndex(m => m.match_number === match.match_number);
  // Winners of matches 0,1 go to next match 0; winners of 2,3 go to next match 1, etc.
  const nextMatchIndex = Math.floor(matchIndex / 2);

  if (nextMatchIndex >= nextMatches.length) return;

  const nextMatch = nextMatches[nextMatchIndex];
  const isFirstSlot = matchIndex % 2 === 0;

  // Place winner in team_a or team_b slot
  await admin
    .from("tournament_matches")
    .update(isFirstSlot ? { team_a_id: winnerId } : { team_b_id: winnerId })
    .eq("id", nextMatch.id);
}

/**
 * Check if all matches are done — if so, mark tournament as completed
 * and set winner/runner-up for knockout.
 */
async function checkTournamentComplete(
  admin: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  format: string
) {
  const { data: allMatches } = await admin
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (!allMatches) return;

  const allDone = allMatches.every(m => m.status === "completed");
  if (!allDone) return;

  if (format === "knockout" || format === "groups_knockout") {
    // Final match — winner is champion, loser is runner-up
    const finalMatch = allMatches.reduce((a, b) => a.round > b.round ? a : b);
    const winnerId = finalMatch.winner_id;
    const runnerId = finalMatch.team_a_id === winnerId ? finalMatch.team_b_id : finalMatch.team_a_id;

    await admin
      .from("tournaments")
      .update({
        status:           "completed",
        winner_team_id:   winnerId,
        runner_up_team_id: runnerId,
      })
      .eq("id", tournamentId);
  } else {
    // League — just mark as completed (standings calculated from results)
    await admin
      .from("tournaments")
      .update({ status: "completed" })
      .eq("id", tournamentId);
  }
}
