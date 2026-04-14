/**
 * FILE: src/app/api/og/event/[id]/played/route.tsx
 *
 * What this does:
 * Generates a Strava-style "I PLAYED" share card image.
 * Used by attendees to share their participation after the event.
 *
 * URL format: /api/og/event/[eventId]/played?name=Shailesh&uid=abc123
 *
 * The card shows:
 *   - Big sport emoji
 *   - "I PLAYED" badge (like Strava's "I RAN")
 *   - Player name
 *   - Event title + location + date
 *   - Player count stat
 *   - USC branding
 *
 * Uses edge runtime (required for @vercel/og image generation).
 */

export const runtime = "edge";

import { ImageResponse } from "next/og";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const playerName = searchParams.get("name") ?? "Player";

  // Fetch event data using direct REST (edge runtime can't use next/headers)
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const eventRes = await fetch(
    `${supabaseUrl}/rest/v1/events?id=eq.${params.id}&select=*`,
    { headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` } }
  );
  const events = await eventRes.json();
  const event = events?.[0];

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  // Fetch RSVP count
  const rsvpRes = await fetch(
    `${supabaseUrl}/rest/v1/rsvps?event_id=eq.${params.id}&select=id`,
    { headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` } }
  );
  const rsvps = await rsvpRes.json();
  const playerCount = rsvps?.length ?? 0;

  // Sport emoji map
  const SPORT_EMOJIS: Record<string, string> = {
    Cricket:    "🏏", Football:  "⚽", Basketball: "🏀",
    Tennis:     "🎾", Badminton: "🏸", Swimming:   "🏊",
    Cycling:    "🚴", Running:   "🏃", Yoga:       "🧘",
    Volleyball: "🏐", Squash:    "🎱", Golf:       "⛳",
    Chess:      "♟️", Kabaddi:   "🤼", Archery:    "🏹", Other: "🏅",
  };
  const sportEmoji = SPORT_EMOJIS[event.sport] ?? "🏅";

  // Format date
  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  const firstName = playerName.split(" ")[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#050A18",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow background */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            left: "-200px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Left column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "56px 48px",
            justifyContent: "space-between",
          }}
        >
          {/* Top: USC wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                color: "#F59E0B",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              Udaipur Sports Club
            </span>
          </div>

          {/* Middle: "I PLAYED" badge + name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* I PLAYED badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(245,158,11,0.15)",
                border: "1.5px solid rgba(245,158,11,0.4)",
                borderRadius: "8px",
                padding: "8px 16px",
                width: "fit-content",
              }}
            >
              <span
                style={{
                  color: "#F59E0B",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "0.25em",
                }}
              >
                I PLAYED ✓
              </span>
            </div>

            {/* Player name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ color: "rgba(148,163,184,0.8)", fontSize: "14px", fontWeight: 500 }}>
                {firstName} played
              </span>
              <span
                style={{
                  color: "white",
                  fontSize: "52px",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                {event.sport}
              </span>
            </div>

            {/* Stats row — Strava-style */}
            <div style={{ display: "flex", gap: "32px", marginTop: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#F59E0B", fontSize: "28px", fontWeight: 800 }}>
                  {playerCount}
                </span>
                <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Players
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#F59E0B", fontSize: "28px", fontWeight: 800 }}>
                  {formattedDate}
                </span>
                <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Date
                </span>
              </div>
            </div>
          </div>

          {/* Bottom: event title + location */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ color: "white", fontSize: "18px", fontWeight: 700, lineHeight: 1.3 }}>
              {event.title}
            </span>
            <span style={{ color: "#64748b", fontSize: "13px" }}>
              📍 {event.location}
            </span>
          </div>
        </div>

        {/* Right column — giant sport emoji */}
        <div
          style={{
            width: "380px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "200px",
            paddingRight: "40px",
          }}
        >
          {sportEmoji}
        </div>

        {/* Bottom right watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            right: "40px",
            color: "rgba(100,116,139,0.5)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            display: "flex",
          }}
        >
          usc-platform-beta.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
