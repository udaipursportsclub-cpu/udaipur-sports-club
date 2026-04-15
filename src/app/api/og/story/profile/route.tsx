/**
 * FILE: src/app/api/og/story/profile/route.tsx
 *
 * Instagram Stories-format profile stats card (1080x1920, 9:16).
 * Shows a member's overall USC stats in a share-worthy format.
 *
 * URL: /api/og/story/profile?userId=abc123
 *
 * Fetches:
 *   - User profile (name)
 *   - Total games played (RSVP count)
 *   - Top sport (most played)
 *   - XP and level badge
 *
 * Uses edge runtime + next/og ImageResponse.
 */

export const runtime = "edge";

import { ImageResponse } from "next/og";

// ── Sport emoji map (edge runtime can't import from @/lib/types) ────────────
const SPORT_EMOJIS: Record<string, string> = {
  Cricket: "🏏", Football: "⚽", Basketball: "🏀", Tennis: "🎾",
  Badminton: "🏸", Swimming: "🏊", Cycling: "🚴", Running: "🏃",
  Volleyball: "🏐", Kabaddi: "🤼", Chess: "♟️", Squash: "🎱",
  Hockey: "🏑", Yoga: "🧘", Golf: "⛳", Archery: "🏹", Other: "🏅",
  cricket: "🏏", football: "⚽", basketball: "🏀", tennis: "🎾",
  badminton: "🏸", swimming: "🏊", cycling: "🚴", running: "🏃",
  volleyball: "🏐", kabaddi: "🤼", chess: "♟️", squash: "🎱",
  hockey: "🏑", yoga: "🧘", golf: "⛳", archery: "🏹", other: "🏅",
  "table tennis": "🏓",
};

function getEmoji(sport: string): string {
  return SPORT_EMOJIS[sport] ?? SPORT_EMOJIS[sport.toLowerCase()] ?? "🏅";
}

// ── XP & level logic (mirrored from src/lib/xp.ts for edge runtime) ────────
const BASE_XP_PER_GAME = 100;
const XP_PER_HOST = 150;

type PlayerLevel = {
  name: string;
  emoji: string;
  color: string; // hex color for OG image
};

const LEVELS: (PlayerLevel & { minXP: number })[] = [
  { name: "Rookie",  minXP: 0,     emoji: "🌱", color: "#94a3b8" },
  { name: "Rising",  minXP: 300,   emoji: "⬆️", color: "#60a5fa" },
  { name: "Warrior", minXP: 1000,  emoji: "⚔️", color: "#4ade80" },
  { name: "Ace",     minXP: 2500,  emoji: "🌟", color: "#fbbf24" },
  { name: "Pro",     minXP: 5000,  emoji: "💎", color: "#c084fc" },
  { name: "Elite",   minXP: 9000,  emoji: "🔥", color: "#f87171" },
  { name: "Legend",  minXP: 15000, emoji: "👑", color: "#fde047" },
];

function getPlayerLevel(xp: number): PlayerLevel & { minXP: number } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

function getSimpleXP(games: number, hosted: number): number {
  return games * BASE_XP_PER_GAME + hosted * XP_PER_HOST;
}

