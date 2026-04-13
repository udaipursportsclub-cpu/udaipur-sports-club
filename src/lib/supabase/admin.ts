/**
 * FILE: src/lib/supabase/admin.ts
 *
 * What this does:
 * Creates a special Supabase connection that bypasses all security rules.
 * Only used for admin tasks (like setting someone's role) that normal users
 * are not allowed to do.
 *
 * IMPORTANT: This must ONLY be used in server-side code (API routes, server
 * components). Never expose this in the browser — it has full database access.
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Secret key — bypasses RLS
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
