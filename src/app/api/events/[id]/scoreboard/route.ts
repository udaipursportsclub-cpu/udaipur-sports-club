/**
 * FILE: src/app/api/events/[id]/scoreboard/route.ts
 *
 * GET  — returns full scoreboard data (innings, batting, bowling, recent balls)
 * POST — start a new innings
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// ── GET: Full scoreboard data ───────────────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();
  const eventId = params.id;

  // Fetch all innings for this event
  const { data: innings, error: inningsErr } = await admin
    .from("cricket_innings")
    .select("*")
    .eq("event_id", eventId)
    .order("innings_number", { ascending: true });

  if (inningsErr) {
    return NextResponse.json({ error: inningsErr.message }, { status: 500 });
  }

  if (!innings || innings.length === 0) {
    return NextResponse.json({ innings: [], batting: [], bowling: [], balls: [] });
  }

  // Get the active or latest innings
  const activeInnings =
    innings.find((i) => i.status === "in_progress") ?? innings[innings.length - 1];

  // Fetch batting for all innings
  const { data: batting } = await admin
    .from("cricket_batting")
    .select("*")
    .in(
      "innings_id",
      innings.map((i) => i.id)
    )
    .order("batting_order", { ascending: true });

  // Fetch bowling for all innings
  const { data: bowling } = await admin
    .from("cricket_bowling")
    .select("*")
    .in(
      "innings_id",
      innings.map((i) => i.id)
    )
    .order("id", { ascending: true });

  // Fetch balls for current over of active innings
  const currentOver = Math.floor(activeInnings.total_overs);
  const { data: balls } = await admin
    .from("cricket_balls")
    .select("*")
    .eq("innings_id", activeInnings.id)
    .order("id", { ascending: true });

  // Get balls in current over (legal balls in this over)
  const currentOverBalls = (balls ?? []).filter(
    (b) => b.over_number === currentOver
  );

  return NextResponse.json({
    innings,
    activeInningsId: activeInnings.id,
    batting: batting ?? [],
    bowling: bowling ?? [],
    balls: balls ?? [],
    currentOverBalls,
  });
}

// ── POST: Start new innings ─────────────────────────────────────────────
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = createAdminClient();
  const eventId = params.id;

  // Verify user is host
  const { data: event } = await admin
    .from("events")
    .select("host_id")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (event.host_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { battingTeam, bowlingTeam, batsmen, bowler } = body;

  if (!battingTeam || !bowlingTeam || !batsmen || batsmen.length < 2 || !bowler) {
    return NextResponse.json(
      { error: "Need battingTeam, bowlingTeam, 2 batsmen, and a bowler" },
      { status: 400 }
    );
  }

  // Check existing innings count
  const { data: existingInnings } = await admin
    .from("cricket_innings")
    .select("id, innings_number")
    .eq("event_id", eventId)
    .order("innings_number", { ascending: false })
    .limit(1);

  const nextInningsNumber = existingInnings && existingInnings.length > 0
    ? existingInnings[0].innings_number + 1
    : 1;

  // Mark any in-progress innings as completed
  await admin
    .from("cricket_innings")
    .update({ status: "completed" })
    .eq("event_id", eventId)
    .eq("status", "in_progress");

  // Create the new innings
  const { data: newInnings, error: createErr } = await admin
    .from("cricket_innings")
    .insert({
      event_id: eventId,
      innings_number: nextInningsNumber,
      batting_team: battingTeam,
      bowling_team: bowlingTeam,
      total_runs: 0,
      total_wickets: 0,
      total_overs: 0,
      extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 0 },
      status: "in_progress",
    })
    .select()
    .single();

  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 500 });
  }

  // Create batting records for the two opening batsmen
  const battingRecords = batsmen.map(
    (b: { name: string; id?: string }, idx: number) => ({
      innings_id: newInnings.id,
      player_id: b.id ?? null,
      player_name: b.name,
      runs: 0,
      balls_faced: 0,
      fours: 0,
      sixes: 0,
      strike_rate: 0,
      how_out: "not out",
      bowler_name: null,
      batting_order: idx + 1,
      status: idx === 0 ? "striker" : "non_striker",
    })
  );

  await admin.from("cricket_batting").insert(battingRecords);

  // Create bowling record for the opening bowler
  await admin.from("cricket_bowling").insert({
    innings_id: newInnings.id,
    player_id: bowler.id ?? null,
    player_name: bowler.name,
    overs: 0,
    maidens: 0,
    runs_conceded: 0,
    wickets: 0,
    economy: 0,
    wides: 0,
    noballs: 0,
    dot_balls: 0,
  });

  return NextResponse.json({ innings: newInnings }, { status: 201 });
}

// ── PATCH: Add a new bowler or perform other updates ────────────────
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = createAdminClient();
  const eventId = params.id;

  // Verify user is host
  const { data: event } = await admin
    .from("events")
    .select("host_id")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (event.host_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();

  if (body.action === "add_bowler") {
    const { inningsId, bowlerName } = body;
    if (!inningsId || !bowlerName) {
      return NextResponse.json({ error: "inningsId and bowlerName required" }, { status: 400 });
    }

    // Check if this bowler already has a record in this innings
    const { data: existingBowler } = await admin
      .from("cricket_bowling")
      .select("*")
      .eq("innings_id", inningsId)
      .eq("player_name", bowlerName)
      .single();

    if (!existingBowler) {
      // Create new bowling record
      await admin.from("cricket_bowling").insert({
        innings_id: inningsId,
        player_id: null,
        player_name: bowlerName,
        overs: 0,
        maidens: 0,
        runs_conceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noballs: 0,
        dot_balls: 0,
      });
    }

    // Return updated bowling list
    const { data: bowling } = await admin
      .from("cricket_bowling")
      .select("*")
      .eq("innings_id", inningsId)
      .order("id", { ascending: true });

    return NextResponse.json({ bowling: bowling ?? [] });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
