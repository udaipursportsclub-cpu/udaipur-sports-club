/**
 * FILE: src/app/api/ai/describe-event/route.ts
 *
 * What this does:
 * Uses Groq (free, fast) to auto-generate an event description
 * when the host clicks "Write for me" in the create event form.
 * Falls back gracefully if no GROQ_API_KEY is set.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse }  from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { title, sport, location, date, isFree, perPerson } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    // Fallback template if no AI key
    const desc = `Join us for an exciting ${sport} session${title ? ` — ${title}` : ""}! ${
      location ? `We're playing at ${location}.` : ""
    } ${isFree ? "This event is free to join." : `Contribution is ₹${perPerson} per person.`} All skill levels welcome. Come ready to play and have fun!`;
    return NextResponse.json({ description: desc });
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       "llama-3.1-8b-instant",
        max_tokens:  150,
        temperature: 0.7,
        messages: [{
          role:    "user",
          content: `Write a short, exciting event description (2-3 sentences, casual and friendly) for a sports event:
Title: ${title || sport + " event"}
Sport: ${sport}
Location: ${location || "Udaipur"}
Date: ${date || "upcoming"}
Cost: ${isFree ? "Free" : `₹${perPerson} per person`}

Write only the description. No quotes. No intro. Just the description.`,
        }],
      }),
    });
    const data = await res.json();
    const description = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ description });
  } catch {
    return NextResponse.json({ description: "" });
  }
}
