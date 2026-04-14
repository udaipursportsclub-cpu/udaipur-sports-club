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
      className="min-h-screen bg-[#F9F7F4] flex items-center justify-center px-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-6">⚡</p>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
          Something went wrong
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          The app hit an unexpected error. This has been noted.
          Try refreshing — it usually fixes itself.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-6 py-3 rounded-full transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="bg-white border border-stone-200 hover:border-amber-300 text-slate-700 font-semibold text-sm px-6 py-3 rounded-full transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
