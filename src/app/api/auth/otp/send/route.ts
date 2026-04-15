/**
 * FILE: src/app/api/auth/otp/send/route.ts
 *
 * What this does:
 * Sends a 6-digit OTP to a user's phone number via WhatsApp.
 * The OTP is stored in the database and expires after 5 minutes.
 *
 * POST body: { phone: "9876543210" }
 * Response: { success: true, method: "whatsapp_api" | "manual" }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    // --- Validate Indian phone number ---
    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    // Clean up: remove spaces, +91 prefix
    const cleaned = phone.replace(/\s+/g, "").replace(/^\+91/, "");

    // Must be exactly 10 digits, starting with 6-9
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian phone number." },
        { status: 400 }
      );
    }

    // --- Rate limit: max 3 OTPs per phone in last 10 minutes ---
    const supabase = createAdminClient();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { count } = await supabase
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", cleaned)
      .gte("created_at", tenMinutesAgo);

    if (count && count >= 3) {
      return NextResponse.json(
        { error: "Too many OTP requests. Wait a few minutes and try again." },
        { status: 429 }
      );
    }

    // --- Generate 6-digit OTP ---
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // --- Store in database ---
    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone: cleaned,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("OTP insert error:", insertError);
      return NextResponse.json(
        { error: "Could not generate OTP. Try again." },
        { status: 500 }
      );
    }

    // --- Send via WhatsApp ---
    const message = `Your USC login code is: *${code}*\nValid for 5 minutes.\n\nDo not share this with anyone.`;
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (whatsappToken && whatsappPhoneId) {
      // Send via WhatsApp Cloud API
      try {
        const waResponse = await fetch(
          `https://graph.facebook.com/v21.0/${whatsappPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${whatsappToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: `91${cleaned}`,
              type: "text",
              text: { body: message },
            }),
          }
        );

        if (waResponse.ok) {
          return NextResponse.json({ success: true, method: "whatsapp_api" });
        }
      } catch (waError) {
        console.error("WhatsApp API error:", waError);
        // Fall through to manual method
      }
    }

    // Fallback 1: Send via Fast2SMS (free SMS OTP for India)
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey) {
      try {
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "authorization": fast2smsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "otp",
            variables_values: code,
            numbers: cleaned,
          }),
        });

        const smsData = await smsRes.json();
        if (smsData.return === true) {
          return NextResponse.json({ success: true, method: "sms" });
        }
      } catch (smsErr) {
        console.error("Fast2SMS error:", smsErr);
        // Fall through to next fallback
      }
    }

    // Fallback 2: Send via email using Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const { data: profileMatch } = await supabase
        .from("profiles")
        .select("id, notify_email")
        .eq("phone", cleaned)
        .single();

      if (profileMatch) {
        const { data: authUser } = await supabase.auth.admin.getUserById(profileMatch.id);
        const email = profileMatch.notify_email || authUser?.user?.email;

        if (email) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: "USC <onboarding@resend.dev>",
                to: email,
                subject: `Your USC login code: ${code}`,
                html: `<div style="font-family:sans-serif;padding:20px"><h2>Your login code</h2><p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#f59e0b">${code}</p><p>Valid for 5 minutes. Do not share.</p><p style="color:#999;font-size:12px">— Udaipur Sports Club</p></div>`,
              }),
            });
            return NextResponse.json({ success: true, method: "email", email: email.replace(/(.{2}).*(@.*)/, "$1***$2") });
          } catch {
            // Fall through
          }
        }
      }
    }

    // Fallback 3: Phone not registered yet — tell user to sign up first
    return NextResponse.json({
      error: "This phone number is not registered. Sign up with Google first, then add your phone in Settings.",
    }, { status: 404 });
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
