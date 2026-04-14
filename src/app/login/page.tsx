"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter }    from "next/navigation";
import { useState }     from "react";

export default function LoginPage() {
  const router  = useRouter();
  const [tab,      setTab]      = useState<"email" | "google">("google");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) { setError("Wrong email or password."); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center px-6" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <a href="/" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-8">
          &larr; Back to home
        </a>

        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-sm">U</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Join the Club</h1>
          <p className="text-white/30 text-sm">Udaipur Sports Club</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setTab("google"); setError(null); }}
            className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all ${
              tab === "google" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
            }`}
          >
            Google
          </button>
          <button
            onClick={() => { setTab("email"); setError(null); }}
            className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all ${
              tab === "email" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
            }`}
          >
            Email &amp; Password
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">

          {tab === "google" && (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 hover:bg-amber-400 hover:text-black transition-all disabled:opacity-60"
            >
              {loading ? "Connecting..." : (
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

          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{error}</div>
              )}
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/20 mb-2">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/20 mb-2">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-sm py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition">
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[10px] text-white/15 mt-6">By signing in you agree to our Terms of Service.</p>
      </div>
    </main>
  );
}
