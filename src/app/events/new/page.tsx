/**
 * FILE: src/app/events/new/page.tsx
 *
 * What this does:
 * This is the "Create Event" page — the page a logged-in user sees
 * when they want to organise a new sports event.
 *
 * It first checks if the user is logged in.
 * If they're not, it sends them to the login page.
 * If they are, it shows the event creation form.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateEventForm from "./create-event-form";

export default async function NewEventPage() {
  const supabase = await createClient();

  // Check login — only logged-in users can create events
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if user is a host or admin — only they can create events
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isHost = profile?.role === "host" || profile?.role === "admin";

  // Not a host — send them to the challenge page to earn host status
  if (!isHost) redirect("/challenge");

  const userName = user.user_metadata?.full_name ?? "Host";

  return (
    <main
      className="min-h-screen bg-[#030712]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── TOP NAVIGATION ────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <Link
          href="/events"
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          ← Back to Events
        </Link>
      </nav>

      {/* ── FORM CONTAINER ────────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-6 py-14">

        {/* Page heading */}
        <div className="mb-10">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-1 rounded-full mb-4">
            New Event
          </span>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Create a sports event
          </h1>
          <p className="text-white/40 text-sm">
            Hosting as{" "}
            <span className="font-semibold text-white/70">{userName}</span>
          </p>
        </div>

        {/* The actual form (client component) */}
        <CreateEventForm userId={user.id} userName={userName} />

      </div>
    </main>
  );
}
