/**
 * FILE: src/app/api/events/[id]/scoreboard/ball/route.ts
 *
 * POST — record a single ball delivery. Updates batting, bowling, and innings totals.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = createAdminClient();
  const eventId = params.id;

  // Verify user is host or admin
  const { data: event } = await admin
    .from("events")
    .select("host_id")
    .eq("id", eventId)
    .single();

  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (event.host_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const {
    inningsId,
    runs = 0,
    isWicket = false,
    wicketType = null,
    isWide = false,
    isNoball = false,
    isBye = false,
    isLegbye = false,
    isFour = false,
    isSix = false,
    fielderName = null,
    newBatsmanName = null,
    newBatsmanId = null,
    batsmanOut = null, // name of the batsman who got out (for run outs)
  } = body;

  if (!inningsId) {
    return NextResponse.json(
      { error: "inningsId is required" },
      { status: 400 }
    );
  }

  // Fetch current innings
  const { data: innings } = await admin
    .from("cricket_innings")
    .select("*")
    .eq("id", inningsId)
    .single();

  if (!innings)
    return NextResponse.json(
      { error: "Innings not found" },
      { status: 404 }
    );

  // Fetch current batsmen (striker and non-striker)
  const { data: batsmen } = await admin
    .from("cricket_batting")
    .select("*")
    .eq("innings_id", inningsId)
    .in("status", ["striker", "non_striker"])
    .order("batting_order", { ascending: true });

  if (!batsmen || batsmen.length < 2) {
    return NextResponse.json(
      { error: "Need both striker and non-striker at crease" },
      { status: 400 }
    );
  }

  const striker = batsmen.find((b) => b.status === "striker")!;
  const nonStriker = batsmen.find((b) => b.status === "non_striker")!;

  // Fetch current bowler (the one most recently added, or with the most recent ball)
  const { data: bowlers } = await admin
    .from("cricket_bowling")
    .select("*")
    .eq("innings_id", inningsId)
    .order("id", { ascending: false })
    .limit(1);

  if (!bowlers || bowlers.length === 0) {
    return NextResponse.json(
      { error: "No bowler found" },
      { status: 400 }
    );
  }

  const currentBowler = bowlers[0];

  // Determine legal delivery
  const isLegalDelivery = !isWide && !isNoball;

  // Calculate current over/ball
  const currentOver = Math.floor(innings.total_overs);

  // Count legal balls in the current over
  const { data: overBalls } = await admin
    .from("cricket_balls")
    .select("id")
    .eq("innings_id", inningsId)
    .eq("over_number", currentOver)
    .eq("is_wide", false)
    .eq("is_noball", false);

  const legalBallsInOver = overBalls?.length ?? 0;
  const ballNumber = legalBallsInOver + (isLegalDelivery ? 1 : 0);

  // Calculate runs to add to team total
  let totalRunsToAdd = runs;
  if (isWide) totalRunsToAdd += 1; // wide = 1 extra + any runs
  if (isNoball) totalRunsToAdd += 1; // noball = 1 extra + any runs

  // Record the ball
  const { data: ball, error: ballErr } = await admin
    .from("cricket_balls")
    .insert({
      innings_id: inningsId,
      over_number: currentOver,
      ball_number: isLegalDelivery ? ballNumber : legalBallsInOver,
      batsman_id: striker.player_id,
      batsman_name: striker.player_name,
      bowler_id: currentBowler.player_id,
      bowler_name: currentBowler.player_name,
      runs,
      is_wicket: isWicket,
      wicket_type: wicketType,
      is_wide: isWide,
      is_noball: isNoball,
      is_bye: isBye,
      is_legbye: isLegbye,
      is_four: isFour,
      is_six: isSix,
      fielder_name: fielderName,
      commentary: buildCommentary({
        runs,
        isWicket,
        wicketType,
        isWide,
        isNoball,
        isBye,
        isLegbye,
        isFour,
        isSix,
        batsmanName: striker.player_name,
        bowlerName: currentBowler.player_name,
      }),
    })
    .select()
    .single();

  if (ballErr) {
    return NextResponse.json({ error: ballErr.message }, { status: 500 });
  }

  // ── Update batsman stats ──────────────────────────────────────────
  // Runs scored by bat (not byes/legbyes, not wides)
  const batsmanRuns =
    isWide || isBye || isLegbye ? 0 : runs;
  const batsmanBalls = isLegalDelivery && !isWide ? 1 : 0;

  const newBatsmanRuns = striker.runs + batsmanRuns;
  const newBatsmanBalls = striker.balls_faced + batsmanBalls;
  const newFours = striker.fours + (isFour && !isWide && !isBye && !isLegbye ? 1 : 0);
  const newSixes = striker.sixes + (isSix && !isWide && !isBye && !isLegbye ? 1 : 0);
  const newSR = newBatsmanBalls > 0 ? parseFloat(((newBatsmanRuns / newBatsmanBalls) * 100).toFixed(2)) : 0;

  await admin
    .from("cricket_batting")
    .update({
      runs: newBatsmanRuns,
      balls_faced: newBatsmanBalls,
      fours: newFours,
      sixes: newSixes,
      strike_rate: newSR,
    })
    .eq("id", striker.id);

  // ── Update bowler stats ───────────────────────────────────────────
  const bowlerRunsConceded =
    currentBowler.runs_conceded + (isBye || isLegbye ? 0 : totalRunsToAdd);
  const bowlerWickets =
    currentBowler.wickets + (isWicket ? 1 : 0);
  const bowlerWides = currentBowler.wides + (isWide ? 1 : 0);
  const bowlerNoballs = currentBowler.noballs + (isNoball ? 1 : 0);
  const bowlerDots =
    currentBowler.dot_balls +
    (isLegalDelivery && runs === 0 && !isWicket ? 1 : 0);

  // Calculate new overs for bowler
  let bowlerLegalBalls = Math.round(
    (currentBowler.overs - Math.floor(currentBowler.overs)) * 10
  );
  if (isLegalDelivery) bowlerLegalBalls += 1;
  let bowlerCompletedOvers = Math.floor(currentBowler.overs);
  if (bowlerLegalBalls >= 6) {
    bowlerCompletedOvers += 1;
    bowlerLegalBalls = 0;
  }
  const bowlerOvers = parseFloat(
    `${bowlerCompletedOvers}.${bowlerLegalBalls}`
  );
  const bowlerTotalBalls = bowlerCompletedOvers * 6 + bowlerLegalBalls;
  const bowlerEconomy =
    bowlerTotalBalls > 0
      ? parseFloat(((bowlerRunsConceded / bowlerTotalBalls) * 6).toFixed(2))
      : 0;

  // Check maiden: if over is complete and 0 runs conceded this over
  let bowlerMaidens = currentBowler.maidens;
  const isOverComplete = isLegalDelivery && ballNumber >= 6;
  if (isOverComplete) {
    // Check if all balls in this over had 0 runs (excluding extras for maiden calc)
    const { data: thisOverBalls } = await admin
      .from("cricket_balls")
      .select("runs, is_wide, is_noball")
      .eq("innings_id", inningsId)
      .eq("over_number", currentOver);

    const overRuns = (thisOverBalls ?? []).reduce(
      (sum, b) => sum + b.runs + (b.is_wide ? 1 : 0) + (b.is_noball ? 1 : 0),
      0
    );
    // Include current ball
    const currentBallRuns = totalRunsToAdd;
    if (overRuns + currentBallRuns === 0) {
      bowlerMaidens += 1;
    }
  }

  await admin
    .from("cricket_bowling")
    .update({
      overs: bowlerOvers,
      maidens: bowlerMaidens,
      runs_conceded: bowlerRunsConceded,
      wickets: bowlerWickets,
      economy: bowlerEconomy,
      wides: bowlerWides,
      noballs: bowlerNoballs,
      dot_balls: bowlerDots,
    })
    .eq("id", currentBowler.id);

  // ── Update innings totals ─────────────────────────────────────────
  const newTotalRuns = innings.total_runs + totalRunsToAdd;
  const newTotalWickets = innings.total_wickets + (isWicket ? 1 : 0);

  // Calculate new overs for innings
  let inningsLegalBalls = Math.round(
    (innings.total_overs - Math.floor(innings.total_overs)) * 10
  );
  let inningsCompletedOvers = Math.floor(innings.total_overs);
  if (isLegalDelivery) inningsLegalBalls += 1;
  let overJustCompleted = false;
  if (inningsLegalBalls >= 6) {
    inningsCompletedOvers += 1;
    inningsLegalBalls = 0;
    overJustCompleted = true;
  }
  const newTotalOvers = parseFloat(
    `${inningsCompletedOvers}.${inningsLegalBalls}`
  );

  // Update extras
  const extras = innings.extras ?? {
    wides: 0,
    noballs: 0,
    byes: 0,
    legbyes: 0,
    total: 0,
  };
  if (isWide) {
    extras.wides = (extras.wides ?? 0) + 1 + runs;
  }
  if (isNoball) {
    extras.noballs = (extras.noballs ?? 0) + 1;
  }
  if (isBye) {
    extras.byes = (extras.byes ?? 0) + runs;
  }
  if (isLegbye) {
    extras.legbyes = (extras.legbyes ?? 0) + runs;
  }
  extras.total =
    (extras.wides ?? 0) +
    (extras.noballs ?? 0) +
    (extras.byes ?? 0) +
    (extras.legbyes ?? 0);

  await admin
    .from("cricket_innings")
    .update({
      total_runs: newTotalRuns,
      total_wickets: newTotalWickets,
      total_overs: newTotalOvers,
      extras,
    })
    .eq("id", inningsId);

  // ── Handle wicket: mark batsman out, add new batsman ──────────────
  if (isWicket) {
    // Determine which batsman is out (usually striker, but run outs can be non-striker)
    const outBatsman =
      batsmanOut && batsmanOut === nonStriker.player_name
        ? nonStriker
        : striker;

    await admin
      .from("cricket_batting")
      .update({
        status: "out",
        how_out: formatDismissal(wicketType, currentBowler.player_name, fielderName),
        bowler_name: currentBowler.player_name,
      })
      .eq("id", outBatsman.id);

    // Add new batsman if provided
    if (newBatsmanName) {
      // Get next batting order
      const { data: allBatsmen } = await admin
        .from("cricket_batting")
        .select("batting_order")
        .eq("innings_id", inningsId)
        .order("batting_order", { ascending: false })
        .limit(1);

      const nextOrder =
        allBatsmen && allBatsmen.length > 0
          ? allBatsmen[0].batting_order + 1
          : 3;

      // New batsman replaces whoever was out
      const newStatus =
        outBatsman.id === striker.id ? "striker" : "non_striker";

      await admin.from("cricket_batting").insert({
        innings_id: inningsId,
        player_id: newBatsmanId ?? null,
        player_name: newBatsmanName,
        runs: 0,
        balls_faced: 0,
        fours: 0,
        sixes: 0,
        strike_rate: 0,
        how_out: "not out",
        bowler_name: null,
        batting_order: nextOrder,
        status: newStatus,
      });
    }
  }

  // ── Rotate strike ─────────────────────────────────────────────────
  // Rotate on odd runs (1, 3), and also at end of over
  const shouldRotate = runs % 2 === 1;

  if (!isWicket || (isWicket && batsmanOut === nonStriker.player_name)) {
    // Only rotate existing batsmen if striker wasn't the one dismissed
    if (shouldRotate) {
      // Swap striker/non-striker
      await admin
        .from("cricket_batting")
        .update({ status: "non_striker" })
        .eq("id", striker.id)
        .eq("innings_id", inningsId);
      await admin
        .from("cricket_batting")
        .update({ status: "striker" })
        .eq("id", nonStriker.id)
        .eq("innings_id", inningsId);
    }
  }

  // At end of over, rotate strike (unless already rotated by odd runs)
  if (overJustCompleted) {
    // Fetch fresh batsmen status
    const { data: freshBatsmen } = await admin
      .from("cricket_batting")
      .select("*")
      .eq("innings_id", inningsId)
      .in("status", ["striker", "non_striker"]);

    if (freshBatsmen && freshBatsmen.length === 2) {
      const s = freshBatsmen.find((b) => b.status === "striker")!;
      const ns = freshBatsmen.find((b) => b.status === "non_striker")!;
      await admin
        .from("cricket_batting")
        .update({ status: "non_striker" })
        .eq("id", s.id);
      await admin
        .from("cricket_batting")
        .update({ status: "striker" })
        .eq("id", ns.id);
    }
  }

  // ── Return updated scoreboard ─────────────────────────────────────
  const { data: updatedInnings } = await admin
    .from("cricket_innings")
    .select("*")
    .eq("id", inningsId)
    .single();

  const { data: updatedBatting } = await admin
    .from("cricket_batting")
    .select("*")
    .eq("innings_id", inningsId)
    .order("batting_order", { ascending: true });

  const { data: updatedBowling } = await admin
    .from("cricket_bowling")
    .select("*")
    .eq("innings_id", inningsId)
    .order("id", { ascending: true });

  // Balls in the current (or new) over
  const newCurrentOver = overJustCompleted
    ? inningsCompletedOvers
    : currentOver;
  const { data: updatedOverBalls } = await admin
    .from("cricket_balls")
    .select("*")
    .eq("innings_id", inningsId)
    .eq("over_number", newCurrentOver)
    .order("id", { ascending: true });

  return NextResponse.json({
    ball,
    innings: updatedInnings,
    batting: updatedBatting ?? [],
    bowling: updatedBowling ?? [],
    currentOverBalls: updatedOverBalls ?? [],
    overJustCompleted,
  });
}

// ── Helper: build commentary text ─────────────────────────────────────
function buildCommentary(opts: {
  runs: number;
  isWicket: boolean;
  wicketType: string | null;
  isWide: boolean;
  isNoball: boolean;
  isBye: boolean;
  isLegbye: boolean;
  isFour: boolean;
  isSix: boolean;
  batsmanName: string;
  bowlerName: string;
}) {
  const parts: string[] = [];
  parts.push(`${opts.bowlerName} to ${opts.batsmanName},`);

  if (opts.isWicket) {
    parts.push(`OUT! ${opts.wicketType?.toUpperCase()}.`);
  } else if (opts.isWide) {
    parts.push(`wide${opts.runs > 0 ? ` + ${opts.runs}` : ""}`);
  } else if (opts.isNoball) {
    parts.push(`no ball${opts.runs > 0 ? `, ${opts.runs} runs` : ""}`);
  } else if (opts.isFour) {
    parts.push("FOUR!");
  } else if (opts.isSix) {
    parts.push("SIX!");
  } else if (opts.runs === 0) {
    parts.push("no run");
  } else {
    parts.push(
      `${opts.runs} run${opts.runs > 1 ? "s" : ""}${opts.isBye ? " (bye)" : ""}${opts.isLegbye ? " (leg bye)" : ""}`
    );
  }

  return parts.join(" ");
}

// ── Helper: format dismissal string ─────────────────────────────────
function formatDismissal(
  wicketType: string | null,
  bowlerName: string,
  fielderName: string | null
) {
  switch (wicketType) {
    case "bowled":
      return `b ${bowlerName}`;
    case "caught":
      return fielderName
        ? `c ${fielderName} b ${bowlerName}`
        : `c & b ${bowlerName}`;
    case "lbw":
      return `lbw b ${bowlerName}`;
    case "run_out":
      return fielderName ? `run out (${fielderName})` : "run out";
    case "stumped":
      return fielderName
        ? `st ${fielderName} b ${bowlerName}`
        : `st b ${bowlerName}`;
    case "hit_wicket":
      return `hit wicket b ${bowlerName}`;
    default:
      return wicketType ?? "out";
  }
}
