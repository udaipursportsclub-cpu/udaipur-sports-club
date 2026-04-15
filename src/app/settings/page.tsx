/**
 * FILE: src/app/settings/page.tsx
 * Account settings — update name, notification email, password.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Link from "next/link";
import SettingsForm     from "./settings-form";
import SignOutButton    from "@/app/dashboard/sign-out-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();

  const isEmailProvider = user.app_metadata?.provider === "email";

  return (
    <main className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-white/40 hover:text-white transition-colors">← Dashboard</Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-1 rounded-full mb-4">
            Account
          </span>
          <h1 className="text-2xl font-extrabold text-white">Settings</h1>
          <p className="text-white/40 text-sm mt-1">{user.email}</p>
        </div>

        <SettingsForm
          userId={user.id}
          currentName={profile?.full_name ?? ""}
          currentNotifyEmail={profile?.notify_email ?? user.email ?? ""}
          currentPhone={profile?.phone ?? ""}
          currentShowOnLeaderboard={profile?.show_on_leaderboard === true}
          isEmailProvider={isEmailProvider}
          loginEmail={user.email ?? ""}
        />

        {/* Sign out */}
        <div className="mt-10 pt-8 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Sign Out</p>
              <p className="text-xs text-white/40 mt-0.5">End your session on this device</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
