/**
 * FILE: src/app/events/sport-filter.tsx
 *
 * What this does:
 * The sport filter tabs on the events page.
 * Clicking a sport filters the list to only show that sport.
 * "All" shows everything.
 *
 * "use client" because it reads/writes the URL search params interactively.
 */

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SPORT_OPTIONS } from "@/lib/types";

const ALL_SPORTS = [
  { label: "All",  emoji: "🏅" },
  ...SPORT_OPTIONS,
] as const;

export default function SportFilter({ activeSport }: { activeSport: string }) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  function selectSport(sport: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sport === "All") {
      params.delete("sport");
    } else {
      params.set("sport", sport);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {ALL_SPORTS.map((s) => {
        const isActive = activeSport === s.label || (s.label === "All" && activeSport === "All");
        return (
          <button
            key={s.label}
            onClick={() => selectSport(s.label)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-stone-200 text-slate-500 hover:border-amber-300 hover:text-amber-600"
            }`}
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
