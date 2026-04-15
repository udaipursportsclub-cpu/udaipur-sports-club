/**
 * FILE: src/app/admin/finance/page.tsx
 *
 * Admin-only finance dashboard. Shows total money expected, received,
 * outstanding, per-event breakdown, per-host breakdown, and recent payments.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminFinancePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#030712] flex items-center justify-center">
        <p className="text-white/50 text-sm">Not authorized</p>
      </main>
    );
  }

  // Fetch all paid events (events with a total_cost > 0)
  const { data: paidEvents } = await supabase
    .from("events")
    .select("id, title, sport, total_cost, capacity, host_id, host_name, status, date")
    .gt("total_cost", 0)
    .order("date", { ascending: false });

  const events = paidEvents ?? [];

  // Fetch all RSVPs for paid events
  const eventIds = events.map((e) => e.id);
  const { data: allRsvps } = await supabase
    .from("rsvps")
    .select("id, event_id, user_id, user_name, payment_status, payment_waived, created_at")
    .in("event_id", eventIds.length > 0 ? eventIds : ["none"]);

  const rsvps = allRsvps ?? [];

  // Build per-event data
  type EventFinance = {
    id: string;
    title: string;
    sport: string;
    hostName: string;
    hostId: string;
    perPerson: number;
    totalExpected: number;
    totalReceived: number;
    attendees: { name: string; status: string; waived: boolean }[];
  };

  const eventFinance: EventFinance[] = events.map((ev) => {
    const evRsvps = rsvps.filter((r) => r.event_id === ev.id);
    const perPerson = Math.ceil(ev.total_cost / ev.capacity);
    const nonWaived = evRsvps.filter((r) => !r.payment_waived);
    const totalExpected = nonWaived.length * perPerson;
    const totalReceived = evRsvps.filter((r) => r.payment_status === "paid").length * perPerson;

    return {
      id: ev.id,
      title: ev.title,
      sport: ev.sport,
      hostName: ev.host_name,
      hostId: ev.host_id,
      perPerson,
      totalExpected,
      totalReceived,
      attendees: evRsvps.map((r) => ({
        name: r.user_name,
        status: r.payment_status,
        waived: r.payment_waived ?? false,
      })),
    };
  });

  // Totals
  const totalExpected = eventFinance.reduce((s, e) => s + e.totalExpected, 0);
  const totalReceived = eventFinance.reduce((s, e) => s + e.totalReceived, 0);
  const totalOutstanding = totalExpected - totalReceived;

  // Per-host breakdown
  type HostFinance = { name: string; earned: number; pending: number };
  const hostMap: Record<string, HostFinance> = {};
  for (const ef of eventFinance) {
    if (!hostMap[ef.hostId]) {
      hostMap[ef.hostId] = { name: ef.hostName, earned: 0, pending: 0 };
    }
    hostMap[ef.hostId].earned += ef.totalReceived;
    hostMap[ef.hostId].pending += ef.totalExpected - ef.totalReceived;
  }
  const hostFinance = Object.values(hostMap).sort((a, b) => b.earned - a.earned);

  // Recent payments (paid RSVPs sorted by created_at)
  const recentPaid = rsvps
    .filter((r) => r.payment_status === "paid")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15);

  // Map event ids to titles for the log
  const eventTitleMap: Record<string, string> = {};
  for (const ev of events) eventTitleMap[ev.id] = ev.title;

  return (
    <main className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <Link href="/admin" className="text-sm text-white/40 hover:text-white transition-colors">
          ← Admin Panel
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-1 rounded-full mb-4">
            Finance Dashboard
          </span>
          <h1 className="text-3xl font-extrabold text-white">Money Overview</h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 text-center">
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Expected</p>
            <p className="text-2xl font-extrabold text-white">₹{totalExpected.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-green-400/5 rounded-2xl border border-green-400/20 p-6 text-center">
            <p className="text-xs font-bold tracking-widest uppercase text-green-400/70 mb-2">Received</p>
            <p className="text-2xl font-extrabold text-green-400">₹{totalReceived.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-amber-400/5 rounded-2xl border border-amber-400/20 p-6 text-center">
            <p className="text-xs font-bold tracking-widest uppercase text-amber-400/70 mb-2">Outstanding</p>
            <p className="text-2xl font-extrabold text-amber-400">₹{totalOutstanding.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Per-event breakdown */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-white/5">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Per-Event Breakdown</h2>
          </div>
          {eventFinance.length === 0 ? (
            <p className="px-6 py-8 text-sm text-white/40 text-center">No paid events yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {eventFinance.map((ef) => (
                <div key={ef.id} className="px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Link href={`/events/${ef.id}`} className="text-sm font-bold text-white hover:text-amber-400 transition-colors">
                        {ef.title}
                      </Link>
                      <p className="text-xs text-white/40 mt-0.5">Host: {ef.hostName} · ₹{ef.perPerson}/person</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-400">₹{ef.totalReceived.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-white/40">of ₹{ef.totalExpected.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  {/* Attendee payment list */}
                  <div className="flex flex-wrap gap-2">
                    {ef.attendees.map((a, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          a.status === "paid"
                            ? "bg-green-400/10 text-green-400 border border-green-400/20"
                            : a.waived
                            ? "bg-blue-400/10 text-blue-400 border border-blue-400/20"
                            : "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                        }`}
                      >
                        {a.name} {a.status === "paid" ? "✓" : a.waived ? "(waived)" : "⏳"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-host breakdown */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-white/5">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Per-Host Breakdown</h2>
          </div>
          {hostFinance.length === 0 ? (
            <p className="px-6 py-8 text-sm text-white/40 text-center">No hosts with earnings yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {hostFinance.map((h) => (
                <div key={h.name} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 text-sm font-bold">
                      {h.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-white/70">{h.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">₹{h.earned.toLocaleString("en-IN")}</p>
                    {h.pending > 0 && (
                      <p className="text-xs text-amber-400">₹{h.pending.toLocaleString("en-IN")} pending</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payment activity */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Recent Payment Activity</h2>
          </div>
          {recentPaid.length === 0 ? (
            <p className="px-6 py-8 text-sm text-white/40 text-center">No payments recorded yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {recentPaid.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <span className="text-sm text-white/70">{r.user_name}</span>
                    <span className="text-xs text-white/30 ml-2">paid for</span>
                    <span className="text-sm text-white/50 ml-1">{eventTitleMap[r.event_id] ?? "Unknown"}</span>
                  </div>
                  <span className="text-xs text-white/30">
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
