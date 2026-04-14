/**
 * FILE: src/app/api/admin/post-social/route.ts
 *
 * Manual social posting endpoint for the admin social hub.
 * Avi uploads a photo/video + optional caption → posts to Instagram + X.
 *
 * POST body (multipart/form-data):
 *   - file:      Image or video file (optional — falls back to OG card)
 *   - caption:   Text caption (optional — AI generates if empty)
 *   - platform:  "all" | "instagram" | "twitter" (default: "all")
 *   - eventId:   Event ID to use its OG image (optional)
 *   - mediaType: "image" | "reel" (default: "image")
 */

import { createClient }      from "@/lib/supabase/server";
import { uploadToImgBB }     from "@/lib/imgbb";
import { buildOAuthHeader }  from "@/lib/social";
import { NextResponse }      from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Admin-only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin" && profile?.role !== "proxy") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const formData  = await request.formData();
  const file      = formData.get("file") as File | null;
  const caption   = formData.get("caption") as string | null;
  const platform  = (formData.get("platform") as string) ?? "all";
  const eventId   = formData.get("eventId") as string | null;
  const mediaType = (formData.get("mediaType") as string) ?? "image";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usc-platform-beta.vercel.app";

  // ── Upload file to Supabase Storage ─────────────────────────────────
  let mediaUrl = "";

  if (file && file.size > 0) {
    try {
      const bytes  = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const name   = `usc-social-${Date.now()}`;
      const { url } = await uploadToImgBB(buffer, name);
      mediaUrl = url;
    } catch {
      // Fall through to OG image fallback
    }
  }

  // Fall back to event OG image or platform card
  if (!mediaUrl) {
    mediaUrl = eventId
      ? `${siteUrl}/api/og/event/${eventId}`
      : `${siteUrl}/api/og/platform`;
  }

  // ── AI caption if not provided ───────────────────────────────────────
  let finalCaption = caption?.trim() ?? "";

  if (!finalCaption && process.env.GROQ_API_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:       "llama3-8b-8192",
          messages: [{
            role: "user",
            content: `Write a short, hype Instagram caption for Udaipur Sports Club (a sports community in Udaipur, Rajasthan). Make it exciting, friendly, and include 5-6 relevant hashtags. Max 300 characters. No quotes.`,
          }],
          max_tokens:  200,
          temperature: 1.0,
        }),
      });
      const data = await res.json();
      finalCaption = data?.choices?.[0]?.message?.content?.trim() ?? "";
    } catch { /* fallback */ }
  }

  if (!finalCaption) {
    finalCaption = `Udaipur Sports Club 🏅\n\nThe home for every sport in the City of Lakes. Join us!\n\nLink in bio\n#UdaipurSportsClub #Udaipur #SportsCommunity #USC`;
  }

  // ── Post to platforms ────────────────────────────────────────────────
  const results: Record<string, string> = {};

  // Instagram
  if ((platform === "all" || platform === "instagram") &&
       process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID) {
    try {
      const token     = process.env.INSTAGRAM_ACCESS_TOKEN;
      const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

      const body: Record<string, string> = {
        caption: finalCaption,
        access_token: token!,
        ...(mediaType === "reel"
          ? { media_type: "REELS", video_url: mediaUrl, share_to_feed: "true" }
          : { image_url: mediaUrl }
        ),
      };

      const createRes = await fetch(`https://graph.facebook.com/v18.0/${accountId}/media`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const createData = await createRes.json();

      if (createData.id) {
        if (mediaType === "reel") {
          // Reels need a processing delay — return the container ID
          results.instagram = `processing:${createData.id}`;
        } else {
          await fetch(`https://graph.facebook.com/v18.0/${accountId}/media_publish`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creation_id: createData.id, access_token: token }),
          });
          results.instagram = "posted";
        }
      } else {
        results.instagram = `failed: ${createData.error?.message ?? "unknown"}`;
      }
    } catch (e) {
      results.instagram = `error: ${e}`;
    }
  } else if (platform === "all" || platform === "instagram") {
    results.instagram = "not_configured";
  }

  // X (Twitter) — OAuth 1.0a (required for write access)
  if ((platform === "all" || platform === "twitter") &&
       process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_API_KEY &&
       process.env.TWITTER_API_SECRET && process.env.TWITTER_ACCESS_SECRET) {
    try {
      // Truncate to 280 chars for X
      const tweetText = (finalCaption + (eventId ? `\n${siteUrl}/events/${eventId}` : `\n${siteUrl}`))
        .slice(0, 280);

      const oauthHeader = buildOAuthHeader("POST", "https://api.twitter.com/2/tweets", {
        apiKey:       process.env.TWITTER_API_KEY,
        apiSecret:    process.env.TWITTER_API_SECRET,
        accessToken:  process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
      });

      const res = await fetch("https://api.twitter.com/2/tweets", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": oauthHeader,
        },
        body: JSON.stringify({ text: tweetText }),
      });
      const data = await res.json();
      results.twitter = data.data?.id ? "posted" : `failed: ${data.title ?? "unknown"}`;
    } catch (e) {
      results.twitter = `error: ${e}`;
    }
  } else if (platform === "all" || platform === "twitter") {
    results.twitter = "not_configured";
  }

  return NextResponse.json({ success: true, mediaUrl, caption: finalCaption, results });
}
