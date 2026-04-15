"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SPORT_OPTIONS } from "@/lib/types";

export default function SportFilter({
  activeSport,
  availableSports = [],
}: {
  activeSport: string;
  availableSports?: string[];
}) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Only show "All" + sports that have active events
  const sportsToShow = availableSports.length > 0
    ? SPORT_OPTIONS.filter(s => availableSports.includes(s.label))
    : SPORT_OPTIONS;

  function selectSport(sport: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sport === "All") {
      params.delete("sport");
    } else {
      params.set("sport", sport);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  // Don't show filter if only 1 or 0 sports
  if (sportsToShow.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => selectSport("All")}
        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
          activeSport === "All"
            ? "bg-white text-black"
            : "bg-white/5 border border-white/5 text-white/40 hover:border-amber-400/30 hover:text-amber-400"
        }`}
      >
        All
      </button>
      {sportsToShow.map((s) => (
        <button
          key={s.label}
          onClick={() => selectSport(s.label)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            activeSport === s.label
              ? "bg-white text-black"
              : "bg-white/5 border border-white/5 text-white/40 hover:border-amber-400/30 hover:text-amber-400"
          }`}
        >
          <span>{s.emoji}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}
