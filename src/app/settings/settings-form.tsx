/**
 * FILE: src/app/settings/settings-form.tsx
 * Settings form — update display name, notification email, phone.
 * Email-login users can also change their password.
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter }    from "next/navigation";
import { useState }     from "react";

type Props = {
  userId:                  string;
  currentName:             string;
  currentNotifyEmail:      string;
  currentPhone:            string;
  currentShowOnLeaderboard: boolean;
  isEmailProvider:         boolean;
};

export default function SettingsForm({
  userId, currentName, currentNotifyEmail, currentPhone, currentShowOnLeaderboard, isEmailProvider,
}: Props) {
  const router = useRouter();

  const [name,              setName]              = useState(currentName);
  const [notifyEmail,       setNotifyEmail]       = useState(currentNotifyEmail);
  const [phone,             setPhone]             = useState(currentPhone);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(currentShowOnLeaderboard);
  const [newPassword,       setNewPassword]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();

    // Update profile table
    await supabase.from("profiles").update({
      full_name:            name.trim(),
      notify_email:         notifyEmail.trim() || null,
      phone:                phone.trim() || null,
      show_on_leaderboard:  showOnLeaderboard,
    }).eq("id", userId);

    // Update display name in auth metadata
    await supabase.auth.updateUser({ data: { full_name: name.trim() } });

    // Change password (email users only)
    if (isEmailProvider && newPassword.trim()) {
      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters.");
        setLoading(false);
        return;
      }
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) {
        setError("Could not update password. Try again.");
        setLoading(false);
        return;
      }
    }

    setSaved(true);
    setLoading(false);
    setNewPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">

      {/* Success banner */}
      {saved && (
        <div className="bg-green-400/10 border border-green-400/20 text-green-400 text-sm px-4 py-3 rounded-xl font-semibold">
          ✓ Settings saved
        </div>
      )}
      {error && (
        <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* ── Profile Info ───────────────────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 space-y-4">
        <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Profile</h2>

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Display Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
            Phone <span className="normal-case text-white/30">(optional)</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition"
          />
        </div>
      </div>

      {/* ── Notification Email ─────────────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
        <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-1">Email Notifications</h2>
        <p className="text-xs text-white/40 mb-4">
          We&apos;ll send new event alerts here. Leave blank to use your login email.
        </p>
        <input
          type="email"
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition"
        />
      </div>

      {/* ── Change Password (email accounts only) ─────────────────── */}
      {isEmailProvider && (
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
          <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-1">Change Password</h2>
          <p className="text-xs text-white/40 mb-4">Leave blank to keep your current password.</p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 6 chars)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition"
          />
        </div>
      )}

      {/* ── Leaderboard Visibility ──────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
        <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-1">Leaderboard</h2>
        <p className="text-xs text-white/40 mb-4">
          Allow your name and stats to appear on the public leaderboard.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={showOnLeaderboard}
            onClick={() => setShowOnLeaderboard(!showOnLeaderboard)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showOnLeaderboard ? "bg-amber-400" : "bg-white/10"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showOnLeaderboard ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-white/70 font-medium">Show me on Leaderboard</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold disabled:opacity-60 text-sm py-4 rounded-xl transition-colors"
      >
        {loading ? "Saving..." : "Save Settings →"}
      </button>

    </form>
  );
}
