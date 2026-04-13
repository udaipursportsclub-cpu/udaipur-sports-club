/**
 * FILE: src/app/events/[id]/rsvp-button.tsx
 *
 * What this does:
 * This is the RSVP button on an event page.
 * It handles three situations:
 *   1. User is not logged in — shows "Sign in to RSVP"
 *   2. User already RSVPed — shows "Cancel RSVP"
 *   3. Event is full — shows "Event Full"
 *   4. Normal — shows "RSVP Now"
 *
 * "use client" because it responds to button clicks.
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  eventId: string;       // Which event this button is for
  userId: string | null; // The logged-in user's ID (null if not logged in)
  userName: string;      // The logged-in user's name
  userEmail: string;     // The logged-in user's email
  hasRSVPed: boolean;    // Has this user already RSVPed?
  isFull: boolean;       // Is the event at capacity?
};

export default function RSVPButton({
  eventId,
  userId,
  userName,
  userEmail,
  hasRSVPed,
  isFull,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Not logged in — send to login page
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
      <button
        disabled
        className="w-full bg-stone-100 text-slate-400 font-bold text-sm py-4 rounded-xl cursor-not-allowed"
      >
        Event Full
      </button>
    );
  }

  /**
   * handleRSVP()
   * If the user hasn't RSVPed → add their RSVP
   * If they have → remove it (cancel)
   */
  async function handleRSVP() {
    setLoading(true);
    const supabase = createClient();

    if (hasRSVPed) {
      // Cancel RSVP — delete from database
      await supabase
        .from("rsvps")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId!);
    } else {
      // Add RSVP — insert into database
      await supabase.from("rsvps").insert({
        event_id:   eventId,
        user_id:    userId,
        user_name:  userName,
        user_email: userEmail,
      });
    }

    setLoading(false);
    // Refresh the page to show the updated RSVP count and button state
    router.refresh();
  }

  return (
    <button
      onClick={handleRSVP}
      disabled={loading}
      className={`w-full font-bold text-sm py-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
        hasRSVPed
          ? // Already RSVPed → show red "Cancel" button
            "bg-red-50 hover:bg-red-100 text-red-500 border border-red-200"
          : // Not RSVPed → show amber "RSVP Now" button
            "bg-amber-500 hover:bg-amber-400 text-white"
      }`}
    >
      {loading
        ? "Please wait..."
        : hasRSVPed
        ? "Cancel RSVP"
        : "RSVP Now →"}
    </button>
  );
}
