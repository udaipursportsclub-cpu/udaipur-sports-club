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
// SignOutButton moved to Settings page

export const revalidate = 0;

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

  // Get this user's role and onboarding status
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_done")
    .eq("id", user.id)
    .single();

  // Force new users through onboarding first
  if (profile?.onboarding_done !== true) redirect("/onboarding");

  const role   = profile?.role ?? "member";
  const isHost = role === "host" || role === "admin";

  // Fire independent queries in parallel
  const [
    { count: eventsCreated },
    { count: eventsJoined },
    { data: myUpcomingRsvps },
    hostEventsResult,
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }).eq("host_id", user.id),
    supabase.from("rsvps").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("rsvps").select("event_id, events(id, title, sport, date, time, location, status)").eq("user_id", user.id).order("created_at", { ascending: false }),
    isHost
      ? supabase.from("events").select("id, title, total_cost, capacity").eq("host_id", user.id).gt("total_cost", 0)
      : Promise.resolve({ data: null }),
  ]);

  // Host finance data
  let hostEarned = 0;
  let hostPending = 0;
  type HostEventFinance = { id: string; title: string; earned: number; pending: number; total: number };
  let hostEventFinance: HostEventFinance[] = [];

  if (isHost) {
    const myHostedEvents = hostEventsResult.data;

    if (myHostedEvents && myHostedEvents.length > 0) {
      const myEventIds = myHostedEvents.map((e) => e.id);
      const { data: myEventRsvps } = await supabase
        .from("rsvps")
        .select("event_id, payment_status, payment_waived")
        .in("event_id", myEventIds);

      const rsvpsByEvent: Record<string, typeof myEventRsvps> = {};
      for (const r of myEventRsvps ?? []) {
        if (!rsvpsByEvent[r.event_id]) rsvpsByEvent[r.event_id] = [];
        rsvpsByEvent[r.event_id]!.push(r);
      }

      hostEventFinance = myHostedEvents.map((ev) => {
        const evRsvps = rsvpsByEvent[ev.id] ?? [];
        const perPerson = Math.ceil(ev.total_cost / ev.capacity);
        const paidCount = evRsvps.filter((r) => r.payment_status === "paid").length;
        const nonWaivedCount = evRsvps.filter((r) => !r.payment_waived).length;
        const earned = paidCount * perPerson;
        const total = nonWaivedCount * perPerson;
        return { id: ev.id, title: ev.title, earned, pending: total - earned, total };
      });

      hostEarned = hostEventFinance.reduce((s, e) => s + e.earned, 0);
      hostPending = hostEventFinance.reduce((s, e) => s + e.pending, 0);
    }
  }

  type JoinedEvent = { id: string; title: string; sport: string; date: string; time: string; location: string; status: string };
  const upcomingJoined = (myUpcomingRsvps ?? [])
    .map((r) => r.events as unknown as JoinedEvent | null)
    .filter((e): e is JoinedEvent => e?.status === "upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <main
      className="min-h-screen bg-[#030712]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >

      {/* ── TOP NAVIGATION ──────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>

        {/* Right side: admin + settings + avatar */}
        <div className="flex items-center gap-3">
          {role === "admin" && (
            <Link href="/admin" className="text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-1.5 rounded-full hover:bg-red-400/20 transition-colors">
              Admin
            </Link>
          )}
          <Link href="/settings" className="text-xs font-semibold text-white/40 hover:text-white transition-colors">
            ⚙️
          </Link>
          <div className="flex items-center gap-2">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-sm font-bold">
                {userName.charAt(0)}
              </div>
            )}
          </div>
        </div>

      </nav>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 py-14">

        {/* Welcome heading */}
        <div className="mb-10">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-1 rounded-full mb-4">
            Dashboard
          </span>
          <h1 className="text-3xl font-extrabold text-white mb-1">
            Welcome back, {firstName}!
          </h1>
          <p className="text-white/40 text-sm">{userEmail}</p>
        </div>

        {/* ── QUICK ACTIONS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-6">

          {/* Browse Events */}
          <Link href="/events"
            className="bg-white/[0.03] border border-white/5 hover:border-amber-400/30 rounded-2xl p-6 transition-all group">
            <span className="text-2xl mb-3 block">🏅</span>
            <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Browse Events</p>
            <p className="text-xs text-white/40 mt-1">Find and join upcoming events</p>
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
              <p className="text-xs text-white/40 mt-1">Enter a challenge code</p>
            </Link>
          )}

        </div>

        {/* My Profile link */}
        <Link href={`/profile/${user.id}`}
          className="flex items-center gap-3 bg-white/[0.03] border border-white/5 hover:border-amber-400/30 rounded-2xl p-5 transition-all group mb-10">
          <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
            {firstName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">My Profile</p>
            <p className="text-xs text-white/40">Your stats, sports history & achievements</p>
          </div>
          <span className="ml-auto text-white/30 group-hover:text-amber-400 transition-colors">→</span>
        </Link>

        {/* ── VIRAL LINKS ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Link
            href="/photos"
            className="flex items-center gap-3 bg-gradient-to-br from-amber-400/10 to-orange-400/10 border border-amber-400/20 hover:border-amber-400/40 rounded-2xl px-4 py-4 transition-all group"
          >
            <span className="text-xl">📸</span>
            <div>
              <p className="text-xs font-bold text-white">My Photos</p>
              <p className="text-xs text-white/40">Find me</p>
            </div>
          </Link>

          <Link
            href={`/wrapped/${user.id}`}
            className="flex items-center gap-3 bg-[#0C1B35] hover:bg-[#122040] rounded-2xl px-4 py-4 transition-all group border border-amber-400/20 hover:border-amber-400/40"
          >
            <span className="text-xl">✨</span>
            <div>
              <p className="text-xs font-bold text-amber-400">Wrapped</p>
              <p className="text-xs text-white/40">Stats card</p>
            </div>
          </Link>

          <Link
            href={`/invite/${user.id}`}
            className="flex items-center gap-3 bg-white/[0.03] border border-white/5 hover:border-amber-400/30 rounded-2xl px-4 py-4 transition-all group"
          >
            <span className="text-xl">🔗</span>
            <div>
              <p className="text-xs font-bold text-white">Invite</p>
              <p className="text-xs text-white/40">Share link</p>
            </div>
          </Link>
        </div>

        {/* Admin + Settings moved to top nav bar */}

        {/* ── HOST EARNINGS (hosts only) ──────────────────────────────── */}
        {isHost && (hostEarned > 0 || hostPending > 0) && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 mb-8">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">My Earnings</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-green-400">₹{hostEarned.toLocaleString("en-IN")}</p>
                <p className="text-xs text-white/40 mt-1">Earned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-amber-400">₹{hostPending.toLocaleString("en-IN")}</p>
                <p className="text-xs text-white/40 mt-1">Pending</p>
              </div>
            </div>
            {hostEventFinance.length > 0 && (
              <div className="space-y-2 border-t border-white/5 pt-4">
                {hostEventFinance.slice(0, 5).map((ef) => (
                  <Link key={ef.id} href={`/events/${ef.id}`} className="flex items-center justify-between py-1 hover:bg-white/[0.02] rounded px-2 transition-colors">
                    <span className="text-sm text-white/60 truncate">{ef.title}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-green-400 font-medium">₹{ef.earned.toLocaleString("en-IN")}</span>
                      {ef.pending > 0 && (
                        <span className="text-xs text-amber-400">+₹{ef.pending.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STATS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Events Created</p>
            <p className="text-3xl font-extrabold text-white">{eventsCreated ?? 0}</p>
          </div>
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Events Joined</p>
            <p className="text-3xl font-extrabold text-white">{eventsJoined ?? 0}</p>
          </div>
        </div>

        {/* ── UPCOMING EVENTS I JOINED ───────────────────────────────── */}
        {upcomingJoined.length > 0 && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">My Upcoming Events</h2>
              <Link href="/events" className="text-xs font-semibold text-amber-500 hover:text-amber-400">See all →</Link>
            </div>
            <div className="divide-y divide-white/5">
              {upcomingJoined.map((ev) => {
                if (!ev) return null;
                const formattedDate = new Date(ev.date).toLocaleDateString("en-IN", {
                  weekday: "short", day: "numeric", month: "short",
                });
                const SPORT_EMOJIS: Record<string, string> = {
                  Cricket:"🏏",Football:"⚽",Badminton:"🏸",Tennis:"🎾",Basketball:"🏀",
                  Volleyball:"🏐",Swimming:"🏊",Cycling:"🚴",Running:"🏃",Kabaddi:"🤼",
                  Chess:"♟️",Hockey:"🏑","Table Tennis":"🏓",Other:"🏅",
                };
                return (
                  <Link key={ev.id} href={`/events/${ev.id}`}
                    className="flex items-center gap-3 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                    <span className="text-xl flex-shrink-0">{SPORT_EMOJIS[ev.sport] ?? "🏅"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{formattedDate} · {ev.location}</p>
                    </div>
                    <span className="text-amber-400 text-xs flex-shrink-0">→</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
