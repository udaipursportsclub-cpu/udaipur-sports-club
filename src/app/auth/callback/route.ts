/**
 * FILE: src/app/auth/callback/route.ts
 *
 * What this does:
 * After a user logs in with Google, Google sends them back to our website
 * at this exact address: /auth/callback
 *
 * This file receives that redirect, confirms the login with Supabase,
 * and then sends the user to the dashboard (or an error page if it fails).
 *
 * You never visit this page directly — it only runs automatically
 * as part of the Google login flow.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Read the current page's URL so we can extract the login code from it
  const { searchParams, origin } = new URL(request.url);

  // Google sends back a one-time "code" after the user logs in
  // We exchange this code for a real login session
  const code = searchParams.get("code");

  // Where to send the user after login (defaults to homepage)
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    // Exchange the one-time code for a permanent session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Login worked — send them to the dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send them to an error page
  return NextResponse.redirect(`${origin}/auth/error`);
}
