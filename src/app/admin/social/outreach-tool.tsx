"use client";

/**
 * AI Outreach Generator — writes a WhatsApp pitch to hotels, restaurants,
 * gyms, parks, etc. for USC collaboration.
 */

import { useState } from "react";

const BUSINESS_TYPES = [
  { key: "hotel",      label: "🏨 Hotel / Resort" },
  { key: "restaurant", label: "🍽️ Restaurant / Café" },
  { key: "gym",        label: "💪 Gym / Fitness Studio" },
  { key: "park",       label: "🌳 Park / Ground / Venue" },
  { key: "club",       label: "🏟️ Sports Club" },
  { key: "cafe",       label: "☕ Café / Co-working" },
  { key: "other",      label: "🤝 Other Business" },
];

export default function OutreachTool() {
  const [businessName, setBusinessName]   = useState("");
  const [businessType, setBusinessType]   = useState("hotel");
  const [language, setLanguage]           = useState("english");
  const [customNote, setCustomNote]       = useState("");
  const [message, setMessage]             = useState("");
  const [loading, setLoading]             = useState(false);
  const [copied, setCopied]               = useState(false);

  async function generate() {
    if (!businessName.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const res  = await fetch("/api/ai/outreach", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, businessType, language, customNote }),
      });
      const data = await res.json();
      setMessage(data.message ?? "");
    } catch {
      setMessage("Failed to generate — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waUrl = message
    ? `https://wa.me/?text=${encodeURIComponent(message)}`
    : "#";

  return (
    <div className="space-y-5">

      {/* Business name */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
          Business Name
        </label>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Lake View Hotel, Sukhadia Circle Café..."
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
      </div>

      {/* Business type */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
          Type of Business
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BUSINESS_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setBusinessType(t.key)}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-left transition-all border ${
                businessType === t.key
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-white border-stone-200 text-slate-500 hover:border-amber-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
          Language
        </label>
        <div className="flex gap-2">
          {[
            { key: "english",   label: "English" },
            { key: "hinglish",  label: "Hinglish (Hindi + English)" },
          ].map((l) => (
            <button
              key={l.key}
              onClick={() => setLanguage(l.key)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                language === l.key
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-stone-200 hover:border-amber-300"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom note */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
          Anything specific to mention? <span className="text-slate-300 normal-case font-normal">(optional)</span>
        </label>
        <input
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder="e.g. Their new outdoor area, past event connection..."
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
      </div>

      {/* Generate */}
      <button
        onClick={generate}
        disabled={loading || !businessName.trim()}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-bold text-sm py-3.5 rounded-2xl transition-all"
      >
        {loading ? "✨ Writing..." : "✨ Generate Message"}
      </button>

      {/* Result */}
      {message && (
        <div className="space-y-3">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{message}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copy}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-stone-200 hover:border-amber-300 text-slate-700 font-semibold text-xs py-3 rounded-xl transition-all"
            >
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bc5a] text-white font-bold text-xs py-3 rounded-xl transition-all"
            >
              💬 Open in WhatsApp
            </a>
          </div>

          <button
            onClick={generate}
            className="w-full text-xs text-slate-400 hover:text-slate-600 py-2 transition-colors"
          >
            ↻ Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
