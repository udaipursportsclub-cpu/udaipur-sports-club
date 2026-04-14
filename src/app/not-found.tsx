/**
 * FILE: src/app/not-found.tsx
 * Custom 404 page — shown when any URL doesn't exist.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="min-h-screen bg-[#030712] flex flex-col items-center justify-center px-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <p className="text-6xl mb-6">🏅</p>
      <h1 className="text-3xl font-extrabold text-white mb-2">Page not found</h1>
      <p className="text-white/40 text-sm mb-8 text-center">
        This page doesn&apos;t exist — maybe the event was cancelled or the link is wrong.
      </p>
      <Link
        href="/"
        className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm px-8 py-3.5 rounded-full transition-colors"
      >
        Back to USC →
      </Link>
    </main>
  );
}
