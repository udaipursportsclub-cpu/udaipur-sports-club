/**
 * FILE: src/app/api/cron/daily-nudge/route.ts
 *
 * Daily auto-post — runs every weekday (Mon–Fri) at 9am IST (3:30am UTC).
 *
 * If events today/this week  → posts the event with hype caption
 * If NO events               → AI writes a desi sports meme (Indian humor,
 *                              Hinglish, cricket references, relatable 18-30)
 *
 * Schedule: cron-job.org → "30 3 * * 1-5"
 * Call URL: /api/cron/daily-nudge?secret=YOUR_CRON_SECRET
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usc-platform-beta.vercel.app";

  // Check for events today or in next 3 days
  const today = new Date().toISOString().split("T")[0];
  const in3   = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

  const [
    { data: upcomingEvents },
    { count: memberCount },
  ] = await Promise.all([
    admin.from("events").select("id, title, sport, date, time, location, capacity")
      .eq("status", "upcoming").gte("date", today).lte("date", in3)
      .order("date", { ascending: true }).limit(3),
    admin.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  const SPORT_EMOJIS: Record<string, string> = {
    Cricket: "🏏", Football: "⚽", Basketball: "🏀", Tennis: "🎾",
    Badminton: "🏸", Swimming: "🏊", Cycling: "🚴", Running: "🏃",
    Volleyball: "🏐", Kabaddi: "🤼", Chess: "♟️", Other: "🏅",
  };

  const events = upcomingEvents ?? [];

  let igCaption = "";
  let twCaption = "";
  let imageUrl  = `${siteUrl}/api/og/platform`; // default fallback

  // ── CASE 1: Events exist — feature them ───────────────────────────────
  if (events.length > 0) {
    const ev       = events[0];
    const emoji    = SPORT_EMOJIS[ev.sport] ?? "🏅";
    const eventUrl = `${siteUrl}/events/${ev.id}`;
    const dateStr  = new Date(ev.date).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
    });

    imageUrl = `${siteUrl}/api/og/event/${ev.id}`;

    if (process.env.GROQ_API_KEY) {
      try {
        const prompt = `Write a short hype social media post for this USC (Udaipur Sports Club) event:

Event: ${ev.sport} — "${ev.title}"
Date: ${dateStr} | Location: ${ev.location}
Members: ${memberCount ?? 0}

INSTAGRAM: 2-3 excited sentences + 5 hashtags. Community vibe.
TWITTER: Max 240 chars. Include [LINK] placeholder.

Format:
INSTAGRAM: [text]
TWITTER: [text]`;

        const res  = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "user", content: prompt }], max_tokens: 280, temperature: 0.9 }),
        });
        const data = await res.json();
        const raw: string = data?.choices?.[0]?.message?.content?.trim() ?? "";

        const igM = raw.match(/INSTAGRAM:\s*([\s\S]+?)(?=TWITTER:|$)/i);
        const twM = raw.match(/TWITTER:\s*([\s\S]+?)$/i);
        igCaption = igM?.[1]?.trim() ?? "";
        twCaption = twM?.[1]?.trim().replace("[LINK]", eventUrl) ?? "";
      } catch { /* fallback */ }
    }

    if (!igCaption) igCaption = `${emoji} ${ev.sport} happening soon!\n\n"${ev.title}"\n📅 ${dateStr} · 📍 ${ev.location}\n\nSpots filling up — link in bio!\n\n#UdaipurSportsClub #${ev.sport} #Udaipur #SportsCommunity`;
    if (!twCaption) twCaption = `${emoji} "${ev.title}" — ${dateStr} at ${ev.location}. Join → ${eventUrl} #USC #${ev.sport}`;

  // ── CASE 2: No events — post a desi sports meme ───────────────────────
  } else {
    let memeText = "";
    let memeSub  = "";

    if (process.env.GROQ_API_KEY) {
      try {
        const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const day  = days[new Date().getDay()];

        const prompt = `You are running a popular Indian sports meme page (think: Sarcasm India, Being Indian, IPL meme pages, Cricbuzz comments section). Your audience is 18-30 year olds from Udaipur, Rajasthan who love sports.

Today is ${day}. No sports events are scheduled today on Udaipur Sports Club.

Write one funny, relatable sports meme post. Think:
- "Seedha dil pe laga" moments
- The gap between "I'll play this weekend" and reality
- Cricket/IPL references (Kohli, Dhoni, MS, IPL, World Cup)
- Kabaddi, badminton, or local sports references
- Hinglish is great (mix Hindi words naturally — "yaar", "bhai", "seedha", "pakka", "toh", "bhi", etc.)
- Short and punchy — meme energy

Output format (nothing else):
MEME_TEXT: [big bold text on the meme card — max 10 words, punchy]
MEME_SUB: [optional funny subtext — max 6 words, can be empty]
INSTAGRAM: [caption with context, 2-3 lines + 6 hashtags including #UdaipurSportsClub]
TWITTER: [punchline tweet max 240 chars, include #USC]`;

        const res  = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "user", content: prompt }], max_tokens: 400, temperature: 1.1 }),
        });
        const data = await res.json();
        const raw: string = data?.choices?.[0]?.message?.content?.trim() ?? "";

        const mtM = raw.match(/MEME_TEXT:\s*(.+?)(?=\n|MEME_SUB:|INSTAGRAM:|$)/i);
        const msM = raw.match(/MEME_SUB:\s*(.+?)(?=\n|INSTAGRAM:|$)/i);
        const igM = raw.match(/INSTAGRAM:\s*([\s\S]+?)(?=TWITTER:|$)/i);
        const twM = raw.match(/TWITTER:\s*([\s\S]+?)$/i);

        memeText  = mtM?.[1]?.trim() ?? "";
        memeSub   = msM?.[1]?.trim() ?? "";
        igCaption = igM?.[1]?.trim() ?? "";
        twCaption = twM?.[1]?.trim() ?? "";
      } catch { /* fallback */ }
    }

    // Hardcoded fallback memes — desi flavor
    if (!memeText) {
      const memes = [
        { t: "Weekend plan: play. Reality: soya 😂",           s: "Every. Single. Time." },
        { t: "Bhai, Dhoni bhi retire hone se pehle khela tha", s: "Chhod mat 🏏" },
        { t: "Aaj toh pakka khelenge",                         s: "Also us: *zzz*" },
        { t: "Match dekhna vs match khelna",                   s: "We choose both 🏅" },
        { t: "Jab coach bolta hai '5 more laps'",              s: "Bhai mereko ghar jaana hai 💀" },
        { t: "Hum vs hum jab schedule aata hai",               s: "Same team, different mood" },
        { t: "IPL dekha. Ab khud bhi khelna hai.",             s: "Udaipur mein milte hain 🏏" },
      ];
      const pick = memes[Math.floor(Math.random() * memes.length)];
      memeText = pick.t;
      memeSub  = pick.s;
    }

    if (!igCaption) {
      igCaption = `${memeText}\n\n${memeSub}\n\nAao khelo yaar — events hai, team hai, sirf tum nahi ho 😤\nLink in bio 👉 Udaipur Sports Club\n\n#UdaipurSportsClub #SportsMeme #DesiMemes #Udaipur #Cricket #USC`;
    }
    if (!twCaption) {
      twCaption = `${memeText} ${memeSub} 😂 #USC #UdaipurSportsClub`.slice(0, 280);
    }

    // Use the meme card as the image
    imageUrl = `${siteUrl}/api/og/meme?text=${encodeURIComponent(memeText)}&sub=${encodeURIComponent(memeSub)}`;
  }

  // ── Post to platforms ────────────────────────────────────────────────────
  const results: Record<string, string> = {};

  // Instagram
  if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID) {
    try {
      const token     = process.env.INSTAGRAM_ACCESS_TOKEN;
      const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

      const createRes = await fetch(`https://graph.facebook.com/v18.0/${accountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, caption: igCaption, access_token: token }),
      });
      const createData = await createRes.json();
      if (createData.id) {
        await fetch(`https://graph.facebook.com/v18.0/${accountId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: createData.id, access_token: token }),
        });
        results.instagram = "posted";
      } else {
        results.instagram = `failed: ${createData.error?.message ?? "unknown"}`;
      }
    } catch {
      results.instagram = "error";
    }
  } else {
    results.instagram = "not_configured";
  }

  // X
  if (process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_API_KEY) {
    try {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.TWITTER_ACCESS_TOKEN}` },
        body: JSON.stringify({ text: twCaption }),
      });
      results.twitter = res.ok ? "posted" : "failed";
    } catch {
      results.twitter = "error";
    }
  } else {
    results.twitter = "not_configured";
  }

  return NextResponse.json({ success: true, events: events.length, imageUrl, posted: results });
}
