/**
 * FILE: src/app/login/page.tsx
 *
 * What this does:
 * This is the login page — the page users see when they want to sign in.
 * It has one button: "Continue with Google".
 * When clicked, it sends the user to Google's login screen.
 * After they log in, Google sends them back to our /auth/callback route.
 *
 * Design: Same minimal, premium style as the homepage.
 */

"use client";
// ^ "use client" means this page runs in the browser (needed for button clicks)

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  // "loading" tracks whether the login is in progress
  // When true, the button shows a spinner and can't be clicked twice
  const [loading, setLoading] = useState(false);

  /**
   * handleGoogleLogin()
   * Called when the user clicks "Continue with Google".
   * It tells Supabase to start the Google login flow.
   */
  async function handleGoogleLogin() {
    setLoading(true); // Show spinner

    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // After Google login, send the user back to our callback handler
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // Note: we don't setLoading(false) here because the page will
    // redirect to Google — so we keep the spinner until they leave
  }

  return (
    // Full screen, warm off-white background
    <main
      className="min-h-screen bg-[#F9F7F4] flex items-center justify-center px-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="w-full max-w-sm">

        {/* ── TOP: Club name ───────────────────────────────────────── */}
        <div className="text-center mb-10">

          {/* Small club initials */}
          <span className="text-xs font-bold tracking-[0.25em] uppercase text-slate-400">
            USC
          </span>

          {/* Page heading */}
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3 mb-2">
            Welcome back
          </h1>

          {/* Subheading */}
          <p className="text-slate-500 text-sm">
            Sign in to Udaipur Sports Club
          </p>

        </div>

        {/* ── LOGIN CARD ───────────────────────────────────────────── */}
        {/* White card with a soft shadow */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-stone-300 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-stone-50 hover:border-stone-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              // Spinner shown while login is processing
              <>
                <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Connecting to Google...
              </>
            ) : (
              // Normal state — Google logo + text
              <>
                {/* Google's "G" logo as an SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-slate-400 font-medium">or</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Guest / browse without login — placeholder for now */}
          <button
            disabled
            className="w-full text-sm text-slate-400 py-2 rounded-xl border border-dashed border-stone-300 cursor-not-allowed"
          >
            Continue as guest (coming soon)
          </button>

        </div>

        {/* ── FOOTER NOTE ─────────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          By signing in you agree to our Terms of Service.
          <br />
          We never post anything without your permission.
        </p>

      </div>
    </main>
  );
}
