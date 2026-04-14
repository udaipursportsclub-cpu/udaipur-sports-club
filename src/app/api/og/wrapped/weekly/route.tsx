/**
 * FILE: src/app/api/og/wrapped/weekly/route.tsx
 *
 * Weekly recap OG card — used by the weekly recap cron post.
 * Fetches this week's stats and renders a shareable card.
 * 1200×630px, dark navy, Spotify-Wrapped-style.
 */

export const runtime = "edge";
import { ImageResponse } from "next/og";

export async function GET() {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const headers      = { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` };

  const lastWeekISO = new Date(Date.now() - 7 * 86400000).toISOString();

  // Fetch this week's RSVPs + total members
  const [rsvpRes, memberRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/rsvps?created_at=gte.${lastWeekISO}&select=user_id,user_name,event_id`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/profiles?select=id`, { headers }),
  ]);

  const weekRsvps  = await rsvpRes.json().catch(() => []) as { user_id: string; user_name: string }[];
  const allMembers = await memberRes.json().catch(() => []) as { id: string }[];

  const gamesThisWeek = (weekRsvps ?? []).length;
  const memberCount   = (allMembers ?? []).length;

  // Top player this week
  const playerCounts: Record<string, { name: string; count: number }> = {};
  for (const r of weekRsvps ?? []) {
    if (!playerCounts[r.user_id]) playerCounts[r.user_id] = { name: r.user_name, count: 0 };
    playerCounts[r.user_id].count++;
  }
  const champion = Object.values(playerCounts).sort((a, b) => b.count - a.count)[0];

  const weekLabel = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return new ImageResponse(
    (
      <div style={{
        width: "1200px", height: "630px",
        background: "linear-gradient(135deg, #0C1B35 0%, #111f45 50%, #0C1B35 100%)",
        display: "flex", position: "relative", overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
      }}>
        {/* Glow */}
        <div style={{
          position: "absolute", top: "-150px", left: "40%",
          width: "600px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,169,74,0.2) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* Left panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "60px", justifyContent: "space-between" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#C9A94A", fontSize: "12px", fontWeight: 800, letterSpacing: "0.3em" }}>
              UDAIPUR SPORTS CLUB
            </span>
            <span style={{
              color: "#C9A94A", fontSize: "11px", fontWeight: 700,
              background: "rgba(201,169,74,0.15)", border: "1px solid rgba(201,169,74,0.3)",
              borderRadius: "20px", padding: "4px 14px",
            }}>
              WEEKLY RECAP
            </span>
          </div>

          {/* Main stat */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>Week of {weekLabel}</span>
            <span style={{ color: "white", fontSize: "72px", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {gamesThisWeek === 0 ? "New week" : `${gamesThisWeek} Games`}
            </span>
            <span style={{ color: "#C9A94A", fontSize: "20px", fontWeight: 700 }}>
              {gamesThisWeek > 0 ? `played across USC this week` : `starting fresh — join an event!`}
            </span>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "48px" }}>
            {[
              { val: gamesThisWeek,  label: "Games" },
              { val: memberCount,    label: "Members" },
              { val: champion ? champion.count : "—", label: "Top Score" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "white", fontSize: "36px", fontWeight: 900 }}>{s.val}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{
          width: "380px", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "20px",
          borderLeft: "1px solid rgba(201,169,74,0.2)",
          padding: "40px",
        }}>
          <span style={{ fontSize: "120px" }}>🏅</span>
          {champion && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", textAlign: "center" }}>
              <span style={{
                color: "#C9A94A", fontSize: "11px", fontWeight: 800,
                letterSpacing: "0.2em", textTransform: "uppercase",
              }}>👑 Champion</span>
              <span style={{ color: "white", fontSize: "22px", fontWeight: 900 }}>
                {champion.name.split(" ")[0]}
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                {champion.count} games this week
              </span>
            </div>
          )}
        </div>

        {/* Watermark */}
        <div style={{
          position: "absolute", bottom: "24px", left: "60px",
          color: "rgba(255,255,255,0.2)", fontSize: "11px", display: "flex",
        }}>
          usc-platform-beta.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
