import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect }          from "next/navigation";
import Link                  from "next/link";
import HeroAdminClient       from "./hero-admin-client";

export default async function HeroAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/admin");

  const admin = createAdminClient();
  const { data: slides } = await admin.from("hero_slides").select("*").order("display_order", { ascending: true });
  const { data: config } = await admin.from("hero_config").select("*").eq("id", 1).single();

  return (
    <main className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">← Admin</span>
        </Link>
        <span className="text-xs font-bold tracking-widest uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
          Hero Banner
        </span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <HeroAdminClient
          initialSlides={slides ?? []}
          initialRotation={config?.rotation_seconds ?? 5}
        />
      </div>
    </main>
  );
}
