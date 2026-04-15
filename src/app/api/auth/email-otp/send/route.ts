/**
 * Send a 6-digit OTP to an email address using Resend (free).
 * POST body: { email: "user@gmail.com" }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const cleaned = email.toLowerCase().trim();
    const admin = createAdminClient();

    // Rate limit: max 3 codes per email in 10 min
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", cleaned)  // reusing phone column for email
      .gte("created_at", tenMinAgo);

    if (count && count >= 3) {
      return NextResponse.json({ error: "Too many requests. Wait a few minutes." }, { status: 429 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store in DB
    await admin.from("otp_codes").insert({
      phone: cleaned,  // reusing column for email
      code,
      expires_at: expiresAt,
    });

    // Send via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "Email service not configured." }, { status: 500 });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "USC <onboarding@resend.dev>",
        to: cleaned,
        subject: `${code} — Your USC login code`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:400px;margin:0 auto;padding:40px 20px;text-align:center">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f97316);margin:0 auto 20px;display:flex;align-items:center;justify-content:center">
              <span style="color:white;font-weight:900;font-size:16px">U</span>
            </div>
            <h2 style="color:#111;margin:0 0 8px;font-size:20px">Your login code</h2>
            <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#f59e0b;margin:24px 0;padding:16px;background:#fef3c7;border-radius:12px">${code}</div>
            <p style="color:#666;font-size:14px;margin:0 0 4px">Valid for 5 minutes</p>
            <p style="color:#999;font-size:12px;margin:24px 0 0">Udaipur Sports Club</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json();
      console.error("Resend error:", errData);
      return NextResponse.json({ error: "Failed to send email. Try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email OTP error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
