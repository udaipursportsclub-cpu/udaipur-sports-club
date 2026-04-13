/**
 * FILE: src/app/dashboard/page.tsx
 *
 * What this does:
 * The personal dashboard — shown right after a user logs in.
 * Shows their name, quick actions (Browse Events, Create Event),
 * and their personal stats (events created, RSVPs).
 *
 * Only accessible when logged in — sends to /login otherwise.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Check login — redirect to login if not authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userName   = user.user_metadata?.full_name ?? "Athlete";
  const userAvatar = user.user_metadata?.avatar_url ?? null;
  const userEmail  = user.email ?? "";
  const firstName  = userName.split(" ")[0];

  // Get this user's role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role   = profile?.role ?? "member";
  const isHost = role === "host" || role === "admin";

  // Count how many events this user has created
  const { count: eventsCreated } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("host_id", user.id);

  // Count how many events this user has RSVPed to
  const { count: eventsJoined } = await supabase
    .from("rsvps")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <main
      className="min-h-screen bg-[#F9F7F4]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >

      {/* ── TOP NAVIGATION ──────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">

        <Link
          href="/"
          className="text-sm font-bold tracking-[0.25em] uppercase text-slate-900 hover:text-amber-500 transition-colors"
        >
          USC
        </Link>

        {/* Right side: avatar + name + sign out */}
        <div className="flex items-center gap-4">
          <SignOutButton />
          <div className="flex items-center gap-2">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-sm font-bold">
                {userName.charAt(0)}
              </div>
            )}
            <span className="text-sm font-medium text-slate-700 hidden sm:block">
              {firstName}
            </span>
          </div>
        </div>

      </nav>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 py-14">

        {/* Welcome heading */}
        <div className="mb-10">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-amber-600 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full mb-4">
            Dashboard
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">
            Welcome back, {firstName}!
          </h1>
          <p className="text-slate-400 text-sm">{userEmail}</p>
        </div>

        {/* ── QUICK ACTIONS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-10">

          {/* Browse Events */}
          <Link href="/events"
            className="bg-white border border-stone-200 hover:border-amber-300 hover:shadow-sm rounded-2xl p-6 transition-all group">
            <span className="text-2xl mb-3 block">🏅</span>
            <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Browse Events</p>
            <p className="text-xs text-slate-400 mt-1">Find and join upcoming events</p>
          </Link>

          {/* Create Event (hosts) OR Become a Host CTA (members) */}
          {isHost ? (
            <Link href="/events/new"
              className="bg-amber-500 hover:bg-amber-400 rounded-2xl p-6 transition-all group">
              <span className="text-2xl mb-3 block">➕</span>
              <p className="text-sm font-bold text-white">Create Event</p>
              <p className="text-xs text-amber-100 mt-1">Host a new sports event</p>
            </Link>
          ) : (
            <Link href="/challenge"
              className="bg-slate-900 hover:bg-slate-700 rounded-2xl p-6 transition-all group">
              <span className="text-2xl mb-3 block">⚡</span>
              <p className="text-sm font-bold text-white">Become a Host</p>
              <p className="text-xs text-slate-400 mt-1">Enter a challenge code</p>
            </Link>
          )}

        </div>

        {/* Admin panel link — only for admins */}
        {role === "admin" && (
          <div className="mb-6">
            <Link href="/admin"
              className="flex items-center gap-2 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">
              <span>🔑</span> Open Admin Panel
            </Link>
          </div>
        )}

        {/* ── STATS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Events created */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">
              Events Created
            </p>
            <p className="text-3xl font-extrabold text-slate-900">
              {eventsCreated ?? 0}
            </p>
          </div>

          {/* Events joined */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">
              Events Joined
            </p>
            <p className="text-3xl font-extrabold text-slate-900">
              {eventsJoined ?? 0}
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}
