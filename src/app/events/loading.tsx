export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-[#030712]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      {/* Nav skeleton */}
      <div className="h-[73px] bg-[#030712]/80 border-b border-white/5" />

      <div className="max-w-5xl mx-auto px-6 pt-12 pb-6">
        <div className="h-6 w-48 bg-white/5 rounded-full animate-pulse mb-5" />
        <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse mb-5" />
        <div className="h-12 bg-white/5 rounded-xl animate-pulse mb-5" />
        <div className="flex gap-2 mb-4">
          <div className="h-9 w-24 bg-white/5 rounded-full animate-pulse" />
          <div className="h-9 w-28 bg-white/5 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Event cards skeleton */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-white/5 rounded-full" />
                <div className="h-4 w-20 bg-white/5 rounded" />
              </div>
              <div className="h-6 w-full bg-white/5 rounded mb-3" />
              <div className="h-4 w-3/4 bg-white/5 rounded mb-2" />
              <div className="h-4 w-1/2 bg-white/5 rounded mb-2" />
              <div className="h-4 w-2/3 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
