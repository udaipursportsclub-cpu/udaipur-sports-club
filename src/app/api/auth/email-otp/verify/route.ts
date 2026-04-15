/**
 * Verify a 6-digit OTP sent to email.
 * POST body: { email: "user@gmail.com", code: "123456" }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code required." }, { status: 400 });
    }

    const cleaned = email.toLowerCase().trim();
    const admin = createAdminClient();

    // Find valid OTP
    const now = new Date().toISOString();
    const { data: otpRow } = await admin
      .from("otp_codes")
      .select("id")
      .eq("phone", cleaned)  // reusing column
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRow) {
      return NextResponse.json({ error: "Invalid or expired code. Try again." }, { status: 400 });
    }

    // Mark as used
    await admin.from("otp_codes").update({ used: true }).eq("id", otpRow.id);

    return NextResponse.json({ success: true, email: cleaned });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
