/**
 * FILE: src/lib/xp.ts
 *
 * XP & Level system for USC.
 * Every game earns XP. As you level up, your rank changes.
 * Shown on profiles, leaderboards, and shareable cards.
 *
 * XP sources:
 *   - RSVP to event: +50 XP
 *   - Complete a game: +100 XP
 *   - Host an event: +150 XP
 *   - First game of the week: +50 XP bonus
 */

export const XP_PER_GAME     = 100;
export const XP_PER_HOST     = 150;
export const XP_PER_RSVP     = 50;

export type PlayerLevel = {
  name:     string;
  minXP:    number;
  color:    string;    // Tailwind text color
  bg:       string;    // Tailwind bg color
  glow:     string;    // Tailwind shadow color for glow effects
  emoji:    string;
  tier:     number;    // 1-7 for sorting
};

export const LEVELS: PlayerLevel[] = [
  { name: "Rookie",     minXP: 0,     color: "text-slate-400",  bg: "bg-slate-500",  glow: "shadow-slate-500/20", emoji: "🌱", tier: 1 },
  { name: "Rising",     minXP: 300,   color: "text-blue-400",   bg: "bg-blue-500",   glow: "shadow-blue-500/20",  emoji: "⬆️", tier: 2 },
  { name: "Warrior",    minXP: 800,   color: "text-green-400",  bg: "bg-green-500",  glow: "shadow-green-500/20", emoji: "⚔️", tier: 3 },
  { name: "Ace",        minXP: 1500,  color: "text-amber-400",  bg: "bg-amber-500",  glow: "shadow-amber-500/20", emoji: "🌟", tier: 4 },
  { name: "Pro",        minXP: 3000,  color: "text-purple-400", bg: "bg-purple-500",  glow: "shadow-purple-500/20", emoji: "💎", tier: 5 },
  { name: "Elite",      minXP: 5000,  color: "text-red-400",    bg: "bg-red-500",    glow: "shadow-red-500/20",   emoji: "🔥", tier: 6 },
  { name: "Legend",     minXP: 10000, color: "text-yellow-300", bg: "bg-yellow-400",  glow: "shadow-yellow-400/30", emoji: "👑", tier: 7 },
];

export function getPlayerLevel(xp: number): PlayerLevel {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getXP(gamesPlayed: number, gamesHosted: number = 0): number {
  return (gamesPlayed * XP_PER_GAME) + (gamesHosted * XP_PER_HOST);
}

export function getNextLevel(xp: number): { level: PlayerLevel; xpNeeded: number; progress: number } | null {
  const current = getPlayerLevel(xp);
  const nextIdx = LEVELS.findIndex(l => l.name === current.name) + 1;
  if (nextIdx >= LEVELS.length) return null; // Already max level

  const next = LEVELS[nextIdx];
  const xpNeeded = next.minXP - xp;
  const range = next.minXP - current.minXP;
  const progress = Math.min(((xp - current.minXP) / range) * 100, 100);

  return { level: next, xpNeeded, progress };
}
