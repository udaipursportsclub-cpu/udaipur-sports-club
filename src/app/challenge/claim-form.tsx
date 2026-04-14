/**
 * FILE: src/app/challenge/claim-form.tsx
 *
 * What this does:
 * The input form on the Host Challenge page.
 * User types in their code → hits "Claim" → the server checks
 * if it's valid → if yes, upgrades them to host instantly.
 *
 * "use client" because it has interactive form state.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Call our server action to claim the code
    const res = await fetch("/api/challenge/claim", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code: code.trim().toUpperCase() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Success!
    setSuccess(true);
    setLoading(false);

    // Wait a moment then redirect to events
    setTimeout(() => router.push("/events/new"), 2000);
  }

  // ── Success screen ───────────────────────────────────────────────
  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-extrabold text-white mb-2">
          You&apos;re a host now!
        </h2>
        <p className="text-white/40 text-sm">
          Taking you to create your first event...
        </p>
      </div>
    );
  }

  // ── Code entry form ──────────────────────────────────────────────
  return (
    <form onSubmit={handleClaim} className="space-y-4">

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-4 py-3 rounded-xl text-center">
          {error}
        </div>
      )}

      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter challenge code (e.g. USC-AB12CD)"
        required
        maxLength={20}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-center text-lg font-bold tracking-widest text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none transition uppercase"
      />

      <button
        type="submit"
        disabled={loading || code.length < 4}
        className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold disabled:opacity-50 disabled:cursor-not-allowed text-sm py-4 rounded-xl transition-colors"
      >
        {loading ? "Claiming..." : "Claim Host Status →"}
      </button>

      <p className="text-center text-xs text-white/40">
        Don&apos;t have a code? Ask Avi for one.
      </p>

    </form>
  );
}
