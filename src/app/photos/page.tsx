/**
 * FILE: src/app/photos/page.tsx
 *
 * "My Photos" page — shows all event photos where the logged-in
 * user's face has been matched. Also has a "Find me" scanner
 * that searches across ALL event photos.
 */

import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect }          from "next/navigation";
import Link                  from "next/link";
import NavLogo               from "@/components/NavLogo";
import MyPhotosGallery       from "./my-photos-gallery";

export const metadata = { title: "My Photos | Udaipur Sports Club" };

export default async function MyPhotosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Get all photos this user has been matched in
  const { data: faces } = await admin
    .from("photo_faces")
    .select("photo_id")
    .eq("matched_user_id", user.id);

  const photoIds = Array.from(new Set((faces ?? []).map((f) => f.photo_id)));

  let matchedPhotos: { id: string; photo_url: string; event_id: string; created_at: string }[] = [];

  if (photoIds.length > 0) {
    const { data } = await admin
      .from("event_photos")
      .select("id, photo_url, event_id, created_at")
      .in("id", photoIds)
      .order("created_at", { ascending: false });
    matchedPhotos = data ?? [];
  }

  // Get recent events that have photos (for "scan more events")
  const { data: recentEvents } = await admin
    .from("event_photos")
    .select("event_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const uniqueEventIds = Array.from(new Set((recentEvents ?? []).map((r) => r.event_id)));

  let eventsWithPhotos: { id: string; title: string; date: string }[] = [];
  if (uniqueEventIds.length > 0) {
    const { data } = await admin
      .from("events")
      .select("id, title, date")
      .in("id", uniqueEventIds)
      .order("date", { ascending: false });
    eventsWithPhotos = data ?? [];
  }

  return (
    <main className="min-h-screen bg-[#F9F7F4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <NavLogo />
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
          &larr; Dashboard
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My Photos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Every event photo you appear in — found using face recognition.
          </p>
        </div>

        <MyPhotosGallery
          matchedPhotos={matchedPhotos}
          eventsWithPhotos={eventsWithPhotos}
          userId={user.id}
        />
      </div>
    </main>
  );
}
