/**
 * FILE: src/lib/types.ts
 *
 * What this does:
 * Defines the "shape" of our data — what fields an Event or RSVP has.
 * TypeScript uses these to catch mistakes before they become bugs.
 * Think of it like a form template: it tells the app exactly what
 * information to expect.
 */

/** A single sports event on the platform */
export type Event = {
  id: string;              // Unique ID for this event
  created_at: string;      // When it was created
  title: string;           // e.g. "Sunday Morning Cricket"
  sport: string;           // e.g. "Cricket"
  description: string | null; // Optional longer description
  date: string;            // e.g. "2025-05-01"
  time: string;            // e.g. "07:00:00"
  location: string;        // e.g. "Fateh Sagar Ground, Udaipur"
  capacity: number;        // Max number of players allowed
  host_id: string;         // The user ID of whoever created the event
  host_name: string;       // The host's display name
  status: "upcoming" | "completed" | "cancelled";
  rsvp_count?: number;     // How many people have signed up (optional, joined in queries)
};

/** A single RSVP — one person signing up for one event */
export type RSVP = {
  id: string;
  created_at: string;
  event_id: string;        // Which event
  user_id: string;         // Which user
  user_name: string;       // Their display name
  user_email: string;      // Their email
};

/** List of sports available when creating an event */
export const SPORT_OPTIONS = [
  { label: "Cricket",         emoji: "🏏" },
  { label: "Football",        emoji: "⚽" },
  { label: "Badminton",       emoji: "🏸" },
  { label: "Tennis",          emoji: "🎾" },
  { label: "Basketball",      emoji: "🏀" },
  { label: "Volleyball",      emoji: "🏐" },
  { label: "Table Tennis",    emoji: "🏓" },
  { label: "Swimming",        emoji: "🏊" },
  { label: "Cycling",         emoji: "🚴" },
  { label: "Running",         emoji: "🏃" },
  { label: "Kabaddi",         emoji: "🤼" },
  { label: "Chess",           emoji: "♟️" },
  { label: "Hockey",          emoji: "🏑" },
  { label: "Squash",          emoji: "🎱" },
  { label: "Other",           emoji: "🏅" },
] as const;

/** Get the emoji for a given sport name */
export function getSportEmoji(sport: string): string {
  const found = SPORT_OPTIONS.find(
    (s) => s.label.toLowerCase() === sport.toLowerCase()
  );
  return found?.emoji ?? "🏅";
}
