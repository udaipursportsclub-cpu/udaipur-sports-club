/**
 * FILE: src/app/events/[id]/waitlist-button.tsx
 *
 * What this does:
 * Shows when an event is FULL and the user hasn't RSVPed.
 * They can join the waitlist to get notified the instant a spot opens.
 *
 * States:
 *   - Not on waitlist → "Join Waitlist" button
 *   - On waitlist     → shows their position + "Leave Waitlist" option
 *   - Not logged in   → "Sign in to join waitlist"
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId:      string;
  userId:       string | null;
  onWaitlist:   boolean;
  waitlistPos:  number | null; // their position (1-indexed), null if not on list
};

export default function WaitlistButton({
  eventId, userId, onWaitlist, waitlistPos,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Not logged in
  if (!userId) {
    return (
      <a
        href="/login"
        className="block w-full text-center bg-white border border-stone-300 hover:border-slate-400 text-slate-600 font-semibold text-sm py-3.5 rounded-xl transition-colors"
      >
        Sign in to join waitlist
      </a>
    );
  }

  // Already on waitlist
  if (onWaitlist && waitlistPos) {
    return (
      <div className="space-y-2">
        <div className="w-full text-center bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-sm py-3.5 rounded-xl">
          You&apos;re #{waitlistPos} on the waitlist
          <span className="block text-xs font-normal text-blue-400 mt-0.5">
            We&apos;ll email you the moment a spot opens
          </span>
        </div>
        <button
          onClick={async () => {
            setLoading(true);
            await fetch(`/api/events/${eventId}/waitlist`, { method: "DELETE" });
            setLoading(false);
            router.refresh();
          }}
          disabled={loading}
          className="w-full text-xs text-slate-400 hover:text-red-400 transition-colors py-2 disabled:opacity-50"
        >
          {loading ? "Please wait..." : "Leave waitlist"}
        </button>
      </div>
    );
  }

  // Not on waitlist — show join button
  return (
    <button
      onClick={async () => {
        setLoading(true);
        await fetch(`/api/events/${eventId}/waitlist`, { method: "POST" });
        setLoading(false);
        router.refresh();
      }}
      disabled={loading}
      className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm py-3.5 rounded-xl transition-colors"
    >
      {loading ? "Please wait..." : "Join Waitlist →"}
    </button>
  );
}
