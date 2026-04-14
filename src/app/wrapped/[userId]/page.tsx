/**
 * FILE: src/app/wrapped/[userId]/page.tsx
 *
 * "USC Wrapped" — Spotify Wrapped for sports.
 * Shows a beautiful shareable card with your sports stats for the week or month.
 * URL: /wrapped/[userId]?period=week|month
 */

import { createClient } from "@/lib/supabase/server";
import { notFound }     from "next/navigation";
import { type Metadata } from "next";
import Link             from "next/link";
import NavLogo          from "@/components/NavLogo";
import PeriodToggle     from "./period-toggle";
import ShareWrapped     from "./share-wrapped";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { userId: string };
  searchParams: { period?: string };
}): Promise<Metadata> {
  const period = searchParams.period === "month" ? "month" : "week";
  return {
    title: "USC Wrapped | Udaipur Sports Club",
    description: "My sports story on Udaipur Sports Club",
    openGraph: {
      images: [`/api/og/wrapped/${params.userId}?period=${period}`],
    },
    twitter: {
      card: "summary_large_image",
      images: [`/api/og/wrapped/${params.userId}?period=${period}`],
    },
  };
}

export default async function WrappedPage({
  params,
  searchParams,
}: {
  params: { userId: string };
  searchParams: { period?: string };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", params.userId)
    .single();

  if (!profile) notFound();

  const period     = searchParams.period === "month" ? "month" : "week";
  const firstName  = (profile.full_name ?? "Your").split(" ")[0];
  const isOwn      = user?.id === params.userId;

  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usc-platform-beta.vercel.app";
  const cardUrl  = `/api/og/wrapped/${params.userId}?period=${period}`;
  const shareUrl = `${siteUrl}/wrapped/${params.userId}?period=${period}`;

  return (
    <main
      className="min-h-screen bg-[#0C1B35]"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <NavLogo />
        <Link
          href={isOwn ? "/dashboard" : "/"}
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          ← {isOwn ? "Dashboard" : "Home"}
        </Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold tracking-[0.3em] uppercase text-amber-400">
            USC Wrapped ✦
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-2">
            {isOwn ? "Your" : `${firstName}'s`} Sports Story
          </h1>
          <p className="text-white/40 text-sm mt-1">Udaipur Sports Club</p>
        </div>

        {/* ── PERIOD TOGGLE ───────────────────────────────────────── */}
        <PeriodToggle userId={params.userId} activePeriod={period} />

        {/* ── CARD ────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 mb-8 ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt={`${firstName}'s USC Wrapped`}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>

        {/* ── SHARE (only for own card) ────────────────────────────── */}
        {isOwn ? (
          <ShareWrapped
            shareUrl={shareUrl}
            cardUrl={`${siteUrl}${cardUrl}`}
            firstName={firstName}
            period={period}
          />
        ) : (
          /* Viewing someone else's wrapped — CTA to see your own */
          <div className="text-center mt-4">
            <p className="text-white/40 text-sm mb-4">
              This is {firstName}&apos;s USC Wrapped.
            </p>
            <Link
              href="/login"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-8 py-3.5 rounded-full transition-colors"
            >
              Join USC to create yours →
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
