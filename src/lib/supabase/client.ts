/**
 * FILE: src/lib/supabase/client.ts
 *
 * What this does:
 * This file creates a "connection" to Supabase that works inside the browser
 * (on the user's device). Use this in any page or component where users
 * interact with buttons, forms, or anything visible on screen.
 *
 * Think of it like a phone line — this file opens the line so the rest
 * of the app can make calls to the database.
 */

import { createBrowserClient } from "@supabase/ssr";

/**
 * createClient()
 * Call this function anywhere in the app to get a connection to Supabase.
 * It reads the URL and key from your .env.local file automatically.
 */
export function createClient() {
  return createBrowserClient(
    // The address of your Supabase project
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // The public key that proves this app is allowed to talk to Supabase
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
