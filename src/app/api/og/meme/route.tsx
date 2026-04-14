/**
 * FILE: src/app/api/og/meme/route.tsx
 *
 * Generates a shareable meme card for USC's social media.
 * Used by the daily nudge cron when no events are scheduled.
 * Dark + bold + on-brand. Looks like a legit sports meme page.
 *
 * URL: /api/og/meme?text=Your+meme+text+here&sub=Optional+subtext
 */

export const runtime = "edge";
import { ImageResponse } from "next/og";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") ?? "Sports khelo. Life jeeto. 🏅";
  const sub  = searchParams.get("sub")  ?? "Udaipur Sports Club";

  // Pick a random punchy background accent per request
  const accents = [
    "rgba(201,169,74,0.15)",   // gold
    "rgba(239,68,68,0.12)",    // red
    "rgba(59,130,246,0.12)",   // blue
    "rgba(34,197,94,0.10)",    // green
  ];
  const accentColor = accents[Math.floor(Math.random() * accents.length)];

  return new ImageResponse(
    (
      <div style={{
        width: "1080px", height: "1080px",
        background: "#050A18",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        padding: "80px",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "-200px", left: "50%",
          transform: "translateX(-50%)",
          width: "800px", height: "800px", borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
          display: "flex",
        }} />

        {/* Subtle grid lines */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          display: "flex",
        }} />

        {/* USC badge top */}
        <div style={{
          position: "absolute", top: "40px", left: "50%",
          transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ color: "#C9A94A", fontSize: "11px", fontWeight: 800, letterSpacing: "0.3em" }}>
            UDAIPUR SPORTS CLUB
          </span>
        </div>

        {/* Main meme text */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", textAlign: "center", gap: "24px",
          position: "relative", zIndex: 1,
        }}>
          <p style={{
            color: "white",
            fontSize: text.length > 80 ? "48px" : text.length > 50 ? "58px" : "68px",
            fontWeight: 900,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            margin: 0,
            maxWidth: "900px",
          }}>
            {text}
          </p>

          {sub && (
            <p style={{
              color: "#C9A94A",
              fontSize: "22px",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "0.05em",
            }}>
              {sub}
            </p>
          )}
        </div>

        {/* Bottom watermark */}
        <div style={{
          position: "absolute", bottom: "36px", right: "50px",
          color: "rgba(255,255,255,0.15)", fontSize: "13px",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <span>🏅</span>
          <span>usc-platform-beta.vercel.app</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
