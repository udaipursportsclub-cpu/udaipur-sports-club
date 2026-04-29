/**
 * FILE: src/lib/supabase/server.ts
 *
 * What this does:
 * This file creates a "connection" to Supabase that works on the server
 * (behind the scenes, before the page loads on the user's screen).
 * Use this for things like checking if a user is logged in before
 * showing them a protected page.
 *
 * The difference from client.ts:
 * - client.ts  → runs in the browser (user's device)
 * - server.ts  → runs on the server (our computer in the cloud)
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * createClient()
 * Call this inside server-side pages or API routes to get a
 * Supabase connection that can read the user's login session securely.
 */
export async function createClient() {
  // cookies() reads the user's browser cookies — this is how we know
  // if someone is already logged in
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read a cookie by name
        getAll() {
          return cookieStore.getAll();
        },
        // Save cookies after login/logout
        setAll(cookiesToSet) {
          try {
            // 30-day maxAge keeps users logged in across browser restarts
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, maxAge: 60 * 60 * 24 * 30 })
            );
          } catch {
            // Fine — server components can't always set cookies; middleware handles it
          }
        },
      },
    }
  );
}
