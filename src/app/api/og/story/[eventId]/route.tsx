/**
 * FILE: src/app/api/og/story/[eventId]/route.tsx
 *
 * Instagram Stories-format "I Played" share card (1080x1920, 9:16).
 * Strava-inspired — dark gradient, big stats, amber accents.
 *
 * URL: /api/og/story/[eventId]?userId=abc123
 *
 * Fetches the event details, user's RSVP, and their overall stats
 * (games played, XP, level) to render a premium share card
 * that members post to Instagram Stories after playing.
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
  // lowercase variants
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
  color: string; // hex color for the OG image (not Tailwind)
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
export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const headers      = { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` };

  // ── Fetch event ─────────────────────────────────────────────────────────
  const eventRes = await fetch(
    `${supabaseUrl}/rest/v1/events?id=eq.${params.eventId}&select=*`,
    { headers }
  );
  const events = await eventRes.json();
  const event = events?.[0];

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  // ── Fetch user profile + stats in parallel ──────────────────────────────
  let userName = "Player";
  let totalGames = 0;
  let totalHosted = 0;

  if (userId) {
    const [profileRes, rsvpRes, hostedRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=full_name`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/rsvps?user_id=eq.${userId}&select=id`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/events?host_id=eq.${userId}&select=id`, { headers }),
    ]);

    const profiles = await profileRes.json();
    const rsvps    = await rsvpRes.json();
    const hosted   = await hostedRes.json();

    userName    = profiles?.[0]?.full_name ?? "Player";
    totalGames  = Array.isArray(rsvps) ? rsvps.length : 0;
    totalHosted = Array.isArray(hosted) ? hosted.length : 0;
  }

  const xp    = getSimpleXP(totalGames, totalHosted);
  const level = getPlayerLevel(xp);

  // ── Format event details ────────────────────────────────────────────────
  const emoji = getEmoji(event.sport);

  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    weekday: "short",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });

  let formattedTime = "";
  if (event.time) {
    const [h, m] = event.time.split(":");
    const timeDate = new Date();
    timeDate.setHours(parseInt(h), parseInt(m));
    formattedTime = timeDate.toLocaleTimeString("en-IN", {
      hour:   "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const firstName = userName.split(" ")[0];

  // ── Render the 1080x1920 Story card ─────────────────────────────────────
  return new ImageResponse(
    (
      <div
        style={{
          width:           "1080px",
          height:          "1920px",
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          background:      "linear-gradient(180deg, #030712 0%, #0a1628 40%, #0d1f3c 70%, #030712 100%)",
          fontFamily:      "system-ui, -apple-system, sans-serif",
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* ── Background ambient glows ── */}
        <div
          style={{
            position:     "absolute",
            top:          "200px",
            left:         "50%",
            transform:    "translateX(-50%)",
            width:        "800px",
            height:       "800px",
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
            display:      "flex",
          }}
        />
        <div
          style={{
            position:     "absolute",
            bottom:       "100px",
            right:        "-200px",
            width:        "600px",
            height:       "600px",
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
            display:      "flex",
          }}
        />

        {/* ── Spacer top ── */}
        <div style={{ height: "200px", display: "flex" }} />

        {/* ── Sport emoji (large, centered, with glow behind) ── */}
        <div
          style={{
            display:       "flex",
            alignItems:    "center",
            justifyContent: "center",
            position:      "relative",
          }}
        >
          {/* Glow behind emoji */}
          <div
            style={{
              position:     "absolute",
              width:        "260px",
              height:       "260px",
              borderRadius: "50%",
              background:   "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)",
              display:      "flex",
            }}
          />
          <span style={{ fontSize: "160px", lineHeight: 1, position: "relative", zIndex: 1 }}>
            {emoji}
          </span>
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: "60px", display: "flex" }} />

        {/* ── Event title ── */}
        <div
          style={{
            fontSize:      "64px",
            fontWeight:    900,
            color:         "white",
            lineHeight:    1.1,
            textAlign:     "center",
            maxWidth:      "900px",
            padding:       "0 60px",
            display:       "flex",
            justifyContent: "center",
          }}
        >
          {event.title}
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: "28px", display: "flex" }} />

        {/* ── Date + Location (white/60) ── */}
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            gap:            "12px",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "28px", fontWeight: 500 }}>
            {formattedDate}{formattedTime ? ` · ${formattedTime}` : ""}
          </span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "26px", fontWeight: 400 }}>
            📍 {event.location}
          </span>
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: "60px", display: "flex" }} />

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
        <div style={{ height: "60px", display: "flex" }} />

        {/* ── User's name ── */}
        <div
          style={{
            fontSize:   "52px",
            fontWeight: 800,
            color:      "white",
            display:    "flex",
          }}
        >
          {firstName}
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: "36px", display: "flex" }} />

        {/* ── Stats row: Games | XP | Level ── */}
        <div
          style={{
            display:  "flex",
            gap:      "48px",
          }}
        >
          {/* Games */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "white", fontSize: "48px", fontWeight: 900, lineHeight: 1 }}>
              {totalGames}
            </span>
            <span
              style={{
                color:          "rgba(255,255,255,0.4)",
                fontSize:       "16px",
                fontWeight:     700,
                letterSpacing:  "0.15em",
                textTransform:  "uppercase",
                marginTop:      "8px",
              }}
            >
              Games
            </span>
          </div>

          {/* Divider dot */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(245,158,11,0.5)", display: "flex" }} />
          </div>

          {/* XP */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "white", fontSize: "48px", fontWeight: 900, lineHeight: 1 }}>
              {xp}
            </span>
            <span
              style={{
                color:          "rgba(255,255,255,0.4)",
                fontSize:       "16px",
                fontWeight:     700,
                letterSpacing:  "0.15em",
                textTransform:  "uppercase",
                marginTop:      "8px",
              }}
            >
              XP
            </span>
          </div>

          {/* Divider dot */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(245,158,11,0.5)", display: "flex" }} />
          </div>

          {/* Level */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: level.color, fontSize: "48px", fontWeight: 900, lineHeight: 1 }}>
              {level.emoji}
            </span>
            <span
              style={{
                color:          "rgba(255,255,255,0.4)",
                fontSize:       "16px",
                fontWeight:     700,
                letterSpacing:  "0.15em",
                textTransform:  "uppercase",
                marginTop:      "8px",
              }}
            >
              {level.name}
            </span>
          </div>
        </div>

        {/* ── Spacer (push remaining content toward bottom) ── */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* ── "I Played" text in amber/gold ── */}
        <div
          style={{
            display:     "flex",
            alignItems:  "center",
            gap:         "12px",
            background:  "rgba(245,158,11,0.12)",
            border:      "1.5px solid rgba(245,158,11,0.35)",
            borderRadius: "16px",
            padding:     "16px 40px",
          }}
        >
          <span
            style={{
              color:         "#F59E0B",
              fontSize:      "32px",
              fontWeight:    900,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            I Played ✓
          </span>
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: "80px", display: "flex" }} />

        {/* ── USC watermark ── */}
        <div
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        "10px",
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
