/**
 * FILE: src/app/events/[id]/mark-paid-button.tsx
 *
 * What this does:
 * A small button that only the HOST can see next to each attendee.
 * When clicked, it marks that person's payment as confirmed.
 * The attendee will then see "✓ Payment confirmed by host" on their end.
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  rsvpId: string;          // The RSVP record to update
  paymentStatus: string;   // Current status: "pending" or "paid"
};

export default function MarkPaidButton({ rsvpId, paymentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();

    // Toggle between paid and pending
    const newStatus = paymentStatus === "paid" ? "pending" : "paid";

    await supabase
      .from("rsvps")
      .update({ payment_status: newStatus })
      .eq("id", rsvpId);

    setLoading(false);
    router.refresh(); // Refresh page to show updated status
  }

  if (paymentStatus === "paid") {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-60"
      >
        {loading ? "..." : "✓ Paid"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="text-xs font-semibold text-slate-400 bg-stone-50 border border-stone-200 px-3 py-1 rounded-full hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors disabled:opacity-60"
    >
      {loading ? "..." : "Mark paid"}
    </button>
  );
}
