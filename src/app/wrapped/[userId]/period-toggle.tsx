"use client";

import { useRouter } from "next/navigation";

export default function PeriodToggle({
  userId,
  activePeriod,
}: {
  userId: string;
  activePeriod: string;
}) {
  const router = useRouter();

  return (
    <div className="flex justify-center gap-2 mb-6">
      {[
        { key: "week",  label: "This Week" },
        { key: "month", label: "This Month" },
      ].map((p) => (
        <button
          key={p.key}
          onClick={() => router.push(`/wrapped/${userId}?period=${p.key}`)}
          className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all ${
            activePeriod === p.key
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
              : "bg-white/10 text-white/60 hover:bg-white/20"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
