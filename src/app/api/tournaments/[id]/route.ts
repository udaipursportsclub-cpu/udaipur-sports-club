/**
 * FILE: src/app/api/tournaments/[id]/route.ts
 *
 * GET: Full tournament data — tournament + teams + players + matches
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();

  // Fetch tournament
  const { data: tournament, error: tErr } = await admin
    .from("tournaments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (tErr || !tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Fetch teams with their players
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

  return NextResponse.json({
    tournament,
    teams:   teams   ?? [],
    matches: matches ?? [],
  });
}
