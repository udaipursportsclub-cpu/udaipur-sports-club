import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse }      from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin.from("hero_slides").select("*").order("display_order", { ascending: true });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { image_url } = await request.json();
  if (!image_url) return NextResponse.json({ error: "image_url required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin.from("hero_slides").select("display_order").order("display_order", { ascending: false }).limit(1);
  const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

  const { data, error } = await admin.from("hero_slides").insert({ image_url, display_order: nextOrder }).select().single();
  if (error) return NextResponse.json({ error: "Failed to add slide" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await request.json();
  const admin = createAdminClient();
  await admin.from("hero_slides").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
