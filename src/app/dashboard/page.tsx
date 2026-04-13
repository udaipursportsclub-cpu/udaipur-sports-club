/**
 * FILE: src/app/dashboard/page.tsx
 *
 * What this does:
 * This is the page users see right after they log in.
 * For now it just shows a welcome message with their name and photo
 * from Google. We'll build out the full dashboard over time.
 *
 * This is a "server component" — it runs on the server before the page
 * loads, so it can securely check if the user is actually logged in.
 * If they're not logged in, it sends them to the login page instead.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Check if there's a logged-in user
  // If not, kick them to the login page
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in — send to login page
    redirect("/login");
  }

  // Pull the user's name and photo from their Google account
  const userName = user.user_metadata?.full_name ?? "Athlete";
  const userAvatar = user.user_metadata?.avatar_url ?? null;
  const userEmail = user.email ?? "";

  return (
    // Full screen, warm off-white background
    <main
      className="min-h-screen bg-[#F9F7F4]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >

      {/* ── TOP NAVIGATION BAR ─────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">

        {/* Club name / logo */}
        <span className="text-sm font-bold tracking-[0.25em] uppercase text-slate-900">
          USC
        </span>

        {/* User info — avatar + name on the right */}
        <div className="flex items-center gap-3">
          {userAvatar ? (
            // Google profile photo
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatar}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            // Fallback if no photo — show first letter of name
            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-sm font-bold">
              {userName.charAt(0)}
            </div>
          )}
          <span className="text-sm font-medium text-slate-700 hidden sm:block">
            {userName}
          </span>
        </div>

      </nav>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">

        {/* Welcome message */}
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full mb-8">
          Welcome to USC
        </span>

        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
          Hello, {userName.split(" ")[0]}!
        </h1>

        <p className="text-slate-500 text-lg mb-2">
          You&apos;re signed in as
        </p>
        <p className="text-slate-400 text-sm mb-12">
          {userEmail}
        </p>

        {/* Placeholder cards — features coming soon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">

          {/* Card 1 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 opacity-50">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Events</p>
            <p className="text-2xl font-extrabold text-slate-900">0</p>
            <p className="text-xs text-slate-400 mt-1">No events yet</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 opacity-50">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">RSVPs</p>
            <p className="text-2xl font-extrabold text-slate-900">0</p>
            <p className="text-xs text-slate-400 mt-1">No RSVPs yet</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 opacity-50">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Members</p>
            <p className="text-2xl font-extrabold text-slate-900">1</p>
            <p className="text-xs text-slate-400 mt-1">Just you for now</p>
          </div>

        </div>

        {/* Coming soon note */}
        <p className="text-xs text-slate-300 mt-10">
          More features coming soon — events, RSVP, leaderboards &amp; more.
        </p>

      </div>
    </main>
  );
}
