/**
 * FILE: src/app/api/tournaments/[id]/teams/route.ts
 *
 * POST: Add a team with players to the tournament (host only)
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

  // Verify this user is the tournament host
  const { data: tournament } = await admin
    .from("tournaments")
    .select("host_id, max_teams")
    .eq("id", params.id)
    .single();

  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.host_id !== user.id) {
    return NextResponse.json({ error: "Only the host can add teams" }, { status: 403 });
  }

  // Check team count
  const { count } = await admin
    .from("tournament_teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", params.id);

  if ((count ?? 0) >= tournament.max_teams) {
    return NextResponse.json({ error: "Tournament is full — max teams reached" }, { status: 400 });
  }

  const body = await request.json();
  const { name, players } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  }

  // Insert team
  const { data: team, error: teamErr } = await admin
    .from("tournament_teams")
    .insert({
      tournament_id: params.id,
      name:          name.trim(),
      seed:          (count ?? 0) + 1,
    })
    .select()
    .single();

  if (teamErr || !team) {
    return NextResponse.json({ error: "Failed to add team" }, { status: 500 });
  }

  // Insert players if provided
  if (players && Array.isArray(players) && players.length > 0) {
    const playerRows = players.map((p: { user_name: string; user_id?: string; role?: string }) => ({
      team_id:   team.id,
      user_name: p.user_name.trim(),
      user_id:   p.user_id || null,
      role:      p.role || "player",
    }));

    await admin.from("tournament_players").insert(playerRows);
  }

  return NextResponse.json({ team });
}
