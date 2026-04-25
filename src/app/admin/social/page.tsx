/**
 * FILE: src/app/admin/social/page.tsx
 *
 * USC AI Command Center — the brain of the platform's social presence.
 * Avi's private hub to manage all auto-posting, manual posts, and outreach.
 *
 * What you can do here:
 * 1. See which social accounts are connected (live status)
 * 2. Post now — upload photo/video + AI caption → Instagram + X
 * 3. Trigger scheduled posts manually
 * 4. AI Outreach — draft WhatsApp pitches to hotels/restaurants/gyms
 */

import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Link             from "next/link";

import PostNow          from "./post-now";
import OutreachTool     from "./outreach-tool";

export default async function SocialAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin" && profile?.role !== "proxy") {
    return (
      <main className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-white">Not authorized</h1>
        </div>
      </main>
    );
  }

  // Check which integrations are configured (server-side only)
  const integrations = [
    {
      name:        "Instagram",
      emoji:       "📸",
      connected:   !!(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID),
      keyNames:    ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_ACCOUNT_ID"],
      howTo:       "Meta for Developers → create app → Instagram Graph API",
    },
    {
      name:        "X / Twitter",
      emoji:       "🐦",
      connected:   !!(process.env.TWITTER_API_KEY && process.env.TWITTER_ACCESS_TOKEN),
      keyNames:    ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET"],
      howTo:       "developer.twitter.com → create app → generate keys",
    },
    {
      name:        "Groq AI",
      emoji:       "🧠",
      connected:   !!process.env.GROQ_API_KEY,
      keyNames:    ["GROQ_API_KEY"],
      howTo:       "console.groq.com → create free API key",
    },
    {
      name:        "YouTube",
      emoji:       "▶️",
      connected:   !!(process.env.YOUTUBE_ACCESS_TOKEN && process.env.YOUTUBE_CHANNEL_ID),
      keyNames:    ["YOUTUBE_ACCESS_TOKEN", "YOUTUBE_CHANNEL_ID"],
      howTo:       "Google Cloud Console → YouTube Data API v3 → OAuth token",
    },
    {
      name:        "Email (Resend)",
      emoji:       "📧",
      connected:   !!process.env.RESEND_API_KEY,
      keyNames:    ["RESEND_API_KEY"],
      howTo:       "resend.com → create free API key",
    },
  ];

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <main className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-[#030712]/80 backdrop-blur-xl border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-white/40 hover:text-white transition-colors">
            ← Admin
          </Link>
          <span className="text-xs font-bold tracking-widest uppercase text-purple-400 bg-purple-400/10 border border-purple-400/20 px-3 py-1 rounded-full">
            AI Command Center
          </span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-1">Social & AI Hub</h1>
          <p className="text-white/50 text-sm">
            USC runs itself here — auto-posts, AI captions, and business outreach.
          </p>
        </div>

        {/* ── INTEGRATION STATUS ──────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">
              Connected Platforms
            </h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              connectedCount === integrations.length
                ? "bg-green-400/10 text-green-400"
                : connectedCount > 0
                ? "bg-amber-400/10 text-amber-400"
                : "bg-red-400/10 text-red-400"
            }`}>
              {connectedCount} / {integrations.length} active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {integrations.map((ig) => (
              <div
                key={ig.name}
                className={`bg-white/[0.03] rounded-2xl border p-5 ${
                  ig.connected ? "border-green-400/20" : "border-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{ig.emoji}</span>
                    <span className="text-sm font-bold text-white">{ig.name}</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    ig.connected ? "bg-green-400" : "bg-white/20"
                  }`} />
                </div>
                {ig.connected ? (
                  <p className="text-xs text-green-400 font-semibold">✓ Connected</p>
                ) : (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Not connected</p>
                    <p className="text-xs text-white/30">{ig.howTo}</p>
                    <div className="mt-2 space-y-0.5">
                      {ig.keyNames.map((k) => (
                        <code key={k} className="block text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                          {k}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── AUTO-SCHEDULE via cron-job.org ────────────────────────── */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5">
            <h2 className="font-extrabold text-white">Auto-Schedule</h2>
            <p className="text-xs text-white/40 mt-0.5">
              Uses <strong>cron-job.org</strong> (free) — set up once, runs forever automatically.
            </p>
          </div>

          <div className="p-6 space-y-5">

            {/* Instant post — no setup needed */}
            <div className="flex items-center gap-4 p-4 bg-green-400/10 border border-green-400/20 rounded-xl">
              <span className="text-xl flex-shrink-0">⚡</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Event Posted — Instant</p>
                <p className="text-xs text-white/50">When any host creates an event → auto-posts to Instagram + X immediately. Already working.</p>
              </div>
              <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full flex-shrink-0">Live</span>
            </div>

            {/* Setup guide */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-5 space-y-4">
              <p className="text-sm font-bold text-white/70">
                One-time setup at cron-job.org (takes 5 minutes)
              </p>

              <ol className="space-y-3 text-sm text-white/60">
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Go to <strong>cron-job.org</strong> → sign up free → click &quot;Create cronjob&quot;</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <p>Add <strong>Weekly Recap</strong> — posts every Sunday 8am IST:</p>
                    <code className="block mt-1.5 text-xs bg-white/5 border border-white/5 rounded-lg px-3 py-2 break-all text-amber-400">
                      https://udaipursportsclub.vercel.app/api/cron/weekly-recap?secret=YOUR_CRON_SECRET
                    </code>
                    <p className="text-xs text-white/40 mt-1">Schedule: <code className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-white/60">30 2 * * 0</code> (cron expression)</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <p>Add <strong>Daily Nudge</strong> — posts Mon–Fri 9am IST:</p>
                    <code className="block mt-1.5 text-xs bg-white/5 border border-white/5 rounded-lg px-3 py-2 break-all text-amber-400">
                      https://udaipursportsclub.vercel.app/api/cron/daily-nudge?secret=YOUR_CRON_SECRET
                    </code>
                    <p className="text-xs text-white/40 mt-1">Schedule: <code className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-white/60">30 3 * * 1-5</code></p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                  <div>
                    <p>Replace <code className="bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded">YOUR_CRON_SECRET</code> with the value of your <code className="bg-white/5 text-white/70 px-1.5 py-0.5 rounded">CRON_SECRET</code> env var in Vercel.</p>
                    <p className="text-xs text-white/40 mt-1">Make it anything random, e.g. <code className="bg-white/5 px-1.5 py-0.5 rounded text-white/60">usc-auto-2025-xyz</code></p>
                  </div>
                </li>
              </ol>

              <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-400 mb-1">What each post does</p>
                <div className="space-y-1.5 text-xs text-amber-400">
                  <p>📊 <strong>Weekly Recap (Sundays):</strong> &quot;This week: X games, top sport was Cricket, champion was [Name]&quot; — AI writes the caption</p>
                  <p>🔔 <strong>Daily Nudge (weekdays):</strong> Features an upcoming event, or a &quot;come join us&quot; vibe post if nothing scheduled</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── POST NOW ──────────────────────────────────────────────── */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5">
            <h2 className="font-extrabold text-white">Post Now</h2>
            <p className="text-xs text-white/40 mt-0.5">
              Upload your photo or video — AI writes the caption, you post with one click.
            </p>
          </div>
          <div className="p-6">
            <PostNow />
          </div>
        </div>

        {/* ── AI OUTREACH ───────────────────────────────────────────── */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5">
            <h2 className="font-extrabold text-white">AI Outreach</h2>
            <p className="text-xs text-white/40 mt-0.5">
              Draft a WhatsApp message to approach hotels, restaurants, gyms, and clubs for collaboration.
            </p>
          </div>
          <div className="p-6">
            <OutreachTool />
          </div>
        </div>

      </div>
    </main>
  );
}
