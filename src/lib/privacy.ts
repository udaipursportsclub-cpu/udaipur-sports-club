/**
 * FILE: src/lib/privacy.ts
 *
 * Privacy utilities for USC.
 * Never show full names publicly — only first name + last initial.
 * Full names visible only to:
 *   - The person themselves
 *   - Admins
 *   - Event hosts (for their own events)
 */

/**
 * Masks a full name for public display.
 * "Shailesh Lohar" → "Shailesh L."
 * "Avi" → "Avi"
 * null/undefined → "Anonymous"
 */
export function maskName(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) return "Anonymous";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

/**
 * Returns full name if the viewer is authorized, masked otherwise.
 * @param fullName - The person's full name
 * @param isAuthorized - true if viewer is the person themselves, an admin, or the event host
 */
export function displayName(
  fullName: string | null | undefined,
  isAuthorized: boolean = false
): string {
  if (isAuthorized) return fullName?.trim() || "Anonymous";
  return maskName(fullName);
}
