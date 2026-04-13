/**
 * FILE: src/app/admin/generate-code-button.tsx
 *
 * What this does:
 * A button in the Admin panel that generates a new challenge code.
 * When clicked, it calls the server, creates a new code like "USC-AB12CD",
 * and shows it on screen so Avi can copy and send it to someone.
 */

"use client";

import { useState } from "react";

export default function GenerateCodeButton() {
  const [loading, setLoading] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setNewCode(null);

    const res = await fetch("/api/admin/generate-code", { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      setNewCode(data.code);
    }
    setLoading(false);
  }

  async function handleCopy() {
    if (!newCode) return;
    await navigator.clipboard.writeText(newCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      {/* Newly generated code — shown inline with a copy button */}
      {newCode && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <code className="text-sm font-bold text-amber-700 tracking-widest">{newCode}</code>
          <button
            onClick={handleCopy}
            className="text-xs text-amber-500 hover:text-amber-700 font-semibold transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
      >
        {loading ? "Generating..." : "+ New Code"}
      </button>
    </div>
  );
}
