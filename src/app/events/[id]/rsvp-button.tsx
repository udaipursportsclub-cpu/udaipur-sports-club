/**
 * FILE: src/app/events/[id]/rsvp-button.tsx
 *
 * What this does:
 * The RSVP button on an event page — handles both free and paid events.
 *
 * For FREE events:
 *   - "RSVP Now" → instantly confirmed
 *
 * For PAID events:
 *   - "RSVP & Pay ₹50 via UPI" → opens UPI app pre-filled with amount + host's UPI ID
 *   - After tapping, user is marked as RSVP'd (payment pending until host confirms)
 *
 * Host sees a "Mark as Paid" button next to each attendee.
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  eventId: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  hasRSVPed: boolean;
  isFull: boolean;
  isFree: boolean;           // Is this a free event?
  perPersonAmount: number;   // How much each person pays (0 if free)
  upiId: string | null;      // Host's UPI ID
  hostId: string;            // Host's user ID
  paymentStatus: string | null; // "pending", "paid", or "free"
};

export default function RSVPButton({
  eventId, userId, userName, userEmail,
  hasRSVPed, isFull, isFree,
  perPersonAmount, upiId, hostId,
  paymentStatus,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isHost = userId === hostId;

  // Not logged in
  if (!userId) {
    return (
      <a
        href="/login"
        className="block w-full text-center bg-slate-900 hover:bg-slate-700 text-white font-bold text-sm py-4 rounded-xl transition-colors"
      >
        Sign in to RSVP
      </a>
    );
  }

  // Event is full and user hasn't RSVPed
  if (isFull && !hasRSVPed) {
    return (
      <button disabled className="w-full bg-stone-100 text-slate-400 font-bold text-sm py-4 rounded-xl cursor-not-allowed">
        Event Full
      </button>
    );
  }

  async function handleRSVP() {
    setLoading(true);

    if (hasRSVPed) {
      // Cancel via API so waitlist notifications fire
      await fetch(`/api/events/${eventId}/cancel`, { method: "DELETE" });
    } else {
      // Add RSVP directly via Supabase client
      const supabase = createClient();
      await supabase.from("rsvps").insert({
        event_id:       eventId,
        user_id:        userId,
        user_name:      userName,
        user_email:     userEmail,
        payment_status: isFree ? "free" : "pending",
      });

      // For paid events — open UPI app right after RSVP
      if (!isFree && upiId) {
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(userName)}&am=${perPersonAmount}&cu=INR&tn=${encodeURIComponent("USC Event Contribution")}`;
        window.location.href = upiUrl;
      }
    }

    setLoading(false);
    router.refresh();
  }

  // Already RSVPed — show status + cancel option
  if (hasRSVPed) {
    return (
      <div className="space-y-3">
        {/* Payment status badge for paid events */}
        {!isFree && (
          <div className={`w-full text-center text-sm font-semibold py-3 rounded-xl ${
            paymentStatus === "paid"
              ? "bg-green-50 text-green-600 border border-green-200"
              : "bg-amber-50 text-amber-600 border border-amber-200"
          }`}>
            {paymentStatus === "paid"
              ? "✓ Payment confirmed by host"
              : `⏳ Payment pending — ₹${perPersonAmount} to ${upiId}`}
          </div>
        )}

        {/* Pay again button (if pending) */}
        {!isFree && paymentStatus !== "paid" && upiId && (
          <a
            href={`upi://pay?pa=${encodeURIComponent(upiId)}&am=${perPersonAmount}&cu=INR&tn=${encodeURIComponent("USC Event Contribution")}`}
            className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm py-3 rounded-xl transition-colors"
          >
            Pay ₹{perPersonAmount} via UPI →
          </a>
        )}

        {/* Cancel RSVP */}
        {!isHost && (
          <button
            onClick={handleRSVP}
            disabled={loading}
            className="w-full bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Cancel RSVP"}
          </button>
        )}
      </div>
    );
  }

  // Normal RSVP button (not yet RSVPed)
  return (
    <button
      onClick={handleRSVP}
      disabled={loading}
      className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-bold text-sm py-4 rounded-xl transition-colors"
    >
      {loading
        ? "Please wait..."
        : isFree
        ? "RSVP Now →"
        : `RSVP & Pay ₹${perPersonAmount} via UPI →`}
    </button>
  );
}
