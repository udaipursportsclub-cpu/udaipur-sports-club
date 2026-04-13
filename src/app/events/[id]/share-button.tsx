/**
 * FILE: src/app/events/[id]/share-button.tsx
 *
 * What this does:
 * The "Share Event" button and the share panel it opens.
 *
 * When clicked, it shows a beautiful share panel with:
 * - A preview of the event card (the image that will be shared)
 * - "Share via..." button (uses your phone's native share sheet — works on
 *   Android and iPhone, lets you pick WhatsApp, Instagram, etc.)
 * - "WhatsApp" direct button
 * - "Copy Link" button
 * - "Download Card" button (saves the card image to your phone/computer)
 */

"use client";

import { useState } from "react";

type Props = {
  eventId:   string;
  eventTitle: string;
  eventUrl:  string;  // Full URL of the event page
};

export default function ShareButton({ eventId, eventTitle, eventUrl }: Props) {
  // Controls whether the share panel is open or closed
  const [open, setOpen] = useState(false);

  // Tracks whether the link was just copied (to show "Copied!" feedback)
  const [copied, setCopied] = useState(false);

  // The URL of the generated card image
  const cardImageUrl = `${window.location.origin}/api/og/event/${eventId}`;

  // ── Share via native phone share sheet (best on mobile) ──────────
  async function handleNativeShare() {
    if (navigator.share) {
      await navigator.share({
        title: eventTitle,
        text:  `Join me at: ${eventTitle}`,
        url:   eventUrl,
      });
    } else {
      // Fallback for desktop — just copy the link
      handleCopyLink();
    }
  }

  // ── Copy link to clipboard ───────────────────────────────────────
  async function handleCopyLink() {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500); // Reset after 2.5s
  }

  // ── Share directly to WhatsApp ───────────────────────────────────
  function handleWhatsApp() {
    const text = encodeURIComponent(`🏅 Join us!\n\n*${eventTitle}*\n\n${eventUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  // ── Download the card image ──────────────────────────────────────
  async function handleDownload() {
    // Fetch the image and trigger a download
    const res = await fetch(cardImageUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usc-event-${eventId}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* ── SHARE BUTTON ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-amber-400 hover:text-amber-600 text-slate-600 font-bold text-sm py-3.5 rounded-xl transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share Event
      </button>

      {/* ── SHARE PANEL (modal overlay) ───────────────────────────── */}
      {open && (
        // Dark overlay — clicking it closes the panel
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* The panel itself — clicking inside doesn't close it */}
          <div
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Panel header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-extrabold text-slate-900">
                Share Event
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-slate-400 hover:bg-stone-200 transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* ── Card preview ────────────────────────────────────── */}
            {/* Shows what the share card looks like */}
            <div className="rounded-2xl overflow-hidden mb-6 border border-stone-100 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardImageUrl}
                alt="Event share card"
                className="w-full"
                style={{ aspectRatio: "1200/630" }}
              />
            </div>

            {/* ── Share options ────────────────────────────────────── */}
            <div className="space-y-3">

              {/* Native share (best on phones) */}
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-5 py-3.5 rounded-xl transition-colors"
              >
                <span className="text-lg">📤</span>
                Share via...
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                className="w-full flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm px-5 py-3.5 rounded-xl transition-colors"
              >
                <span className="text-lg">💬</span>
                Share on WhatsApp
              </button>

              {/* Two buttons side by side — Copy Link + Download Card */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 border border-stone-200 hover:border-slate-400 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-colors"
                >
                  <span>{copied ? "✓" : "🔗"}</span>
                  {copied ? "Copied!" : "Copy Link"}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 border border-stone-200 hover:border-slate-400 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-colors"
                >
                  <span>⬇️</span>
                  Download
                </button>
              </div>

            </div>

            {/* Tip for Instagram */}
            <p className="text-center text-xs text-slate-300 mt-5">
              Download the card and post it as an Instagram story
            </p>

          </div>
        </div>
      )}
    </>
  );
}
