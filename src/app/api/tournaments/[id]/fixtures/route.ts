/**
 * FILE: src/app/api/tournaments/[id]/fixtures/route.ts
 *
 * POST: Auto-generate fixtures based on tournament format (host only)
 * - Knockout: random seeding, single-elimination bracket
 * - League / Round Robin: every team plays every other team
 * - Groups + Knockout: not yet implemented (future)
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch tournament
  const { data: tournament } = await admin
    .from("tournaments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.host_id !== user.id) {
    return NextResponse.json({ error: "Only the host can generate fixtures" }, { status: 403 });
  }

  // Fetch teams
  const { data: teams } = await admin
    .from("tournament_teams")
    .select("id, name, seed")
    .eq("tournament_id", params.id)
    .order("seed", { ascending: true });

  if (!teams || teams.length < 2) {
    return NextResponse.json({ error: "Need at least 2 teams to generate fixtures" }, { status: 400 });
  }

  // Delete existing matches (re-generate)
  await admin.from("tournament_matches").delete().eq("tournament_id", params.id);

  // Shuffle teams randomly for seeding
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  // Update seeds based on shuffle
  for (let i = 0; i < shuffled.length; i++) {
    await admin.from("tournament_teams").update({ seed: i + 1 }).eq("id", shuffled[i].id);
  }

  let matches: {
    tournament_id: string;
    round: number;
    match_number: number;
    team_a_id: string | null;
    team_b_id: string | null;
    status: string;
  }[] = [];

  if (tournament.format === "knockout" || tournament.format === "groups_knockout") {
    matches = generateKnockoutBracket(params.id, shuffled);
  } else {
    // League / Round Robin
    matches = generateRoundRobin(params.id, shuffled);
  }

  // Insert all matches
  const { error: insertErr } = await admin
    .from("tournament_matches")
    .insert(matches);

  if (insertErr) {
    return NextResponse.json({ error: "Failed to generate fixtures" }, { status: 500 });
  }

  // Update tournament status to "active"
  await admin
    .from("tournaments")
    .update({ status: "active" })
    .eq("id", params.id);

  return NextResponse.json({ success: true, matchCount: matches.length });
}

/**
 * Generate single-elimination knockout bracket.
 * If team count is not a power of 2, some teams get byes in round 1.
 */
function generateKnockoutBracket(
  tournamentId: string,
  teams: { id: string }[]
) {
  const n = teams.length;
  // Find next power of 2
  let bracketSize = 1;
  while (bracketSize < n) bracketSize *= 2;

  const totalRounds = Math.log2(bracketSize);
  const matches: {
    tournament_id: string;
    round: number;
    match_number: number;
    team_a_id: string | null;
    team_b_id: string | null;
    status: string;
  }[] = [];

  // Round 1 — pair teams, byes go to higher seeds
  const byes = bracketSize - n;
  let matchNum = 1;

  // Teams that get byes (first 'byes' teams advance automatically)
  // Teams that play in round 1
  const round1Players = teams.slice(byes);

  for (let i = 0; i < round1Players.length; i += 2) {
    matches.push({
      tournament_id: tournamentId,
      round:         1,
      match_number:  matchNum++,
      team_a_id:     round1Players[i]?.id ?? null,
      team_b_id:     round1Players[i + 1]?.id ?? null,
      status:        "upcoming",
    });
  }

  // Generate placeholder matches for rounds 2+
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let m = 0; m < matchesInRound; m++) {
      // For round 2, pre-fill bye teams
      let teamA: string | null = null;
      let teamB: string | null = null;

      if (round === 2 && byes > 0) {
        // Bye teams fill into round 2 slots
        const byeIndex = m * 2;
        if (byeIndex < byes) teamA = teams[byeIndex]?.id ?? null;
        if (byeIndex + 1 < byes) teamB = teams[byeIndex + 1]?.id ?? null;
      }

      matches.push({
        tournament_id: tournamentId,
        round,
        match_number:  matchNum++,
        team_a_id:     teamA,
        team_b_id:     teamB,
        status:        "upcoming",
      });
    }
  }

  return matches;
}

/**
 * Generate round-robin fixtures — every team plays every other team once.
 */
function generateRoundRobin(
  tournamentId: string,
  teams: { id: string }[]
) {
  const matches: {
    tournament_id: string;
    round: number;
    match_number: number;
    team_a_id: string | null;
    team_b_id: string | null;
    status: string;
  }[] = [];

  let matchNum = 1;
  let round = 1;

  // Simple all-pairs generation, grouped into rounds
  const n = teams.length;
  const isOdd = n % 2 !== 0;
  const teamList = [...teams];
  if (isOdd) teamList.push({ id: "BYE" } as { id: string });

  const numRounds = teamList.length - 1;
  const halfSize = teamList.length / 2;

  // Circle method for round-robin scheduling
  const fixed = teamList[0];
  const rotating = teamList.slice(1);

  for (let r = 0; r < numRounds; r++) {
    const current = [fixed, ...rotating];
    for (let m = 0; m < halfSize; m++) {
      const teamA = current[m];
      const teamB = current[current.length - 1 - m];

      // Skip bye matches
      if (teamA.id === "BYE" || teamB.id === "BYE") continue;

      matches.push({
        tournament_id: tournamentId,
        round,
        match_number:  matchNum++,
        team_a_id:     teamA.id,
        team_b_id:     teamB.id,
        status:        "upcoming",
      });
    }
    round++;
    // Rotate: move last element to front of rotating array
    rotating.unshift(rotating.pop()!);
  }

  return matches;
}
