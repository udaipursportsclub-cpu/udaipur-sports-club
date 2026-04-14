/**
 * FILE: src/app/tournaments/new/page.tsx
 *
 * Create Tournament page — only hosts/admins can access.
 * Shows the tournament creation form.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Link             from "next/link";
import CreateTournamentForm from "./create-tournament-form";

export default async function NewTournamentPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const isHost = profile?.role === "host" || profile?.role === "admin" || profile?.role === "proxy";
  if (!isHost) redirect("/tournaments");

  const userName = user.user_metadata?.full_name ?? "Host";

  return (
    <main className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <Link href="/tournaments" className="text-sm text-white/40 hover:text-white transition-colors">
          ← Back to Tournaments
        </Link>
      </nav>

      {/* Form */}
      <div className="max-w-xl mx-auto px-6 py-14">
        <div className="mb-10">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-1 rounded-full mb-4">
            New Tournament
          </span>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Create a tournament
          </h1>
          <p className="text-white/40 text-sm">
            Hosting as <span className="font-semibold text-white/70">{userName}</span>
          </p>
        </div>

        <CreateTournamentForm />
      </div>
    </main>
  );
}
