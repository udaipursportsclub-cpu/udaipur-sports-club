/**
 * FILE: src/lib/achievements.ts
 *
 * What this does:
 * The badge/achievement system for USC.
 * Badges are computed from a player's history — no extra database table needed.
 * Players earn badges automatically as they do things on the platform.
 *
 * These show on profiles and make the app feel alive and rewarding.
 * Gen Z loves collecting these — they'll keep playing to unlock more.
 */

export type Achievement = {
  id:          string;
  emoji:       string;
  name:        string;
  description: string;
  unlocked:    boolean;
};

type PlayerStats = {
  totalPlayed:  number;
  totalHosted:  number;
  sportsPlayed: string[];   // list of sports (with repeats)
  sportsHosted: string[];   // sports they've hosted
};

export function computeAchievements(stats: PlayerStats): Achievement[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { totalPlayed, totalHosted, sportsPlayed, sportsHosted: _sh } = stats;

  // Unique sports played
  const uniqueSports    = new Set(sportsPlayed).size;

  // Most played single sport
  const sportCounts: Record<string, number> = {};
  for (const s of sportsPlayed) sportCounts[s] = (sportCounts[s] ?? 0) + 1;
  const maxSingleSport = Math.max(0, ...Object.values(sportCounts));

  return [
    {
      id:          "first_touch",
      emoji:       "🏃",
      name:        "First Touch",
      description: "Played your first USC event",
      unlocked:    totalPlayed >= 1,
    },
    {
      id:          "hat_trick",
      emoji:       "🎯",
      name:        "Hat Trick",
      description: "Played 3 events",
      unlocked:    totalPlayed >= 3,
    },
    {
      id:          "on_fire",
      emoji:       "🔥",
      name:        "On Fire",
      description: "Played 5 events in one sport",
      unlocked:    maxSingleSport >= 5,
    },
    {
      id:          "all_rounder",
      emoji:       "🌟",
      name:        "All-Rounder",
      description: "Played 3 different sports",
      unlocked:    uniqueSports >= 3,
    },
    {
      id:          "decade",
      emoji:       "🏆",
      name:        "Decade Club",
      description: "10 games played",
      unlocked:    totalPlayed >= 10,
    },
    {
      id:          "regular",
      emoji:       "💪",
      name:        "Regular",
      description: "25 games played — you live here",
      unlocked:    totalPlayed >= 25,
    },
    {
      id:          "legend",
      emoji:       "👑",
      name:        "Legend",
      description: "50 games played — the GOAT",
      unlocked:    totalPlayed >= 50,
    },
    {
      id:          "multi_sport",
      emoji:       "🌍",
      name:        "Multi-Sport Athlete",
      description: "Played 5 different sports",
      unlocked:    uniqueSports >= 5,
    },
    {
      id:          "event_maker",
      emoji:       "⚡",
      name:        "Event Maker",
      description: "Hosted your first event",
      unlocked:    totalHosted >= 1,
    },
    {
      id:          "game_changer",
      emoji:       "🎪",
      name:        "Game Changer",
      description: "Hosted 5 events",
      unlocked:    totalHosted >= 5,
    },
    {
      id:          "captain",
      emoji:       "🚀",
      name:        "Captain",
      description: "Hosted 10 events",
      unlocked:    totalHosted >= 10,
    },
  ];
}

/** Returns only unlocked achievements, sorted — use this for profiles */
export function getUnlockedAchievements(stats: PlayerStats): Achievement[] {
  return computeAchievements(stats).filter((a) => a.unlocked);
}

/** How many achievements does this player have? */
export function achievementCount(stats: PlayerStats): number {
  return computeAchievements(stats).filter((a) => a.unlocked).length;
}
