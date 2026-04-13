/**
 * FILE: src/app/admin/revoke-host-button.tsx
 *
 * What this does:
 * A button Avi can use to remove someone's host status.
 * After clicking, that person becomes a regular member again.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  profileId: string;
  name: string;
};

export default function RevokeHostButton({ profileId, name }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    // Ask for confirmation before revoking
    if (!confirm(`Remove host status from ${name}?`)) return;

    setLoading(true);

    await fetch("/api/admin/revoke-host", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ profileId }),
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={loading}
      className="text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
    >
      {loading ? "..." : "Revoke"}
    </button>
  );
}
