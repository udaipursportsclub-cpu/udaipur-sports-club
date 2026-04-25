/**
 * FILE: src/app/api/cron/weekly-recap/route.ts
 *
 * Weekly auto-post — runs every Sunday at 8am IST (2:30am UTC).
 * No human needed. USC's social media posts itself.
 *
 * Posts:
 *   - Weekly stats: games played, events, top athlete, top sport
 *   - AI-generated caption (Groq)
 *   - Goes to Instagram + X automatically
 *
 * Schedule: vercel.json → "30 2 * * 0"
 * Vercel calls this with: Authorization: Bearer <CRON_SECRET>
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { buildOAuthHeader }  from "@/lib/social";
import { NextResponse }      from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Verify the caller knows the secret.
  // cron-job.org can send it as ?secret= in the URL (easiest to configure),
  // or as Authorization: Bearer <secret> header — both work.
  const { searchParams } = new URL(request.url);
  const urlSecret  = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const validUrl    = urlSecret === cronSecret;
    const validHeader = authHeader === `Bearer ${cronSecret}`;
    if (!validUrl && !validHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin   = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://udaipursportsclub.vercel.app";

  // ── This week's stats ─────────────────────────────────────────────────
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { data: weekRsvps },
    { data: weekEvents },
    { count: totalMembers },
  ] = await Promise.all([
    admin.from("rsvps").select("user_id, user_name, events(sport)").gte("created_at", lastWeek),
    admin.from("events").select("id").eq("status", "upcoming"),
    admin.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  const gamesThisWeek = (weekRsvps ?? []).length;

  // Top sport this week
  const sportCounts: Record<string, number> = {};
  for (const r of weekRsvps ?? []) {
    const sport = (r.events as { sport?: string } | null)?.sport ?? "Sports";
    sportCounts[sport] = (sportCounts[sport] ?? 0) + 1;
  }
  const topSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Sports";

  // Top player this week
  const playerCounts: Record<string, { name: string; count: number }> = {};
  for (const r of weekRsvps ?? []) {
    if (!playerCounts[r.user_id]) playerCounts[r.user_id] = { name: r.user_name, count: 0 };
    playerCounts[r.user_id].count++;
  }
  const topPlayer = Object.values(playerCounts).sort((a, b) => b.count - a.count)[0];

  const upcomingCount = (weekEvents ?? []).length;

  const SPORT_EMOJIS: Record<string, string> = {
    Cricket: "🏏", Football: "⚽", Basketball: "🏀", Tennis: "🎾",
    Badminton: "🏸", Swimming: "🏊", Cycling: "🚴", Running: "🏃",
    Volleyball: "🏐", Kabaddi: "🤼", Chess: "♟️", Other: "🏅",
  };
  const topEmoji = SPORT_EMOJIS[topSport] ?? "🏅";

  // ── Generate AI caption ───────────────────────────────────────────────
  let caption = "";

  if (process.env.GROQ_API_KEY && gamesThisWeek > 0) {
    try {
      const prompt = `Write a weekly recap post for a sports community platform called "Udaipur Sports Club (USC)".

This week's stats:
- Games played: ${gamesThisWeek}
- Top sport: ${topSport} ${topEmoji}
- Top player: ${topPlayer?.name ?? "our champion"}
- Upcoming events: ${upcomingCount}
- Total members: ${totalMembers ?? 0}

Write two versions:
1. INSTAGRAM: Enthusiastic, community feel, 3-4 sentences + 6 relevant hashtags. Max 400 chars total.
2. TWITTER: Punchy, max 240 chars. Include 2-3 hashtags.

Format as:
INSTAGRAM: [caption here]
TWITTER: [tweet here]`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:       "llama3-8b-8192",
          messages:    [{ role: "user", content: prompt }],
          max_tokens:  400,
          temperature: 0.9,
        }),
      });
      const data = await res.json();
      caption = data?.choices?.[0]?.message?.content?.trim() ?? "";
    } catch {
      caption = "";
    }
  }

  // Parse out Instagram and Twitter captions
  const igMatch = caption.match(/INSTAGRAM:\s*([\s\S]+?)(?=TWITTER:|$)/i);
  const twMatch = caption.match(/TWITTER:\s*([\s\S]+?)$/i);

  const igCaption = igMatch?.[1]?.trim() || (gamesThisWeek === 0
    ? `Another week at Udaipur Sports Club 🏅\n\nCome join us — ${upcomingCount} events coming up this week.\n\n#UdaipurSportsClub #Udaipur #SportsCommunity #USC`
    : `${topEmoji} What a week at USC!\n\n${gamesThisWeek} games played · ${topSport} was the top sport\nStar of the week: ${topPlayer?.name ?? "our athletes"}\n\n${upcomingCount} events lined up — join the community!\n\n#UdaipurSportsClub #Udaipur #${topSport} #SportsCommunity`);

  const twCaption = twMatch?.[1]?.trim() || (gamesThisWeek === 0
    ? `Udaipur Sports Club is ready for another week 🏅 ${upcomingCount} events coming up. Join us! #USC #UdaipurSports`
    : `${topEmoji} ${gamesThisWeek} games this week at USC! ${topSport} was king. Top player: ${topPlayer?.name ?? "our athletes"}. ${upcomingCount} events this week — link in bio. #USC #UdaipurSportsClub #${topSport}`);

  // ── Post to social platforms ───────────────────────────────────────────
  const results: Record<string, string> = {};

  // Instagram
  if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID) {
    try {
      const token     = process.env.INSTAGRAM_ACCESS_TOKEN;
      const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

      // Use a placeholder image (the OG image of the homepage or leaderboard)
      const imageUrl = `${siteUrl}/api/og/wrapped/weekly`;

      const createRes = await fetch(
        `https://graph.facebook.com/v18.0/${accountId}/media`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: imageUrl, caption: igCaption, access_token: token }),
        }
      );
      const createData = await createRes.json();
      if (createData.id) {
        const publishRes = await fetch(`https://graph.facebook.com/v18.0/${accountId}/media_publish`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: createData.id, access_token: token }),
        });
        const pubData = await publishRes.json();
        results.instagram = pubData.id ? "posted" : "failed";
      } else {
        results.instagram = "failed";
      }
    } catch {
      results.instagram = "error";
    }
  } else {
    results.instagram = "not_configured";
  }

  // X (Twitter) — OAuth 1.0a (required for write access)
  if (process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_API_KEY &&
      process.env.TWITTER_API_SECRET && process.env.TWITTER_ACCESS_SECRET) {
    try {
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
        body: JSON.stringify({ text: twCaption }),
      });
      results.twitter = res.ok ? "posted" : "failed";
    } catch {
      results.twitter = "error";
    }
  } else {
    results.twitter = "not_configured";
  }

  return NextResponse.json({
    success: true,
    week: { gamesThisWeek, topSport, topPlayer: topPlayer?.name, upcomingCount },
    posted: results,
  });
}
