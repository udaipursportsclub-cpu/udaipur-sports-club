/**
 * PAGE: Homepage ( / )
 *
 * Design goal: Minimal, clean, premium — like a high-end sports club.
 * Feels trustworthy, serious, and rich without being loud or flashy.
 *
 * Layout (top to bottom):
 *   1. Thin top navigation bar — just the club initials + "Coming Soon" pill
 *   2. Big centered hero — club name, location badge, tagline
 *   3. Three pillars strip at the bottom — Events, Community, Legacy
 *
 * Colors:
 *   - Background: warm off-white (feels premium, not harsh)
 *   - Text: deep slate (confident, readable)
 *   - Accent: amber/gold (nods to Udaipur's royal heritage)
 */

export default function Home() {
  return (
    /**
     * OUTER SHELL
     * min-h-screen  → always at least as tall as the screen
     * flex flex-col → stacks the nav, hero, and pillars top-to-bottom
     * bg-[#F9F7F4]  → warm off-white — softer and more premium than pure white
     * font-geist    → the clean modern font that came with the project
     */
    <main
      className="min-h-screen bg-[#F9F7F4] flex flex-col"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >

      {/* ── 1. TOP NAVIGATION BAR ──────────────────────────────────────────
          A thin bar across the top. Left side: club initials.
          Right side: a small "Coming Soon" pill.
          border-b = a subtle line underneath to separate it from the hero.
      ─────────────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-stone-200">

        {/* Club initials — small, uppercase, very spaced out = feels premium */}
        <span className="text-sm font-bold tracking-[0.25em] uppercase text-slate-900">
          USC
        </span>

        {/* "Coming Soon" pill — top right corner, amber color, subtle border */}
        <span className="text-xs font-semibold tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
          Coming Soon
        </span>

      </nav>


      {/* ── 2. HERO SECTION ────────────────────────────────────────────────
          The main center piece. Takes up all the remaining screen space
          between the nav and the bottom pillars (flex-1 = grow to fill).
          Everything inside is centered both horizontally and vertically.
      ─────────────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center">

        {/* Location badge — two amber dots with "Udaipur, Rajasthan" in between
            This is a design touch that anchors the club to its city. */}
        <div className="flex items-center gap-2 mb-10">
          {/* Left amber dot */}
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />

          {/* City name — tiny, uppercase, widely spaced */}
          <span className="text-xs font-semibold tracking-[0.3em] uppercase text-slate-400">
            Udaipur, Rajasthan
          </span>

          {/* Right amber dot */}
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>

        {/* MAIN HEADING — Line 1: "Udaipur" in deep slate */}
        {/* clamp(3rem, 10vw, 7.5rem) = scales with screen size automatically
            On a phone it's ~48px. On a big screen it's ~120px. */}
        <h1
          className="font-extrabold leading-none tracking-tight text-slate-900"
          style={{ fontSize: "clamp(3rem, 10vw, 7.5rem)" }}
        >
          Udaipur
        </h1>

        {/* MAIN HEADING — Line 2: "Sports Club" in amber gold
            Same size as line 1, but in the accent color — creates visual
            contrast that makes the name feel dynamic and confident. */}
        <h1
          className="font-extrabold leading-none tracking-tight text-amber-500 mb-8"
          style={{ fontSize: "clamp(3rem, 10vw, 7.5rem)" }}
        >
          Sports Club
        </h1>

        {/* Thin horizontal divider line — a quiet, elegant separator */}
        <div className="w-10 h-px bg-slate-300 mb-8" />

        {/* TAGLINE — calm, warm, descriptive
            max-w-sm = doesn't stretch too wide on large screens
            font-light = lighter weight feels more refined here */}
        <p className="text-lg md:text-xl text-slate-500 font-light max-w-sm leading-relaxed">
          A home for every sport in the City of Lakes.
        </p>

        {/* CTA buttons — Browse Events + Sign In */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-10">
          <a
            href="/events"
            className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-8 py-3.5 rounded-full transition-colors"
          >
            Browse Events →
          </a>
          <a
            href="/login"
            className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Sign in
          </a>
        </div>

      </section>


      {/* ── 3. BOTTOM PILLARS STRIP ────────────────────────────────────────
          Three short trust signals at the very bottom of the page.
          Divided into 3 equal columns with thin lines between them.
          border-t = a line separating it from the hero above.
      ─────────────────────────────────────────────────────────────────── */}
      <section className="border-t border-stone-200">
        <div className="grid grid-cols-3 divide-x divide-stone-200 max-w-2xl mx-auto w-full">

          {/* Pillar 1 — Events */}
          <div className="px-6 py-7 text-center">
            {/* Pillar title — small, bold, uppercase, widely tracked */}
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-slate-800 mb-1">
              Events
            </p>
            {/* Pillar description — very small, muted */}
            <p className="text-xs text-slate-400">
              Host &amp; join sports events
            </p>
          </div>

          {/* Pillar 2 — Community */}
          <div className="px-6 py-7 text-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-slate-800 mb-1">
              Community
            </p>
            <p className="text-xs text-slate-400">
              Connect with players &amp; clubs
            </p>
          </div>

          {/* Pillar 3 — Legacy */}
          <div className="px-6 py-7 text-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-slate-800 mb-1">
              Legacy
            </p>
            <p className="text-xs text-slate-400">
              Build Udaipur&apos;s sports culture
            </p>
          </div>

        </div>
      </section>

    </main>
  );
}
