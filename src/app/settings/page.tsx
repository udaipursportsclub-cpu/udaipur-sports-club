/**
 * FILE: src/app/settings/page.tsx
 * Account settings — update name, notification email, password.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Link from "next/link";
import NavLogo from "@/components/NavLogo";
import SettingsForm     from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();

  const isEmailProvider = user.app_metadata?.provider === "email";

  return (
    <main className="min-h-screen bg-[#F9F7F4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <NavLogo />
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">← Dashboard</Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full mb-4">
            Account
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">{user.email}</p>
        </div>

        <SettingsForm
          userId={user.id}
          currentName={profile?.full_name ?? ""}
          currentNotifyEmail={profile?.notify_email ?? ""}
          currentPhone={profile?.phone ?? ""}
          isEmailProvider={isEmailProvider}
        />
      </div>
    </main>
  );
}
