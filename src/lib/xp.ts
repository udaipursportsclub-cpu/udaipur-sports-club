/**
 * FILE: src/lib/xp.ts
 *
 * Smart XP & Level system for USC.
 *
 * Per-sport XP:
 *   Each sport tracks its own XP = games_played * 100
 *
 * Global XP uses a smarter formula:
 *   1. Diminishing returns — top sport's XP gets diminished after a threshold
 *      so grinding one sport alone won't dominate the leaderboard.
 *   2. Diversity bonus — playing more sports earns a multiplier (up to 1.5x).
 *   3. Frequency adjustment — rare sports (squash, swimming, etc.) give a
 *      slight per-game bonus so they're not undervalued.
 *   4. Attendance bonus — high attendance rate earns bonus XP.
 *   5. Hosting bonus — hosting events earns extra XP on top.
 *
 * Levels: Rookie → Rising → Warrior → Ace → Pro → Elite → Legend
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const BASE_XP_PER_GAME = 100;
export const XP_PER_HOST      = 150;

/**
 * Diminishing returns kicks in after this much XP in a single sport.
 * Below the threshold, XP counts 1:1 toward global.
 * Above, extra XP is compressed via sqrt.
 */
const DIMINISH_THRESHOLD = 500;

/**
 * Multiplier applied to the sqrt portion above the threshold.
 * sqrt(500) ≈ 22, so 1000 XP sport → 500 + 15 * sqrt(500) ≈ 835 adjusted.
 */
const DIMINISH_MULTIPLIER = 15;

/**
 * Some sports are played less often. Give them a slight XP bump per game
 * so rare-sport players aren't punished for fewer opportunities.
 * Any sport not listed defaults to 1.0.
 */
const SPORT_RARITY: Record<string, number> = {
  squash:     1.3,
  swimming:   1.25,
  tennis:     1.2,
  volleyball: 1.15,
  basketball: 1.15,
  football:   1.1,
  badminton:  1.1,
  cricket:    1.0,
};

