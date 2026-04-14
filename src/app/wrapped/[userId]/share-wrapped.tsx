"use client";

import { useState } from "react";

export default function ShareWrapped({
  shareUrl,
  cardUrl,
  firstName,
  period,
}: {
  shareUrl: string;
  cardUrl: string;
  firstName: string;
  period: string;
}) {
  const [copied, setCopied] = useState(false);

  const periodLabel = period === "month" ? "this month" : "this week";

  const whatsappText = encodeURIComponent(
    `Check out my USC Wrapped ${periodLabel}! 🏅\n${shareUrl}`
  );

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({
        title: `${firstName}'s USC Wrapped`,
        text: `My sports story ${periodLabel} on Udaipur Sports Club 🏅`,
        url: shareUrl,
      });
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-white/40 tracking-widest uppercase mb-4">
        Share your story
      </p>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bc5a] text-white font-bold text-sm py-3.5 rounded-2xl transition-all"
      >
        <span>💬</span> Share on WhatsApp
      </a>

      {/* Copy link */}
      <button
        onClick={copyLink}
        className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm py-3.5 rounded-2xl transition-all"
      >
        <span>{copied ? "✓" : "🔗"}</span>
        {copied ? "Copied!" : "Copy Link"}
      </button>

      {/* Native share (shows on mobile) */}
      {typeof window !== "undefined" && typeof navigator?.share === "function" && (
        <button
          onClick={nativeShare}
          className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm py-3.5 rounded-2xl transition-all"
        >
          <span>📤</span> Share via...
        </button>
      )}

      {/* Download hint */}
      <a
        href={cardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 font-medium text-xs py-3 rounded-2xl transition-all"
      >
        <span>⬇️</span> Save card image
      </a>
    </div>
  );
}
