/**
 * Create a Supabase session after email OTP verification.
 * Uses Supabase magic link generation via admin client.
 * POST body: { email: "user@gmail.com" }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const cleaned = email.toLowerCase().trim();
    const admin = createAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://udaipursportsclub.vercel.app";

    // Generate a magic link for this email
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: cleaned,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error || !data) {
      console.error("Magic link error:", error);
      return NextResponse.json({ error: "Could not create session." }, { status: 500 });
    }

    // The verification URL signs the user in
    const redirectUrl = `${siteUrl}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=${encodeURIComponent("/dashboard")}`;

    return NextResponse.json({ success: true, redirectUrl });
  } catch (err) {
    console.error("Session error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