// ── Route handler ───────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId param", { status: 400 });
  }

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const headers      = { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` };

  // ── Fetch profile, RSVPs, hosted events in parallel ─────────────────────
  const [profileRes, rsvpRes, hostedRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=full_name`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/rsvps?user_id=eq.${userId}&select=event_id`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/events?host_id=eq.${userId}&select=id`, { headers }),
  ]);

  const profiles = await profileRes.json();
  const rsvps    = await rsvpRes.json();
  const hosted   = await hostedRes.json();

  const profile = profiles?.[0];
  if (!profile) {
    return new Response("User not found", { status: 404 });
  }

  const userName    = profile.full_name ?? "Player";
  const totalGames  = Array.isArray(rsvps) ? rsvps.length : 0;
  const totalHosted = Array.isArray(hosted) ? hosted.length : 0;

  // ── Find top sport ──────────────────────────────────────────────────────
  let topSport  = "Sports";
  let topEmoji  = "🏅";
  const sportCounts: Record<string, number> = {};

  if (totalGames > 0) {
    const eventIds = rsvps.map((r: { event_id: string }) => r.event_id);
    // Fetch event sports for all RSVPs
    const eventsRes = await fetch(
      `${supabaseUrl}/rest/v1/events?id=in.(${eventIds.join(",")})&select=sport`,
      { headers }
    );
    const eventsData = await eventsRes.json();

    if (Array.isArray(eventsData)) {
      for (const ev of eventsData) {
        const sport = ev.sport ?? "Other";
        sportCounts[sport] = (sportCounts[sport] ?? 0) + 1;
      }
      const sorted = Object.entries(sportCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        topSport = sorted[0][0];
        topEmoji = getEmoji(topSport);
      }
    }
  }

  const xp    = getSimpleXP(totalGames, totalHosted);
  const level = getPlayerLevel(xp);
  const sportsCount = Object.keys(sportCounts).length;

  // ── Render the 1080x1920 Profile Story card ─────────────────────────────
  return new ImageResponse(
    (
      <div
        style={{
          width:           "1080px",
          height:          "1920px",
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          background:      "linear-gradient(180deg, #030712 0%, #0a1628 35%, #0d1f3c 65%, #030712 100%)",
          fontFamily:      "system-ui, -apple-system, sans-serif",
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* ── Background ambient glows ── */}
        <div
          style={{
            position:     "absolute",
            top:          "300px",
            left:         "50%",
            transform:    "translateX(-50%)",
            width:        "900px",
            height:       "900px",
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)",
            display:      "flex",
          }}
        />
        <div
          style={{
            position:     "absolute",
            bottom:       "200px",
            left:         "-200px",
            width:        "600px",
            height:       "600px",
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)",
            display:      "flex",
          }}
        />

        {/* ── Top spacer ── */}
        <div style={{ height: "220px", display: "flex" }} />

        {/* ── Top sport emoji (large, with glow) ── */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            position:       "relative",
          }}
        >
          <div
            style={{
              position:     "absolute",
              width:        "280px",
              height:       "280px",
              borderRadius: "50%",
              background:   "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)",
              display:      "flex",
            }}
          />
          <span style={{ fontSize: "160px", lineHeight: 1, position: "relative", zIndex: 1 }}>
            {topEmoji}
          </span>
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: "60px", display: "flex" }} />

        {/* ── User's name ── */}
        <div
          style={{
            fontSize:   "68px",
            fontWeight: 900,
            color:      "white",
            lineHeight: 1.1,
            textAlign:  "center",
            maxWidth:   "900px",
            padding:    "0 60px",
            display:    "flex",
            justifyContent: "center",
          }}
        >
          {userName}
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: "20px", display: "flex" }} />

        {/* ── Level badge ── */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "10px",
            background:   "rgba(255,255,255,0.06)",
            border:       "1px solid rgba(255,255,255,0.1)",
            borderRadius: "99px",
            padding:      "10px 28px",
          }}
        >
          <span style={{ fontSize: "28px" }}>{level.emoji}</span>
          <span style={{ color: level.color, fontSize: "24px", fontWeight: 800 }}>
            {level.name}
          </span>
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: "80px", display: "flex" }} />

        {/* ── Amber gradient divider ── */}
        <div
          style={{
            width:        "200px",
            height:       "3px",
            borderRadius: "2px",
            background:   "linear-gradient(90deg, transparent, #F59E0B, transparent)",
            display:      "flex",
          }}
        />

        {/* ── Spacer ── */}
        <div style={{ height: "80px", display: "flex" }} />

        {/* ── Stats grid (2x2) ── */}
        <div
          style={{
            display:               "flex",
            flexWrap:              "wrap",
            justifyContent:        "center",
            gap:                   "48px 80px",
            maxWidth:              "700px",
          }}
        >
          {/* Games Played */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "200px" }}>
            <span style={{ color: "#F59E0B", fontSize: "72px", fontWeight: 900, lineHeight: 1 }}>
              {totalGames}
            </span>
            <span
              style={{
                color:         "rgba(255,255,255,0.4)",
                fontSize:      "18px",
                fontWeight:    700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginTop:     "10px",
              }}
            >
              Games Played
            </span>
          </div>

          {/* XP */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "200px" }}>
            <span style={{ color: "#F59E0B", fontSize: "72px", fontWeight: 900, lineHeight: 1 }}>
              {xp}
            </span>
            <span
              style={{
                color:         "rgba(255,255,255,0.4)",
                fontSize:      "18px",
                fontWeight:    700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginTop:     "10px",
              }}
            >
              Total XP
            </span>
          </div>

          {/* Top Sport */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "200px" }}>
            <span style={{ color: "white", fontSize: "72px", fontWeight: 900, lineHeight: 1 }}>
              {topEmoji}
            </span>
            <span
              style={{
                color:         "rgba(255,255,255,0.4)",
                fontSize:      "18px",
                fontWeight:    700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginTop:     "10px",
              }}
            >
              {topSport}
            </span>
          </div>

          {/* Sports Count */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "200px" }}>
            <span style={{ color: "white", fontSize: "72px", fontWeight: 900, lineHeight: 1 }}>
              {sportsCount}
            </span>
            <span
              style={{
                color:         "rgba(255,255,255,0.4)",
                fontSize:      "18px",
                fontWeight:    700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginTop:     "10px",
              }}
            >
              Sports
            </span>
          </div>
        </div>

        {/* ── Push remaining to bottom ── */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* ── "My USC Stats" text in amber ── */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "12px",
            background:   "rgba(245,158,11,0.12)",
            border:       "1.5px solid rgba(245,158,11,0.35)",
            borderRadius: "16px",
            padding:      "16px 40px",
          }}
        >
          <span
            style={{
              color:         "#F59E0B",
              fontSize:      "30px",
              fontWeight:    900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            My USC Stats
          </span>
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: "80px", display: "flex" }} />

        {/* ── USC watermark ── */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "10px",
            marginBottom: "80px",
          }}
        >
          <span
            style={{
              color:         "rgba(255,255,255,0.2)",
              fontSize:      "20px",
              fontWeight:    900,
              letterSpacing: "0.3em",
            }}
          >
            USC
          </span>
          <div
            style={{
              width:        "8px",
              height:       "8px",
              borderRadius: "50%",
              background:   "#F59E0B",
              display:      "flex",
            }}
          />
        </div>
      </div>
    ),
    {
      width:  1080,
      height: 1920,
    }
  );
}
