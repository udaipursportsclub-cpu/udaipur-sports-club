/**
 * FILE: src/app/admin/setup/page.tsx
 *
 * One-time Supabase database setup guide.
 * Shows Avi the exact SQL to run in Supabase to set up all tables,
 * columns, and the storage bucket.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Link             from "next/link";
import NavLogo          from "@/components/NavLogo";

const SQL_SETUP = `-- ─────────────────────────────────────────────────
-- Run this SQL in Supabase: Dashboard → SQL Editor
-- ─────────────────────────────────────────────────

-- 1. Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  full_name     text,
  role          text not null default 'member', -- member | host | proxy | admin
  notify_email  text,                           -- for event notifications
  phone         text,
  created_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Events table
create table if not exists public.events (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  title       text not null,
  sport       text not null,
  description text,
  date        date not null,
  time        time not null,
  location    text not null,
  capacity    int not null,
  host_id     uuid references public.profiles(id) on delete cascade,
  host_name   text not null,
  total_cost  numeric default 0,
  upi_id      text,
  status      text not null default 'upcoming' -- upcoming | completed | cancelled
);

-- 3. RSVPs table
create table if not exists public.rsvps (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  event_id        uuid references public.events(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  user_name       text not null,
  user_email      text not null,
  payment_status  text default 'free', -- free | pending | paid
  unique(event_id, user_id)
);

-- 4. Waitlist table
create table if not exists public.waitlist (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  event_id    uuid references public.events(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  user_name   text not null,
  user_email  text not null,
  position    int not null,
  unique(event_id, user_id)
);

-- 5. Challenge codes table (for becoming a host)
create table if not exists public.challenge_codes (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  code        text unique not null,
  is_active   boolean default true,
  claimed_by  uuid references public.profiles(id)
);

-- ── Enable Row Level Security ──────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.events           enable row level security;
alter table public.rsvps            enable row level security;
alter table public.waitlist         enable row level security;
alter table public.challenge_codes  enable row level security;

-- Profiles: anyone can read, only owner can update their own
create policy "Public profiles" on public.profiles for select using (true);
create policy "Own profile update" on public.profiles for update using (auth.uid() = id);

-- Events: anyone can read, authenticated can insert
create policy "Public events" on public.events for select using (true);
create policy "Auth insert events" on public.events for insert with check (auth.uid() = host_id);
create policy "Host update events" on public.events for update using (auth.uid() = host_id);

-- RSVPs: authenticated users can manage their own
create policy "Public rsvps" on public.rsvps for select using (true);
create policy "Auth insert rsvps" on public.rsvps for insert with check (auth.uid() = user_id);
create policy "Auth delete rsvps" on public.rsvps for delete using (auth.uid() = user_id);

-- Waitlist: same as RSVPs
create policy "Public waitlist" on public.waitlist for select using (true);
create policy "Auth insert waitlist" on public.waitlist for insert with check (auth.uid() = user_id);
create policy "Auth delete waitlist" on public.waitlist for delete using (auth.uid() = user_id);

-- Challenge codes: only admins can see all (via service role)
create policy "Public claim check" on public.challenge_codes for select using (true);

-- 6. Event photos table (Cloudflare R2 storage)
create table if not exists public.event_photos (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  event_id    uuid references public.events(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  r2_key      text not null,
  photo_url   text not null,
  width       int,
  height      int
);

-- 7. Face descriptors table (for "Find my photos")
create table if not exists public.photo_faces (
  id          uuid default gen_random_uuid() primary key,
  photo_id    uuid references public.event_photos(id) on delete cascade,
  descriptor  jsonb not null,
  box         jsonb,
  matched_user_id uuid references public.profiles(id) on delete set null
);

alter table public.event_photos  enable row level security;
alter table public.photo_faces   enable row level security;

create policy "Public photos" on public.event_photos for select using (true);
create policy "Auth insert photos" on public.event_photos for insert with check (auth.uid() = uploaded_by);
create policy "Owner delete photos" on public.event_photos for delete using (auth.uid() = uploaded_by);

create policy "Public faces" on public.photo_faces for select using (true);
create policy "Service insert faces" on public.photo_faces for insert with check (true);`;

const STORAGE_SETUP = `-- In Supabase Dashboard → Storage → New Bucket:
-- Name: social-media
-- Public: YES (toggle on)
-- File size limit: 50MB
-- Allowed MIME types: image/*, video/mp4, video/quicktime`;

const ENV_VARS = [
  { key: "NEXT_PUBLIC_SUPABASE_URL",      desc: "Supabase project URL",                   where: "Supabase → Settings → API" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", desc: "Supabase anon/public key",               where: "Supabase → Settings → API" },
  { key: "SUPABASE_SERVICE_ROLE_KEY",     desc: "Supabase service role (secret!)",        where: "Supabase → Settings → API" },
  { key: "NEXT_PUBLIC_SITE_URL",          desc: "Your deployed site URL",                 where: "e.g. https://usc.vercel.app" },
  { key: "GROQ_API_KEY",                  desc: "AI captions + memes + descriptions",     where: "console.groq.com (free)" },
  { key: "RESEND_API_KEY",                desc: "Email notifications",                    where: "resend.com (free)" },
  { key: "CRON_SECRET",                   desc: "Secures cron-job.org calls",             where: "Make up any random string" },
  { key: "INSTAGRAM_ACCESS_TOKEN",        desc: "Instagram auto-posting",                 where: "Meta for Developers" },
  { key: "INSTAGRAM_ACCOUNT_ID",          desc: "Instagram business account ID",          where: "Meta for Developers" },
  { key: "TWITTER_API_KEY",               desc: "X/Twitter posting",                      where: "developer.twitter.com" },
  { key: "TWITTER_API_SECRET",            desc: "X/Twitter posting",                      where: "developer.twitter.com" },
  { key: "TWITTER_ACCESS_TOKEN",          desc: "X/Twitter posting",                      where: "developer.twitter.com" },
  { key: "TWITTER_ACCESS_SECRET",         desc: "X/Twitter posting",                      where: "developer.twitter.com" },
  { key: "YOUTUBE_ACCESS_TOKEN",          desc: "YouTube community posts",                where: "Google Cloud Console" },
  { key: "YOUTUBE_CHANNEL_ID",            desc: "Your YouTube channel ID",                where: "YouTube Studio → Settings" },
  { key: "IMGBB_API_KEY",                desc: "Photo storage (free, unlimited)",        where: "imgbb.com/api (free)" },
];

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/admin");

  return (
    <main className="min-h-screen bg-[#F9F7F4]" style={{ fontFamily: "var(--font-geist-sans)" }}>

      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-stone-200">
        <NavLogo />
        <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
          ← Admin
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Platform Setup Guide</h1>
          <p className="text-slate-500 text-sm">One-time setup — run the SQL, create the bucket, add the env vars.</p>
        </div>

        {/* Step 1: SQL */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <h2 className="font-extrabold text-slate-900">Run the Database SQL</h2>
                <p className="text-xs text-slate-400 mt-0.5">Supabase → SQL Editor → paste this → Run</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <pre className="bg-[#0C1B35] text-green-400 text-xs p-5 rounded-xl overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {SQL_SETUP}
            </pre>
          </div>
        </div>

        {/* Step 2: Storage */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div>
                <h2 className="font-extrabold text-slate-900">Create Storage Bucket</h2>
                <p className="text-xs text-slate-400 mt-0.5">For uploading photos + videos in the social post tool</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <pre className="bg-[#0C1B35] text-green-400 text-xs p-5 rounded-xl overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {STORAGE_SETUP}
            </pre>
          </div>
        </div>

        {/* Step 3: Env vars */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div>
                <h2 className="font-extrabold text-slate-900">Add Environment Variables</h2>
                <p className="text-xs text-slate-400 mt-0.5">Vercel → Project → Settings → Environment Variables</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-stone-100">
            {ENV_VARS.map((v) => (
              <div key={v.key} className="flex items-start gap-4 px-6 py-4">
                <code className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg flex-shrink-0 mt-0.5">
                  {v.key}
                </code>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">{v.desc}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{v.where}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 4: Cron */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
            <div>
              <h2 className="font-extrabold text-slate-900">Set Up cron-job.org</h2>
              <p className="text-xs text-slate-400 mt-0.5">For weekly + daily auto-posts — free forever</p>
            </div>
          </div>
          <Link href="/admin/social" className="text-sm font-semibold text-amber-600 hover:text-amber-500">
            → Go to Social & AI Hub for full cron-job.org instructions
          </Link>
        </div>

      </div>
    </main>
  );
}
