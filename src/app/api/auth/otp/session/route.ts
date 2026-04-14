/**
 * FILE: src/app/api/auth/otp/session/route.ts
 *
 * What this does:
 * After OTP is verified, this creates an actual login session for the user.
 * Uses the Supabase admin client to generate a magic link that signs the user in.
 *
 * POST body: { userId: "uuid-of-the-user" }
 * Response: { success: true, redirectUrl: "/auth/callback?code=..." }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Look up the user's email from auth.users (needed for magic link)
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Generate a magic link for this user (signs them in without password)
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
        },
      });

    if (linkError || !linkData) {
      console.error("Magic link error:", linkError);
      return NextResponse.json(
        { error: "Could not create login session." },
        { status: 500 }
      );
    }

    // The generated link contains a hashed token — extract it
    // The link format is: {site_url}/auth/callback#access_token=...
    // But admin generateLink returns the properties directly
    const {
      properties: { hashed_token },
    } = linkData;

    // Build the verify URL that Supabase expects
    const redirectTo = encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/dashboard`);
    const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${hashed_token}&type=magiclink&redirect_to=${redirectTo}`;

    return NextResponse.json({
      success: true,
      redirectUrl: verifyUrl,
    });
  } catch (err) {
    console.error("Session creation error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
