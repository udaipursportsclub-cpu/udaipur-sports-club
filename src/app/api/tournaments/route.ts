/**
 * FILE: src/app/api/tournaments/route.ts
 *
 * POST: Create a new tournament (host/admin only)
 * GET:  List all tournaments with team counts
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function GET() {
  const admin = createAdminClient();

  const { data: tournaments, error } = await admin
    .from("tournaments")
    .select("*, tournament_teams(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load tournaments" }, { status: 500 });
  }

  return NextResponse.json({ tournaments: tournaments ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify logged-in user is a host or admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["host", "proxy", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Not authorized — only hosts can create tournaments" }, { status: 403 });
  }

  const body = await request.json();
  const {
    title, sport, format, team_size, max_teams,
    entry_fee, upi_id, description, start_date, end_date, rules,
  } = body;

  if (!title || !sport || !format || !team_size || !max_teams) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: tournament, error: insertError } = await admin
    .from("tournaments")
    .insert({
      title:       title.trim(),
      sport,
      format,
      team_size:   Number(team_size),
      max_teams:   Number(max_teams),
      entry_fee:   Number(entry_fee ?? 0),
      upi_id:      Number(entry_fee) > 0 ? upi_id?.trim() : null,
      description: description?.trim() || null,
      start_date:  start_date || null,
      end_date:    end_date || null,
      rules:       rules?.trim() || null,
      host_id:     user.id,
      host_name:   user.user_metadata?.full_name ?? "Unknown Host",
      status:      "draft",
    })
    .select()
    .single();

  if (insertError || !tournament) {
    return NextResponse.json({ error: "Failed to create tournament" }, { status: 500 });
  }

  return NextResponse.json({ id: tournament.id });
}
