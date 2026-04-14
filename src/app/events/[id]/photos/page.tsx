/**
 * FILE: src/app/events/[id]/photos/page.tsx
 *
 * Event photo gallery. Anyone can view photos.
 * Hosts/admins can upload new photos.
 * Members can tap "Find me" to locate their photos using face recognition.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound }          from "next/navigation";
import Link                  from "next/link";
import PhotoGallery          from "./photo-gallery";
import PhotoUploader         from "./photo-uploader";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events").select("title").eq("id", params.id).single();
  return { title: event ? `Photos — ${event.title} | USC` : "Event Photos | USC" };
}

export default async function EventPhotosPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Fetch event
  const { data: event } = await admin
    .from("events")
    .select("id, title, sport, date, host_id, status")
    .eq("id", params.id)
    .single();

  if (!event) notFound();

  // Fetch photos
  const { data: photos } = await admin
    .from("event_photos")
    .select("id, photo_url, created_at")
    .eq("event_id", params.id)
    .order("created_at", { ascending: false });

  // Check if user is host or admin
  let canUpload = false;
  if (user) {
    const { data: profile } = await admin
      .from("profiles").select("role").eq("id", user.id).single();
    canUpload =
      profile?.role === "admin" ||
      profile?.role === "proxy" ||
      event.host_id === user.id;
  }

  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
        </Link>
        <Link href={`/events/${params.id}`} className="text-xs text-white/20 hover:text-white/70 transition-colors">
          &larr; Back to event
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-white">{event.title}</h1>
          <p className="text-sm text-white/20 mt-1">{formattedDate} &middot; Event Photos</p>
        </div>

        {/* Upload section — only for hosts/admins */}
        {canUpload && (
          <PhotoUploader eventId={params.id} />
        )}

        {/* Photo gallery */}
        <PhotoGallery
          photos={photos ?? []}
          eventId={params.id}
          userId={user?.id ?? null}
        />
      </div>
    </main>
  );
}
