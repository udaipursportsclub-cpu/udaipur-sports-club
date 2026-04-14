/**
 * FILE: src/app/api/ai/outreach/route.ts
 *
 * AI Business Outreach Generator.
 * Generates a ready-to-send WhatsApp/email pitch to approach hotels,
 * restaurants, gyms, parks, or sports clubs for collaboration.
 *
 * Avi enters the business name + type → AI writes a personal message.
 * He copies it → sends on WhatsApp → business says yes → events happen there.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "proxy") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { businessName, businessType, language, customNote } = await request.json();

  const admin = createAdminClient();
  const { count: memberCount } = await admin
    .from("profiles").select("*", { count: "exact", head: true });
  const { count: eventCount } = await admin
    .from("events").select("*", { count: "exact", head: true });

  const isHindi = language === "hinglish";

  const valuePropositions: Record<string, string> = {
    hotel:      "host sports events and wellness activities for your guests and the local community",
    restaurant: "host pre/post-match team dinners and sports community meetups, driving foot traffic",
    gym:        "refer members to each other and co-host fitness events",
    park:       "organize structured sports sessions in your space, bringing regular footfall",
    club:       "list your events on our platform and reach our community of active sports enthusiasts",
    cafe:       "be the official meeting point for USC members before events",
    other:      "collaborate on sports events that benefit both our communities",
  };

  const value = valuePropositions[businessType] ?? valuePropositions.other;

  let message = "";

  if (process.env.GROQ_API_KEY) {
    try {
      const prompt = isHindi
        ? `Write a friendly WhatsApp message in Hinglish (mix of Hindi and English) from Udaipur Sports Club (USC) to "${businessName}" (a ${businessType} in Udaipur).

USC facts:
- ${memberCount ?? 0} active sports members in Udaipur
- ${eventCount ?? 0} events organized
- Covers Cricket, Football, Badminton, Tennis and more

Goal: Propose a collaboration to ${value}.

Keep it:
- Friendly, not too formal
- Short (under 150 words)
- Personal, mention their name
- End with a clear call to action (reply to discuss / call / meet)
${customNote ? `\nAlso mention: ${customNote}` : ""}

Write only the message. Start with "Namaste" or "Hello".`
        : `Write a friendly WhatsApp message in English from Udaipur Sports Club (USC) to "${businessName}" (a ${businessType} in Udaipur).

USC facts:
- ${memberCount ?? 0} active members
- ${eventCount ?? 0} events organized
- Sports: Cricket, Football, Badminton, Tennis and more

Goal: Propose a collaboration to ${value}.

Keep it:
- Friendly but professional
- Short (under 150 words)
- Personal, mention their business
- End with a clear CTA
${customNote ? `\nAlso mention: ${customNote}` : ""}

Write only the message.`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:       "llama3-8b-8192",
          messages:    [{ role: "user", content: prompt }],
          max_tokens:  300,
          temperature: 0.8,
        }),
      });
      const data = await res.json();
      message = data?.choices?.[0]?.message?.content?.trim() ?? "";
    } catch { /* fallback */ }
  }

  if (!message) {
    // Template fallback
    message = `Hello ${businessName}! 👋

I'm Avi from Udaipur Sports Club (USC) — a growing sports community in Udaipur with ${memberCount ?? 0}+ active members.

We organize regular Cricket, Football, Badminton and other sports events across the city, and I'd love to explore a collaboration with you.

We believe we can ${value} — a win-win for both our communities.

Would love to connect and discuss! Reply here or give me a call.

Thanks!
Avi | Udaipur Sports Club`;
  }

  return NextResponse.json({ message });
}
