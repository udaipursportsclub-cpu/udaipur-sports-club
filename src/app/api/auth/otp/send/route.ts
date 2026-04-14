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

    // Fallback: return wa.me link for admin to manually send
    const encodedMessage = encodeURIComponent(message);
    const waLink = `https://wa.me/91${cleaned}?text=${encodedMessage}`;

    return NextResponse.json({
      success: true,
      method: "manual",
      waLink,
      // In dev/testing, also return the code so the admin can see it
      ...(process.env.NODE_ENV === "development" ? { devCode: code } : {}),
    });
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
