/**
 * FILE: src/app/auth/error/page.tsx
 *
 * What this does:
 * If something goes wrong during login (e.g. the user cancelled,
 * or there was a network issue), they land here.
 * It shows a friendly message and a button to try again.
 */

import Link from "next/link";

export default function AuthErrorPage() {
  return (
    // Full screen, same warm off-white background as the homepage
    <main
      className="min-h-screen bg-[#F9F7F4] flex items-center justify-center px-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="text-center max-w-sm">

        {/* Error icon — a simple red circle with an X */}
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-red-500 text-2xl font-bold">✕</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Login failed
        </h1>

        {/* Friendly explanation */}
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Something went wrong during sign-in. This sometimes happens if you
          cancelled, or if the link expired. Please try again.
        </p>

        {/* Button to go back to login */}
        <Link
          href="/login"
          className="inline-block bg-slate-900 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-slate-700 transition-colors"
        >
          Try again
        </Link>

      </div>
    </main>
  );
}
