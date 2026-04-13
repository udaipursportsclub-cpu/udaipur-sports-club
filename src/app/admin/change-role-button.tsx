/**
 * FILE: src/app/admin/change-role-button.tsx
 *
 * What this does:
 * A dropdown in the Admin panel that lets Avi change anyone's role
 * with a single click — no SQL needed, no coming to me.
 *
 * Roles explained:
 *   member  → regular user, can only RSVP
 *   host    → can create and manage events
 *   proxy   → trusted co-owner, can create events + manage platform (future)
 *   admin   → full access including admin panel (Avi + Bhavyansh only)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "member" | "host" | "proxy" | "admin";

type Props = {
  profileId: string;
  currentRole: Role;
  name: string;
};

const ROLE_LABELS: Record<Role, string> = {
  member: "Member",
  host:   "Host",
  proxy:  "Proxy Owner",
  admin:  "Admin",
};

const ROLE_COLORS: Record<Role, string> = {
  member: "text-slate-500",
  host:   "text-amber-600",
  proxy:  "text-blue-600",
  admin:  "text-red-500",
};

export default function ChangeRoleButton({ profileId, currentRole, name }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as Role;
    if (newRole === currentRole) return;

    if (!confirm(`Change ${name}'s role to "${ROLE_LABELS[newRole]}"?`)) return;

    setLoading(true);

    await fetch("/api/admin/change-role", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ profileId, role: newRole }),
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <select
      value={currentRole}
      onChange={handleChange}
      disabled={loading}
      className={`text-xs font-semibold border border-stone-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50 ${ROLE_COLORS[currentRole]}`}
    >
      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
      ))}
    </select>
  );
}
