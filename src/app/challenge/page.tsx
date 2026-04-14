/**
 * FILE: src/app/challenge/page.tsx
 *
 * What this does:
 * The "Host Challenge" page — where a trusted person enters a secret code
 * to unlock host status. Once they're a host, they can create events.
 *
 * Flow:
 * 1. Avi generates a code in his Admin panel and sends it to someone
 * 2. That person opens this page, enters the code, clicks Claim
 * 3. If the code is valid and unclaimed → they instantly become a host
 * 4. The code is marked as used so nobody else can reuse it
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ClaimForm from "./claim-form";

export default async function ChallengePage() {
  const supabase = await createClient();

  // Must be logged in to claim host status
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/challenge");

  // Check if user is already a host or admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const alreadyHost = profile?.role === "host" || profile?.role === "admin";

  return (
    <main
      className="min-h-screen bg-[#030712] flex items-center justify-center px-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="w-full max-w-md">

        {/* ── ALREADY A HOST ──────────────────────────────────────── */}
        {alreadyHost ? (
          <div className="text-center">
            <div className="text-5xl mb-6">⚡</div>
            <h1 className="text-2xl font-extrabold text-white mb-3">
              You&apos;re already a host!
            </h1>
            <p className="text-white/40 text-sm mb-8">
              You have full host privileges. Go create some events.
            </p>
            <a
              href="/events/new"
              className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm px-8 py-3 rounded-full transition-colors"
            >
              Create an Event →
            </a>
          </div>

        ) : (

          /* ── CLAIM FORM ───────────────────────────────────────── */
          <div>
            {/* Header */}
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-1 rounded-full mb-6">
                Host Challenge
              </span>
              <h1 className="text-3xl font-extrabold text-white mb-3">
                Claim your host status
              </h1>
              <p className="text-white/40 text-sm leading-relaxed">
                Got a challenge code? Enter it below. <br />
                First one to claim it becomes a USC Host.
              </p>
            </div>

            {/* What being a host means */}
            <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-8">
              <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">
                As a host you can
              </p>
              <div className="space-y-3">
                {[
                  "Create and manage sports events",
                  "Set capacity limits and contributions",
                  "Confirm payments from players",
                  "Build your audience on USC",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="text-amber-500 font-bold">✓</span>
                    <span className="text-sm text-white/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* The code entry form */}
            <ClaimForm />
          </div>
        )}

      </div>
    </main>
  );
}
