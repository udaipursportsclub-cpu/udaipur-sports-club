/**
 * FILE: src/app/api/og/platform/route.tsx
 *
 * Generic USC brand card — used as a fallback image for social posts
 * when no specific event or user card is available.
 */

export const runtime = "edge";
import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: "1200px", height: "630px",
        background: "linear-gradient(135deg, #050A18 0%, #0C1B35 50%, #050A18 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "-150px", left: "50%",
          transform: "translateX(-50%)",
          width: "700px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,169,74,0.18) 0%, transparent 70%)",
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: "-100px", right: "100px",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          display: "flex",
        }} />

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", position: "relative", zIndex: 1 }}>
          {/* Trophy */}
          <span style={{ fontSize: "80px", lineHeight: 1 }}>🏅</span>

          {/* USC wordmark */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <span style={{
              color: "#C9A94A", fontSize: "14px", fontWeight: 800,
              letterSpacing: "0.4em", textTransform: "uppercase",
            }}>
              UDAIPUR SPORTS CLUB
            </span>
            <span style={{
              color: "white", fontSize: "88px", fontWeight: 900,
              letterSpacing: "-0.04em", lineHeight: 1,
            }}>
              USC
            </span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "20px", fontWeight: 500 }}>
              The Home for Every Sport in the City of Lakes
            </span>
          </div>

          {/* Pills */}
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            {["Cricket", "Football", "Badminton", "Tennis", "Basketball"].map((s) => (
              <div key={s} style={{
                color: "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 600,
                background: "rgba(255,255,255,0.07)", borderRadius: "20px",
                padding: "6px 16px", border: "1px solid rgba(255,255,255,0.1)",
              }}>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL */}
        <div style={{
          position: "absolute", bottom: "28px",
          color: "rgba(255,255,255,0.2)", fontSize: "12px",
          display: "flex",
        }}>
          udaipursportsclub.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
