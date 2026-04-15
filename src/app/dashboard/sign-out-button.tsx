/**
 * FILE: src/app/dashboard/sign-out-button.tsx
 *
 * What this does:
 * A small button that signs the user out.
 * When clicked, it tells Supabase to end the session,
 * then sends the user back to the homepage.
 *
 * "use client" because it responds to a click.
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut(); // End the session
    router.push("/");              // Go back to homepage
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-white/40 hover:text-red-400 transition-colors font-medium"
    >
      Sign out
    </button>
  );
}
