/**
 * FILE: src/app/events/[id]/edit/page.tsx
 * Host-only page to edit their event details.
 */

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import EditEventForm from "./edit-event-form";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase.from("events").select("*").eq("id", params.id).single();
  if (!event) notFound();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const canEdit = event.host_id === user.id || profile?.role === "admin";
  if (!canEdit) redirect(`/events/${params.id}`);

  if (event.status === "completed" || event.status === "cancelled") {
    redirect(`/events/${params.id}`);
  }

  return (
    <main className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <Link href={`/events/${params.id}`} className="text-sm text-white/40 hover:text-white transition-colors">← Back to Event</Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-1 rounded-full mb-4">
            Edit Event
          </span>
          <h1 className="text-2xl font-extrabold text-white">Update event details</h1>
        </div>
        <EditEventForm event={event} />
      </div>
    </main>
  );
}
