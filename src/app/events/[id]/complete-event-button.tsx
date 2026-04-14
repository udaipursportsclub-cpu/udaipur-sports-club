/**
 * FILE: src/app/events/[id]/complete-event-button.tsx
 *
 * What this does:
 * A button visible ONLY to the host. They click it once the event is done.
 * This unlocks the "I Played" share cards for all attendees.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
};

export default function CompleteEventButton({ eventId }: Props) {
  const router = useRouter();
  const [loading, setLoading]     = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleComplete() {
    if (!confirmed) {
      setConfirmed(true); // First click shows confirmation
      return;
    }
    setLoading(true);
    await fetch(`/api/events/${eventId}/complete`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  if (loading) {
    return (
      <button disabled className="w-full bg-green-50 text-green-400 font-semibold text-sm py-3 rounded-xl opacity-60">
        Marking as complete...
      </button>
    );
  }

  if (confirmed) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-center text-slate-500">
          This will unlock &quot;I Played&quot; cards for all attendees. Can&apos;t be undone.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setConfirmed(false)}
            className="bg-stone-100 hover:bg-stone-200 text-slate-600 font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            className="bg-green-500 hover:bg-green-400 text-white font-bold text-sm py-3 rounded-xl transition-colors"
          >
            Yes, done!
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleComplete}
      className="w-full bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 font-bold text-sm py-3 rounded-xl transition-colors"
    >
      Mark Event as Completed ✓
    </button>
  );
}
