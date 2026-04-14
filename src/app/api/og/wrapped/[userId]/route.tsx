/**
 * FILE: src/app/api/og/wrapped/[userId]/route.tsx
 *
 * Generates the "USC Wrapped" card — Spotify Wrapped for sports.
 * Every Sunday auto-sends. Users share it. Influencers flex it.
 *
 * Shows: games this week/month, top sport, rank in city, streak.
 * URL: /api/og/wrapped/[userId]?period=week|month
 */

export const runtime = "edge";
import { ImageResponse } from "next/og";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "week";

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const headers      = { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` };

  // Fetch profile
  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${params.userId}&select=full_name,role`,
    { headers }
  );
  const profiles = await profileRes.json();
  const profile  = profiles?.[0];
  if (!profile) return new Response("Not found", { status: 404 });

  // Date range
  const now   = new Date();
  const since = new Date(now);
  if (period === "week") {
    since.setDate(now.getDate() - 7);
  } else {
    since.setDate(1); // First of this month
  }
  const sinceISO = since.toISOString();

  // Fetch RSVPs in period
  const rsvpRes = await fetch(
    `${supabaseUrl}/rest/v1/rsvps?user_id=eq.${params.userId}&created_at=gte.${sinceISO}&select=event_id,created_at`,
    { headers }
  );
  const rsvps = await rsvpRes.json() ?? [];

  // Fetch events for those RSVPs to get sports
  const eventIds = rsvps.map((r: { event_id: string }) => r.event_id);
  let topSport  = "Sports";
  const sportCounts: Record<string, number> = {};

  if (eventIds.length > 0) {
    const evRes = await fetch(
      `${supabaseUrl}/rest/v1/events?id=in.(${eventIds.join(",")})&select=sport`,
      { headers }
    );
    const events = await evRes.json() ?? [];
    for (const e of events) {
      sportCounts[e.sport] = (sportCounts[e.sport] ?? 0) + 1;
    }
    topSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Sports";
  }

  // All-time RSVPs for rank
  const allRsvpRes = await fetch(
    `${supabaseUrl}/rest/v1/rsvps?select=user_id`,
    { headers }
  );
  const allRsvps = await allRsvpRes.json() ?? [];
  const userCounts: Record<string, number> = {};
  for (const r of allRsvps) {
    userCounts[r.user_id] = (userCounts[r.user_id] ?? 0) + 1;
  }
  const sortedUsers = Object.entries(userCounts).sort((a, b) => b[1] - a[1]);
  const rank = sortedUsers.findIndex(([id]) => id === params.userId) + 1;

  const gamesCount  = rsvps.length;
  const sportsCount = Object.keys(sportCounts).length;
  const firstName   = (profile.full_name ?? "Athlete").split(" ")[0];
  const periodLabel = period === "week" ? "This Week" : "This Month";

  const SPORT_EMOJIS: Record<string, string> = {
    Cricket:"🏏",Football:"⚽",Basketball:"🏀",Tennis:"🎾",
    Badminton:"🏸",Swimming:"🏊",Cycling:"🚴",Running:"🏃",
    Volleyball:"🏐",Kabaddi:"🤼",Chess:"♟️",Other:"🏅",
  };
  const topEmoji = SPORT_EMOJIS[topSport] ?? "🏅";

  return new ImageResponse(
    (
      <div style={{
        width: "1200px", height: "630px", display: "flex",
        background: "linear-gradient(135deg, #0C1B35 0%, #1a2f5e 50%, #0C1B35 100%)",
        position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif",
      }}>
        {/* Gold glow */}
        <div style={{
          position:"absolute", top:"-100px", left:"50%", transform:"translateX(-50%)",
          width:"600px", height:"400px", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(201,169,74,0.2) 0%, transparent 70%)",
          display:"flex",
        }}/>

        {/* Left panel */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"60px 56px", justifyContent:"space-between" }}>

          {/* Top: USC + period */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ color:"#C9A94A", fontSize:"11px", fontWeight:800, letterSpacing:"0.3em" }}>
              UDAIPUR SPORTS CLUB
            </span>
            <span style={{
              color:"#C9A94A", fontSize:"11px", fontWeight:700,
              background:"rgba(201,169,74,0.15)", border:"1px solid rgba(201,169,74,0.3)",
              borderRadius:"20px", padding:"4px 14px",
            }}>{periodLabel.toUpperCase()}</span>
          </div>

          {/* Main */}
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <span style={{ color:"rgba(255,255,255,0.5)", fontSize:"15px" }}>
              {firstName}&apos;s Sports Story
            </span>
            <span style={{ color:"white", fontSize:"64px", fontWeight:900, lineHeight:1, letterSpacing:"-0.02em" }}>
              {gamesCount === 0 ? "No games" : `${gamesCount} Game${gamesCount !== 1 ? "s" : ""}`}
            </span>
            <span style={{ color:"#C9A94A", fontSize:"22px", fontWeight:700 }}>
              {topEmoji} {topSport} {gamesCount > 0 ? "was your game" : "is waiting for you"}
            </span>
          </div>

          {/* Stats row */}
          <div style={{ display:"flex", gap:"40px" }}>
            {[
              { val: gamesCount,       label: "Games" },
              { val: sportsCount,      label: "Sports" },
              { val: rank > 0 ? `#${rank}` : "—", label: "City Rank" },
            ].map((s) => (
              <div key={s.label} style={{ display:"flex", flexDirection:"column" }}>
                <span style={{ color:"white", fontSize:"32px", fontWeight:900 }}>{s.val}</span>
                <span style={{ color:"rgba(255,255,255,0.4)", fontSize:"11px", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — big emoji + motivational */}
        <div style={{
          width:"380px", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:"20px",
          borderLeft:"1px solid rgba(201,169,74,0.2)",
        }}>
          <span style={{ fontSize:"160px" }}>{topEmoji}</span>
          {rank === 1 && (
            <span style={{
              color:"#C9A94A", fontSize:"14px", fontWeight:800,
              background:"rgba(201,169,74,0.15)", border:"1px solid rgba(201,169,74,0.4)",
              borderRadius:"20px", padding:"6px 20px", letterSpacing:"0.2em",
            }}>👑 CITY CHAMPION</span>
          )}
          {rank > 1 && rank <= 10 && (
            <span style={{
              color:"white", fontSize:"14px", fontWeight:700,
              background:"rgba(255,255,255,0.08)", borderRadius:"20px",
              padding:"6px 20px", letterSpacing:"0.1em",
            }}>TOP 10 IN UDAIPUR</span>
          )}
          {gamesCount === 0 && (
            <span style={{
              color:"rgba(255,255,255,0.5)", fontSize:"13px", textAlign:"center",
              maxWidth:"200px", lineHeight:1.5,
            }}>Time to get on the board</span>
          )}
        </div>

        {/* Bottom watermark */}
        <div style={{
          position:"absolute", bottom:"24px", left:"56px",
          color:"rgba(255,255,255,0.2)", fontSize:"11px",
          display:"flex",
        }}>usc-platform-beta.vercel.app</div>
      </div>
    ),
    { width:1200, height:630 }
  );
}
