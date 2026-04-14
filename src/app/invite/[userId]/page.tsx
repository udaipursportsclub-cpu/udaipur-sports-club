/**
 * FILE: src/app/invite/[userId]/page.tsx
 *
 * "Friend Invite" landing page.
 * When someone shares their invite link, the recipient sees this page —
 * designed to make them immediately want to join.
 *
 * URL: /invite/[userId]
 */

import { createClient }    from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSportEmoji }   from "@/lib/types";
import { notFound }        from "next/navigation";
import { type Metadata }   from "next";
import Link                from "next/link";
import Image               from "next/image";

export async function generateMetadata({
  params,
}: {
  params: { userId: string };
}): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", params.userId)
    .single();

  const name = profile?.full_name ?? "A friend";
  return {
    title: `${name} invites you to USC`,
    description: `${name} wants you on Udaipur Sports Club — the home for every sport in the City of Lakes.`,
  };
}

export default async function InvitePage({
  params,
}: {
  params: { userId: string };
}) {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the inviter's profile
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role, created_at")
    .eq("id", params.userId)
    .single();

  if (!profile) notFound();

  // Inviter's stats
  const [
    { count: gamesPlayed },
    { data: rsvps },
    { count: memberCount },
  ] = await Promise.all([
    admin.from("rsvps").select("*", { count: "exact", head: true }).eq("user_id", params.userId),
    admin.from("rsvps").select("events(sport)").eq("user_id", params.userId).limit(20),
    admin.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  // Sports the inviter plays
  const sportSet = new Set<string>();
  for (const r of rsvps ?? []) {
    const sp = (r.events as { sport?: string } | null)?.sport;
    if (sp) sportSet.add(sp);
  }
  const topSports = Array.from(sportSet).slice(0, 4);

  const firstName = (profile.full_name ?? "A friend").split(" ")[0];

  return (
    <main
      className="min-h-screen bg-[#0C1B35]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-md mx-auto px-6 py-16 flex flex-col items-center text-center min-h-screen justify-center">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-12">
          <Image src="/logo.svg" alt="USC" width={44} height={44} className="rounded-full" />
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white">USC</span>
        </Link>

        {/* Inviter avatar */}
        <div className="w-20 h-20 rounded-full bg-amber-400 flex items-center justify-center text-white text-3xl font-black mb-4 ring-4 ring-amber-400/20">
          {firstName.charAt(0)}
        </div>

        <p className="text-white/50 text-sm mb-1">You&apos;ve been invited by</p>
        <h1 className="text-3xl font-extrabold text-white mb-2">{profile.full_name}</h1>

        {/* Their stats */}
        <div className="flex items-center gap-4 mt-4 mb-8">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-amber-400">{gamesPlayed ?? 0}</p>
            <p className="text-xs text-white/40 font-medium">Games played</p>
          </div>
          {topSports.length > 0 && (
            <div className="w-px h-10 bg-white/10" />
          )}
          {topSports.length > 0 && (
            <div className="text-center">
              <p className="text-2xl">{topSports.map(s => getSportEmoji(s)).join(" ")}</p>
              <p className="text-xs text-white/40 font-medium">Sports played</p>
            </div>
          )}
        </div>

        {/* Pitch */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8 w-full">
          <p className="text-white text-base leading-relaxed">
            Join <strong className="text-amber-400">{firstName}</strong> and{" "}
            <strong className="text-amber-400">{(memberCount ?? 0).toLocaleString()}</strong> athletes
            playing sports across Udaipur.
          </p>
          <p className="text-white/50 text-sm mt-2">
            Cricket, Football, Badminton, Tennis &amp; more — all in one place.
          </p>
        </div>

        {/* CTA */}
        {user ? (
          <Link
            href="/events"
            className="w-full bg-amber-500 hover:bg-amber-400 text-white font-extrabold text-base py-4 rounded-2xl transition-all text-center block shadow-xl shadow-amber-500/30"
          >
            Browse Events →
          </Link>
        ) : (
          <Link
            href="/login"
            className="w-full bg-amber-500 hover:bg-amber-400 text-white font-extrabold text-base py-4 rounded-2xl transition-all text-center block shadow-xl shadow-amber-500/30"
          >
            Join Free — It&apos;s on us 🏅
          </Link>
        )}

        <p className="text-white/20 text-xs mt-6">
          Udaipur Sports Club · City of Lakes
        </p>

      </div>
    </main>
  );
}