function getRarityMultiplier(sport: string): number {
  return SPORT_RARITY[sport.toLowerCase()] ?? 1.0;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type PlayerLevel = {
  name:  string;
  minXP: number;
  color: string;   // Tailwind text color
  bg:    string;    // Tailwind bg color
  glow:  string;    // Tailwind shadow color for glow effects
  emoji: string;
  tier:  number;    // 1-7 for sorting
};

// ── Levels ───────────────────────────────────────────────────────────────────

export const LEVELS: PlayerLevel[] = [
  { name: "Rookie",  minXP: 0,     color: "text-slate-400",  bg: "bg-slate-500",  glow: "shadow-slate-500/20",  emoji: "🌱", tier: 1 },
  { name: "Rising",  minXP: 300,   color: "text-blue-400",   bg: "bg-blue-500",   glow: "shadow-blue-500/20",   emoji: "⬆️", tier: 2 },
  { name: "Warrior", minXP: 1000,  color: "text-green-400",  bg: "bg-green-500",  glow: "shadow-green-500/20",  emoji: "⚔️", tier: 3 },
  { name: "Ace",     minXP: 2500,  color: "text-amber-400",  bg: "bg-amber-500",  glow: "shadow-amber-500/20",  emoji: "🌟", tier: 4 },
  { name: "Pro",     minXP: 5000,  color: "text-purple-400", bg: "bg-purple-500",  glow: "shadow-purple-500/20", emoji: "💎", tier: 5 },
  { name: "Elite",   minXP: 9000,  color: "text-red-400",    bg: "bg-red-500",    glow: "shadow-red-500/20",    emoji: "🔥", tier: 6 },
  { name: "Legend",  minXP: 15000, color: "text-yellow-300", bg: "bg-yellow-400",  glow: "shadow-yellow-400/30", emoji: "👑", tier: 7 },
];

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Raw XP for a single sport. Just games * base XP.
 * This is what shows on per-sport leaderboards.
 */
export function getSportXP(gamesInSport: number): number {
  return Math.max(0, Math.floor(gamesInSport)) * BASE_XP_PER_GAME;
}

/**
 * Diversity bonus multiplier based on how many different sports someone plays.
 * 1 sport  → 1.0x (no bonus)
 * 2 sports → 1.17x
 * 3 sports → 1.33x
 * 4 sports → 1.5x (cap)
 * 5+ sports → 1.5x (cap)
 */
export function getDiversityBonus(sportsCount: number): number {
  const count = Math.max(1, Math.floor(sportsCount));
  // Formula: count / 3, but minimum 1.0 and maximum 1.5
  return Math.min(1.5, Math.max(1.0, count / 3));
}

/**
 * Apply diminishing returns to a single sport's XP.
 * Below threshold: counts fully.
 * Above threshold: extra XP is compressed via sqrt.
 */
function applyDiminishingReturns(sportXP: number): number {
  if (sportXP <= DIMINISH_THRESHOLD) return sportXP;
  const base = DIMINISH_THRESHOLD;
  const excess = sportXP - DIMINISH_THRESHOLD;
  return base + DIMINISH_MULTIPLIER * Math.sqrt(excess);
}

/**
 * The smart global XP formula.
 *
 * @param sportXPs        — Record of sport name → raw XP in that sport
 *                           e.g. { cricket: 1000, badminton: 300, squash: 200 }
 * @param gamesHosted     — total events hosted (across all sports)
 * @param attendanceRate  — 0 to 1, fraction of RSVPs actually attended
 *                           (1.0 = perfect attendance, 0 = never shows up)
 *
 * Steps:
 *   1. For each sport, apply rarity multiplier to raw XP
 *   2. Sort sports by adjusted XP (highest first)
 *   3. Apply diminishing returns to the TOP sport only
 *      (2nd, 3rd, etc. count fully — this rewards diversity)
 *   4. Sum all adjusted XPs
 *   5. Multiply by diversity bonus
 *   6. Add hosting bonus
 *   7. Apply attendance modifier
 */
export function getGlobalXP(
  sportXPs: Record<string, number>,
  gamesHosted: number = 0,
  attendanceRate: number = 1,
): number {
  const entries = Object.entries(sportXPs)
    .filter(([, xp]) => xp > 0)
    .map(([sport, xp]) => ({
      sport,
      rawXP: xp,
      adjustedXP: xp * getRarityMultiplier(sport),
    }))
    .sort((a, b) => b.adjustedXP - a.adjustedXP);

  if (entries.length === 0) {
    // No sport XP — only hosting bonus if any
    return Math.round(gamesHosted * XP_PER_HOST * clampAttendance(attendanceRate));
  }

  // Apply diminishing returns to the top sport only
  let totalAdjusted = 0;
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) {
      // Top sport gets diminished
      totalAdjusted += applyDiminishingReturns(entries[i].adjustedXP);
    } else {
      // Other sports count fully (encourages diversity)
      totalAdjusted += entries[i].adjustedXP;
    }
  }

  // Diversity multiplier
  const diversity = getDiversityBonus(entries.length);
  totalAdjusted *= diversity;

  // Hosting bonus
  const hostBonus = Math.max(0, Math.floor(gamesHosted)) * XP_PER_HOST;
  totalAdjusted += hostBonus;

  // Attendance modifier: perfect attendance = 1.0x, low attendance penalizes
  // 100% attendance → 1.1x bonus
  // 75% attendance  → 1.0x (neutral)
  // 50% attendance  → 0.9x
  // 0% attendance   → 0.7x
  const rate = clampAttendance(attendanceRate);
  const attendanceModifier = 0.7 + (rate * 0.4); // 0% → 0.7, 100% → 1.1

  totalAdjusted *= attendanceModifier;

  return Math.round(totalAdjusted);
}

function clampAttendance(rate: number): number {
  return Math.min(1, Math.max(0, rate));
}

// ── Level Functions ──────────────────────────────────────────────────────────

/**
 * Get the player's current level from their global XP.
 */
export function getPlayerLevel(globalXP: number): PlayerLevel {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (globalXP >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

/**
 * Progress toward next level. Returns null if already Legend.
 */
export function getNextLevel(globalXP: number): {
  level: PlayerLevel;
  xpNeeded: number;
  progress: number;
} | null {
  const current = getPlayerLevel(globalXP);
  const nextIdx = LEVELS.findIndex((l) => l.name === current.name) + 1;
  if (nextIdx >= LEVELS.length) return null;

  const next = LEVELS[nextIdx];
  const xpNeeded = next.minXP - globalXP;
  const range = next.minXP - current.minXP;
  const progress = Math.min(((globalXP - current.minXP) / range) * 100, 100);

  return { level: next, xpNeeded, progress };
}

// ── Backward-compat helper ───────────────────────────────────────────────────

/**
 * Simple XP helper for places that only have total games + hosted count.
 * Uses a single "generic" sport bucket. For the full smart formula,
 * use getGlobalXP() with per-sport breakdowns instead.
 */
export function getXP(gamesPlayed: number, gamesHosted: number = 0): number {
  return getGlobalXP(
    { generic: getSportXP(gamesPlayed) },
    gamesHosted,
    1, // assume full attendance when we don't have the data
  );
}
