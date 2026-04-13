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

  if (!user) {
    // Not logged in — send to login page
    redirect("/login");
  }

  const userName = user.user_metadata?.full_name ?? "Host";

  return (
    <main
      className="min-h-screen bg-[#F9F7F4]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── TOP NAVIGATION ────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <Link
          href="/"
          className="text-sm font-bold tracking-[0.25em] uppercase text-slate-900 hover:text-amber-500 transition-colors"
        >
          USC
        </Link>
        <Link
          href="/events"
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          ← Back to Events
        </Link>
      </nav>

      {/* ── FORM CONTAINER ────────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-6 py-14">

        {/* Page heading */}
        <div className="mb-10">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-amber-600 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full mb-4">
            New Event
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
            Create a sports event
          </h1>
          <p className="text-slate-500 text-sm">
            Hosting as{" "}
            <span className="font-semibold text-slate-700">{userName}</span>
          </p>
        </div>

        {/* The actual form (client component) */}
        <CreateEventForm userId={user.id} userName={userName} />

      </div>
    </main>
  );
}
