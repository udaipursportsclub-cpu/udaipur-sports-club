/**
 * FILE: src/app/admin/page.tsx
 *
 * What this does:
 * Avi's private admin dashboard. Only accessible if your profile role
 * is "admin". Anyone else sees a "Not authorized" message.
 *
 * From here Avi can:
 * - Generate new host challenge codes
 * - See all existing codes (claimed / unclaimed)
 * - See all current hosts
 * - See platform stats
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GenerateCodeButton from "./generate-code-button";
import ChangeRoleButton from "./change-role-button";
import NavLogo from "@/components/NavLogo";
import Link from "next/link";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#F9F7F4] flex items-center justify-center"
        style={{ fontFamily: "var(--font-geist-sans)" }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-slate-900">Not authorized</h1>
          <p className="text-slate-400 text-sm mt-2">This page is for admins only.</p>
        </div>
      </main>
    );
  }

  // Fetch all challenge codes
  const { data: codes } = await supabase
    .from("challenge_codes")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch ALL users (so Avi can manage everyone's role)
  const { data: hosts } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Platform stats
  const { count: totalMembers } = await supabase
    .from("profiles").select("*", { count: "exact", head: true });

  const { count: totalEvents } = await supabase
    .from("events").select("*", { count: "exact", head: true });

  const { count: totalRSVPs } = await supabase
    .from("rsvps").select("*", { count: "exact", head: true });

  return (
    <main className="min-h-screen bg-[#F9F7F4]"
      style={{ fontFamily: "var(--font-geist-sans)" }}>

      {/* ── NAV ────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <NavLogo />
        <span className="text-xs font-bold tracking-widest uppercase text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
          Admin Panel
        </span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        {/* ── SETUP GUIDE LINK ──────────────────────────────────── */}
        <Link
          href="/admin/setup"
          className="flex items-center gap-4 bg-white border border-stone-200 hover:border-amber-300 rounded-2xl px-6 py-4 transition-all group"
        >
          <span className="text-2xl">⚙️</span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-slate-900">Platform Setup Guide</p>
            <p className="text-xs text-slate-400">SQL setup · env vars · storage bucket · cron jobs</p>
          </div>
          <span className="text-slate-300 group-hover:text-amber-400 transition-colors">→</span>
        </Link>

        {/* ── AI COMMAND CENTER LINK ─────────────────────────────── */}
        <Link
          href="/admin/social"
          className="flex items-center gap-4 bg-[#050A18] border border-purple-500/30 hover:border-purple-500/60 rounded-2xl px-6 py-5 transition-all group"
        >
          <span className="text-3xl">🤖</span>
          <div className="flex-1">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-purple-400 mb-0.5">New</p>
            <p className="text-lg font-extrabold text-white">AI Command Center</p>
            <p className="text-sm text-white/40">Post to Instagram + X · Auto schedule · Outreach AI</p>
          </div>
          <span className="text-purple-400/40 group-hover:text-purple-400 transition-colors text-xl">→</span>
        </Link>

        {/* ── STATS ROW ──────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Members", value: totalMembers ?? 0 },
            { label: "Total Events",  value: totalEvents ?? 0 },
            { label: "Total RSVPs",   value: totalRSVPs ?? 0 },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
              <p className="text-3xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── CHALLENGE CODES ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
            <div>
              <h2 className="font-extrabold text-slate-900">Challenge Codes</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate a code and send it to someone you trust — they enter it at /challenge to become a host.
              </p>
            </div>
            {/* Generate new code button */}
            <GenerateCodeButton />
          </div>

          {/* Codes list */}
          {!codes || codes.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">
              No codes yet. Generate your first one.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {codes.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-6 py-4">
                  {/* Code */}
                  <code className="text-sm font-bold text-slate-800 tracking-widest bg-stone-50 px-3 py-1 rounded-lg">
                    {c.code}
                  </code>

                  {/* Status */}
                  {c.claimed_by ? (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                      ✓ Claimed
                    </span>
                  ) : c.is_active ? (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      Unclaimed
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 bg-stone-50 border border-stone-200 px-3 py-1 rounded-full">
                      Deactivated
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── HOSTS ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100">
            <h2 className="font-extrabold text-slate-900">All Members</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Change anyone&apos;s role using the dropdown. Changes take effect instantly.
            </p>
          </div>

          {!hosts || hosts.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">No members yet.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {hosts.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-6 py-4">
                  {/* Left: avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      h.role === "admin"  ? "bg-red-400"   :
                      h.role === "proxy"  ? "bg-blue-400"  :
                      h.role === "host"   ? "bg-amber-400" : "bg-slate-300"
                    }`}>
                      {(h.full_name ?? "?").charAt(0)}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {h.full_name ?? "Unknown"}
                    </p>
                  </div>

                  {/* Right: role dropdown */}
                  <ChangeRoleButton
                    profileId={h.id}
                    currentRole={h.role}
                    name={h.full_name ?? "this user"}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
