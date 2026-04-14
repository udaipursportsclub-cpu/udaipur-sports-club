/**
 * FILE: src/app/api/auth/otp/verify/route.ts
 *
 * What this does:
 * Verifies a 6-digit OTP code that a user entered.
 * If valid, checks if there's a profile with that phone number.
 * If the profile exists, returns the user ID so we can create a session.
 *
 * POST body: { phone: "9876543210", code: "123456" }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone and code are required." },
        { status: 400 }
      );
    }

    const cleaned = phone.replace(/\s+/g, "").replace(/^\+91/, "");

    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return NextResponse.json(
        { error: "Invalid phone number." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "OTP must be 6 digits." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // --- Find a matching, unexpired, unused OTP ---
    const { data: otpRow, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", cleaned)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRow) {
      return NextResponse.json(
        { error: "Invalid or expired OTP. Try again." },
        { status: 400 }
      );
    }

    // --- Mark OTP as used ---
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRow.id);

    // --- Find profile with this phone number ---
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("phone", cleaned)
      .limit(1)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error:
            "No account found with this phone number. Sign up with Google first, then add your phone in Settings.",
          noAccount: true,
        },
        { status: 404 }
      );
    }

    // --- Return user info (session will be created by the /session endpoint) ---
    return NextResponse.json({
      success: true,
      userId: profile.id,
      name: profile.full_name,
    });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
