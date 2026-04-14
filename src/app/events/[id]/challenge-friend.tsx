"use client";

/**
 * FILE: src/app/events/[id]/challenge-friend.tsx
 *
 * After someone RSVPs, show them a "Challenge your friends" button.
 * This creates instant FOMO — "X joined, only Y spots left, are you in?"
 * Pure WhatsApp social pressure. Gen Z gold.
 */

import { useState } from "react";

export default function ChallengeFriend({
  eventTitle,
  spotsLeft,
  eventUrl,
  userName,
}: {
  eventTitle: string;
  sport?: string;
  spotsLeft: number;
  eventUrl: string;
  userName: string;
}) {
  const [copied, setCopied] = useState(false);

  const firstName = userName.split(" ")[0];

  const challengeText = spotsLeft <= 3
    ? `${firstName} just joined "${eventTitle}" 🔥 Only ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left — are you in?\n${eventUrl}`
    : `${firstName} just joined "${eventTitle}" 🏅 ${spotsLeft} spots still open — join now!\n${eventUrl}`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(challengeText)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[#050A18] rounded-2xl border border-amber-400/20 p-5">
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-400 mb-1">
        Challenge your friends
      </p>
      <p className="text-sm text-white/60 mb-4">
        {spotsLeft <= 3
          ? `Only ${spotsLeft} spots left — send this before it fills up`
          : `Dare your friends to join`}
      </p>
      <div className="flex gap-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bc5a] text-white font-bold text-xs py-3 rounded-xl transition-all"
        >
          💬 Send on WhatsApp
        </a>
        <button
          onClick={copyLink}
          className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all"
        >
          {copied ? "✓" : "🔗"}
        </button>
      </div>
    </div>
  );
}
