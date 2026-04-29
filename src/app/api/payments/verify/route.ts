import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }       from "next/server";
import crypto                 from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId, userName, userEmail, spots } = await request.json();

  // Verify signature
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const expected  = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Create RSVP(s) as paid
  const admin = createAdminClient();
  for (let i = 0; i < (spots ?? 1); i++) {
    await admin.from("rsvps").insert({
      event_id:       eventId,
      user_id:        user.id,
      user_name:      userName,
      user_email:     userEmail,
      payment_status: "paid",
      payment_id:     razorpay_payment_id,
    });
  }

  return NextResponse.json({ success: true });
}
