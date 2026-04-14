"use client";

/**
 * FILE: src/app/error.tsx
 *
 * Global error boundary — catches any unhandled runtime error on any page.
 * Shows a friendly USC-branded error screen instead of a blank crash.
 */

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev
    console.error("[USC Error]", error);
  }, [error]);

  return (
    <main
      className="min-h-screen bg-[#030712] flex items-center justify-center px-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-6">⚡</p>
        <h1 className="text-2xl font-black text-white mb-3">
          Something went wrong
        </h1>
        <p className="text-white/50 text-sm leading-relaxed mb-8">
          The app hit an unexpected error. Try refreshing.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm px-6 py-3 rounded-full transition-all"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-white/10 hover:border-white/20 text-white font-bold text-sm px-6 py-3 rounded-full transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
