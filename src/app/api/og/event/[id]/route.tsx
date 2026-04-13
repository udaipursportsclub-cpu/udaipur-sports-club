/**
 * FILE: src/app/api/og/event/[id]/route.tsx
 *
 * What this does:
 * This is the "image generator" for event share cards.
 * When called, it fetches the event data and draws a beautiful
 * branded image — like a poster for the event.
 *
 * This image is used for:
 * 1. WhatsApp / iMessage link previews (auto-shown when you share the event URL)
 * 2. The downloadable share card users can post to Instagram / WhatsApp stories
 *
 * It runs on Vercel's "edge" network — super fast, globally distributed.
 */

import { ImageResponse } from "next/og";

// "edge" runtime is required for next/og image generation
export const runtime = "edge";

// Sport → emoji mapping (can't import from @/lib/types in edge runtime)
const SPORT_EMOJIS: Record<string, string> = {
  cricket:      "🏏",
  football:     "⚽",
  badminton:    "🏸",
  tennis:       "🎾",
  basketball:   "🏀",
  volleyball:   "🏐",
  "table tennis": "🏓",
  swimming:     "🏊",
  cycling:      "🚴",
  running:      "🏃",
  kabaddi:      "🤼",
  chess:        "♟️",
  hockey:       "🏑",
  squash:       "🎱",
  other:        "🏅",
};

function getEmoji(sport: string) {
  return SPORT_EMOJIS[sport.toLowerCase()] ?? "🏅";
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // ── Fetch event data from Supabase REST API ───────────────────────
  // We use a direct REST fetch here (not the Supabase client) because
  // the edge runtime works best with plain fetch() calls.
  const eventRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?id=eq.${params.id}&select=*`,
    {
      headers: {
        apikey:        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    }
  );

  const events = await eventRes.json();
  const event = events?.[0];

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  // Fetch RSVP count
  const rsvpRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rsvps?event_id=eq.${params.id}&select=id`,
    {
      headers: {
        apikey:        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        Prefer:        "count=exact",
      },
    }
  );
  const rsvpData = await rsvpRes.json();
  const rsvpCount = Array.isArray(rsvpData) ? rsvpData.length : 0;

  // Format the date nicely
  const dateObj = new Date(event.date);
  const formattedDate = dateObj.toLocaleDateString("en-IN", {
    weekday: "short",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });

  // Format time
  const [h, m] = event.time.split(":");
  const timeDate = new Date();
  timeDate.setHours(parseInt(h), parseInt(m));
  const formattedTime = timeDate.toLocaleTimeString("en-IN", {
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const emoji = getEmoji(event.sport);
  const isFree = !event.total_cost || event.total_cost === 0;
  const perPerson = isFree ? 0 : Math.ceil(event.total_cost / event.capacity);
  const spotsLeft = event.capacity - rsvpCount;

  // ── Generate the image ────────────────────────────────────────────
  return new ImageResponse(
    (
      <div
        style={{
          width:           "100%",
          height:          "100%",
          display:         "flex",
          flexDirection:   "column",
          background:      "linear-gradient(135deg, #050A18 0%, #0d1528 60%, #1a1006 100%)",
          padding:         "56px 64px",
          fontFamily:      "system-ui, -apple-system, sans-serif",
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* ── Amber glow in the background (decorative) ── */}
        <div
          style={{
            position:     "absolute",
            bottom:       "-120px",
            right:        "-120px",
            width:        "500px",
            height:       "500px",
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
          }}
        />

        {/* ── TOP BAR: Club name (left) + Sport pill (right) ── */}
        <div
          style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
            marginBottom:   "44px",
          }}
        >
          {/* USC wordmark */}
          <span
            style={{
              color:         "#F59E0B",
              fontSize:      "15px",
              fontWeight:    700,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            UDAIPUR SPORTS CLUB
          </span>

          {/* Sport pill */}
          <span
            style={{
              color:        "#F59E0B",
              fontSize:     "14px",
              fontWeight:   600,
              background:   "rgba(245,158,11,0.12)",
              padding:      "8px 18px",
              borderRadius: "99px",
              border:       "1px solid rgba(245,158,11,0.3)",
              letterSpacing: "0.05em",
            }}
          >
            {event.sport.toUpperCase()}
          </span>
        </div>

        {/* ── SPORT EMOJI (big, anchoring the card) ── */}
        <div style={{ fontSize: "88px", marginBottom: "20px", lineHeight: 1 }}>
          {emoji}
        </div>

        {/* ── EVENT TITLE ── */}
        <div
          style={{
            fontSize:    "56px",
            fontWeight:  800,
            color:       "white",
            lineHeight:  1.1,
            marginBottom: "32px",
            maxWidth:    "860px",
          }}
        >
          {event.title}
        </div>

        {/* ── EVENT DETAILS: date, time, location ── */}
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            gap:            "14px",
            marginBottom:   "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", color: "#94a3b8", fontSize: "22px" }}>
            <span>📅</span>
            <span>{formattedDate} · {formattedTime}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", color: "#94a3b8", fontSize: "22px" }}>
            <span>📍</span>
            <span>{event.location}</span>
          </div>
          {!isFree && (
            <div style={{ display: "flex", alignItems: "center", gap: "14px", color: "#F59E0B", fontSize: "22px" }}>
              <span>💰</span>
              <span>₹{perPerson} per person</span>
            </div>
          )}
        </div>

        {/* ── BOTTOM BAR ── */}
        <div
          style={{
            display:         "flex",
            justifyContent:  "space-between",
            alignItems:      "center",
            borderTop:       "1px solid rgba(255,255,255,0.08)",
            paddingTop:      "28px",
            marginTop:       "40px",
          }}
        >
          {/* Players going */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#F59E0B", fontSize: "18px" }}>⚡</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "18px" }}>
              {rsvpCount} going · {spotsLeft} spots left
            </span>
          </div>

          {/* Website */}
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "16px" }}>
            usc-platform-beta.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width:  1200,
      height: 630,
    }
  );
}
