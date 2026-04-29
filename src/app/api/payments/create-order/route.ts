import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { amount, eventId, eventTitle } = await request.json();
  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
    },
    body: JSON.stringify({
      amount:   amount * 100, // paise
      currency: "INR",
      receipt:  `usc_${eventId}_${Date.now()}`,
      notes:    { eventId, eventTitle, userId: user.id },
    }),
  });

  const order = await res.json();
  if (!res.ok) {
    console.error("Razorpay order error:", order);
    return NextResponse.json({ error: "Could not create payment order" }, { status: 500 });
  }

  return NextResponse.json({ orderId: order.id, amount, keyId });
}
