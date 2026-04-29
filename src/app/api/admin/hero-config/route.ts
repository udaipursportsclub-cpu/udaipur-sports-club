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

export async function PUT(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { rotation_seconds } = await request.json();
  if (!rotation_seconds || rotation_seconds < 1) return NextResponse.json({ error: "Invalid rotation_seconds" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("hero_config").upsert({ id: 1, rotation_seconds: Number(rotation_seconds) });
  return NextResponse.json({ ok: true });
}
