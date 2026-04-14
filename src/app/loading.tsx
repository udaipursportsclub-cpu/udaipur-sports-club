/**
 * FILE: src/app/loading.tsx
 *
 * Global loading UI — shown while any page is loading via React Suspense.
 */

export default function GlobalLoading() {
  return (
    <div
      className="min-h-screen bg-[#030712] flex items-center justify-center"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/20">
          Loading
        </p>
      </div>
    </div>
  );
}
