/**
 * FILE: src/app/components/PhonePrompt.tsx
 *
 * A modal overlay that asks the user for their phone number
 * if they haven't added one yet. Dark-themed to match the platform.
 * Drop this into the dashboard page and pass the user's current phone;
 * if phone is null/empty the modal appears.
 */

"use client";

import { useState } from "react";

export default function PhonePrompt({ currentPhone }: { currentPhone?: string | null }) {
  const [phone, setPhone]     = useState("");
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);

  // Don't show the modal if the user already has a phone number
  if (currentPhone || done) return null;

  async function handleSave() {
    setError("");
    const cleaned = phone.replace(/\s+/g, "").replace(/^\+91/, "");

    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }

    setSaving(true);
    try {
      const res  = await fetch("/api/settings/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setDone(true);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    /* Full-screen dark overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      {/* Modal card */}
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#030712] p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-1">Add your phone number</h2>
        <p className="text-sm text-slate-400 mb-6">
          We need your number so event hosts can reach you. This is a one-time thing.
        </p>

        {/* Phone input */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-slate-400 text-sm font-medium select-none">+91</span>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 text-sm"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-xs mb-3">{error}</p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || phone.length < 10}
          className="mt-4 w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Phone Number"}
        </button>
      </div>
    </div>
  );
}
