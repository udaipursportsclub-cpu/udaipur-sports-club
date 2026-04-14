/**
 * FILE: src/app/events/[id]/edit/page.tsx
 * Host-only page to edit their event details.
 */

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import NavLogo from "@/components/NavLogo";
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
    <main className="min-h-screen bg-[#F9F7F4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <NavLogo />
        <Link href={`/events/${params.id}`} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">← Back to Event</Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-amber-600 bg-amber-50 border border-amber-200 px-4 py-1 rounded-full mb-4">
            Edit Event
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">Update event details</h1>
        </div>
        <EditEventForm event={event} />
      </div>
    </main>
  );
}
