/**
 * FILE: src/app/events/[id]/scoreboard/score/page.tsx
 *
 * The host's scoring interface. Server component that checks if the
 * current user is the host. If not, redirects to the scoreboard viewer.
 * Renders the ScoringPanel client component for the actual controls.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import ScoringPanel from "./scoring-panel";

export default async function ScorePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const eventId = params.id;

  // Check who's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/events/${eventId}/scoreboard`);
  }

  const admin = createAdminClient();

  // Fetch event
  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  // Check if host or admin
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isHost = event.host_id === user.id;
  const isAdmin = profile?.role === "admin";

  if (!isHost && !isAdmin) {
    redirect(`/events/${eventId}/scoreboard`);
  }

  // Fetch existing innings
  const { data: innings } = await admin
    .from("cricket_innings")
    .select("*")
    .eq("event_id", eventId)
    .order("innings_number", { ascending: true });

  const allInnings = innings ?? [];
  const activeInnings = allInnings.find((i) => i.status === "in_progress");

  // Fetch batting and bowling for active innings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let batting: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bowling: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentOverBalls: any[] = [];

  if (activeInnings) {
    const { data: b } = await admin
      .from("cricket_batting")
      .select("*")
      .eq("innings_id", activeInnings.id)
      .order("batting_order", { ascending: true });
    batting = b ?? [];

    const { data: bw } = await admin
      .from("cricket_bowling")
      .select("*")
      .eq("innings_id", activeInnings.id)
      .order("id", { ascending: true });
    bowling = bw ?? [];

    const currentOver = Math.floor(activeInnings.total_overs);
    const { data: balls } = await admin
      .from("cricket_balls")
      .select("*")
      .eq("innings_id", activeInnings.id)
      .eq("over_number", currentOver)
      .order("id", { ascending: true });
    currentOverBalls = balls ?? [];
  }

  return (
    <main
      className="min-h-screen bg-[#030712]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}/scoreboard`}
            className="text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-full transition-colors"
          >
            View Scoreboard
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            &larr; Event
          </Link>
        </div>
      </nav>

      <ScoringPanel
        eventId={eventId}
        allInnings={allInnings}
        activeInnings={activeInnings ?? null}
        initialBatting={batting}
        initialBowling={bowling}
        initialOverBalls={currentOverBalls}
      />
    </main>
  );
}
