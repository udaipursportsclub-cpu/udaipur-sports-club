/**
 * FILE: src/app/events/[id]/share-played-card.tsx
 *
 * What this does:
 * The "Share my card" panel for attendees after an event is completed.
 * Generates and shows a Strava-style "I PLAYED" card they can share.
 *
 * Shows after the host marks the event as "completed".
 */

"use client";

import { useState } from "react";

type Props = {
  eventId:    string;
  userName:   string;
  eventTitle: string;
  sport:      string;
  siteUrl:    string;
};

export default function SharePlayedCard({ eventId, userName, eventTitle, sport, siteUrl }: Props) {
  const [open, setOpen]       = useState(false);
  const [copied, setCopied]   = useState(false);

  const cardUrl   = `${siteUrl}/api/og/event/${eventId}/played?name=${encodeURIComponent(userName)}`;
  const shareText = `I played ${sport} with Udaipur Sports Club! 🏅`;
  const shareUrl  = `${siteUrl}/events/${eventId}`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ title: eventTitle, text: shareText, url: shareUrl });
    }
  }

  async function downloadCard() {
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = `usc-played-${eventId}.png`;
    a.click();
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-sm py-4 rounded-xl transition-all"
      >
        Share My Card →
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card preview */}
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardUrl}
                alt="Your played card"
                className="w-full aspect-[1200/630] object-cover"
              />
              <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                ✓ I Played
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 space-y-3">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 text-center">
                Share your achievement
              </p>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm py-3.5 rounded-xl transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share on WhatsApp
              </a>

              {/* Native share / copy */}
              <div className="grid grid-cols-2 gap-2">
                {"share" in navigator ? (
                  <button
                    onClick={nativeShare}
                    className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs py-3 rounded-xl transition-colors"
                  >
                    Share
                  </button>
                ) : (
                  <button
                    onClick={copyLink}
                    className="flex items-center justify-center bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs py-3 rounded-xl transition-colors"
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                )}
                <button
                  onClick={downloadCard}
                  className="flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 font-semibold text-xs py-3 rounded-xl transition-colors"
                >
                  Download PNG
                </button>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-full text-slate-400 text-xs py-2 hover:text-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
