/**
 * FILE: src/app/login/page.tsx
 *
 * Supports two login methods:
 *   1. Email + Password (for owner/internal accounts like owner@usc.com)
 *   2. Continue with Google (for regular members)
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter }    from "next/navigation";
import { useState }     from "react";

export default function LoginPage() {
  const router  = useRouter();
  const [tab,      setTab]      = useState<"email" | "google">("email");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password: password,
    });

    if (signInError) {
      setError("Wrong email or password. Try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options:  { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main
      className="min-h-screen bg-[#F9F7F4] flex items-center justify-center px-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="w-full max-w-sm">

        {/* Back to home */}
        <a href="/" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-8">
          ← Back to home
        </a>

        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-xs font-bold tracking-[0.25em] uppercase text-slate-400">USC</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3 mb-2">Welcome back</h1>
          <p className="text-slate-500 text-sm">Sign in to Udaipur Sports Club</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-stone-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setTab("email"); setError(null); }}
            className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all ${
              tab === "email"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Email & Password
          </button>
          <button
            onClick={() => { setTab("google"); setError(null); }}
            className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all ${
              tab === "google"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Google
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">

          {/* ── EMAIL / PASSWORD TAB ──────────────────────────────── */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="owner@usc.com"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm py-3.5 rounded-xl transition-colors"
              >
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </form>
          )}

          {/* ── GOOGLE TAB ───────────────────────────────────────── */}
          {tab === "google" && (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-stone-300 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-stone-50 hover:border-stone-400 transition-all disabled:opacity-60 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
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
          )}

        </div>

        <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          By signing in you agree to our Terms of Service.
        </p>

      </div>
    </main>
  );
}
