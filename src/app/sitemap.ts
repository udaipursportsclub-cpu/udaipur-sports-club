/**
 * FILE: src/app/sitemap.ts
 *
 * Dynamic sitemap — tells Google about all pages on USC.
 * Includes static pages + every public event page.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { MetadataRoute }     from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usc-platform-beta.vercel.app";
  const admin   = createAdminClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl,                    lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${siteUrl}/events`,        lastModified: new Date(), changeFrequency: "hourly",  priority: 0.9 },
    { url: `${siteUrl}/leaderboard`,   lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${siteUrl}/members`,       lastModified: new Date(), changeFrequency: "daily",   priority: 0.7 },
    { url: `${siteUrl}/photos`,        lastModified: new Date(), changeFrequency: "daily",   priority: 0.7 },
    { url: `${siteUrl}/login`,         lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // All public events
  const { data: events } = await admin
    .from("events")
    .select("id, date")
    .in("status", ["upcoming", "completed"])
    .order("date", { ascending: false })
    .limit(500);

  const eventPages: MetadataRoute.Sitemap = (events ?? []).map((ev) => ({
    url:              `${siteUrl}/events/${ev.id}`,
    lastModified:     new Date(ev.date),
    changeFrequency:  "weekly" as const,
    priority:         0.7,
  }));

  return [...staticPages, ...eventPages];
}
