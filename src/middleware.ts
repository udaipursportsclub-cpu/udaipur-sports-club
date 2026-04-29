/**
 * FILE: src/middleware.ts
 *
 * What this does:
 * This file runs automatically before EVERY page loads.
 * It refreshes the user's login session silently in the background,
 * so they stay logged in without having to sign in again every visit.
 *
 * Think of it as a security guard standing at the door of every room —
 * it checks your pass and renews it if needed, without interrupting you.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Start building the response
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create a Supabase connection that can read and write cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Refresh the cookies in both the request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          // maxAge of 30 days — keeps users logged in across browser restarts
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, maxAge: 60 * 60 * 24 * 30 })
          );
        },
      },
    }
  );

  // Silently refresh the user's session in the background
  // This keeps them logged in across page visits
  await supabase.auth.getUser();

  return supabaseResponse;
}

/**
 * Which pages should the middleware run on?
 * This pattern means: run on every page EXCEPT:
 * - Next.js internal files (_next/...)
 * - Static assets (images, fonts, icons)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
