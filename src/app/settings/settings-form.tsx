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
  userId:             string;
  currentName:        string;
  currentNotifyEmail: string;
  currentPhone:       string;
  isEmailProvider:    boolean;
};

export default function SettingsForm({
  userId, currentName, currentNotifyEmail, currentPhone, isEmailProvider,
}: Props) {
  const router = useRouter();

  const [name,        setName]        = useState(currentName);
  const [notifyEmail, setNotifyEmail] = useState(currentNotifyEmail);
  const [phone,       setPhone]       = useState(currentPhone);
  const [newPassword, setNewPassword] = useState("");
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
      full_name:    name.trim(),
      notify_email: notifyEmail.trim() || null,
      phone:        phone.trim() || null,
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
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl font-semibold">
          ✓ Settings saved
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* ── Profile Info ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400">Profile</h2>

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">Display Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
            Phone <span className="normal-case text-slate-300">(optional)</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-400 transition"
          />
        </div>
      </div>

      {/* ── Notification Email ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-1">Email Notifications</h2>
        <p className="text-xs text-slate-400 mb-4">
          We&apos;ll send new event alerts here. Leave blank to use your login email.
        </p>
        <input
          type="email"
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-400 transition"
        />
      </div>

      {/* ── Change Password (email accounts only) ─────────────────── */}
      {isEmailProvider && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-1">Change Password</h2>
          <p className="text-xs text-slate-400 mb-4">Leave blank to keep your current password.</p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 6 chars)"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-400 transition"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-bold text-sm py-4 rounded-xl transition-colors"
      >
        {loading ? "Saving..." : "Save Settings →"}
      </button>

    </form>
  );
}
