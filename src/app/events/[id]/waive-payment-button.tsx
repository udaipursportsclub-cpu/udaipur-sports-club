/**
 * FILE: src/app/events/[id]/waive-payment-button.tsx
 *
 * A small "Waive" button shown next to unpaid attendees.
 * Only visible to the host or admin. Calls the waive-payment API.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  eventId: string;
  rsvpId: string;
  paymentStatus: string;
};

export default function WaivePaymentButton({ eventId, rsvpId, paymentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (paymentStatus === "waived" || paymentStatus === "paid") return null;

  async function waive() {
    if (!confirm("Waive payment for this person? They can attend without paying.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/waive-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Could not waive payment");
      }

      router.refresh();
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={waive}
      disabled={loading}
      className="text-xs font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-full hover:bg-blue-400/20 transition-colors disabled:opacity-50 ml-2"
    >
      {loading ? "..." : "Waive"}
    </button>
  );
}
