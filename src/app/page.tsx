export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-[17px] font-semibold tracking-tight">USC</span>
          <nav className="hidden items-center gap-8 text-[15px] text-muted sm:flex">
            <a href="#play" className="transition-colors hover:text-content">
              Play
            </a>
            <a href="#community" className="transition-colors hover:text-content">
              Community
            </a>
          </nav>
          <a
            href="#join"
            className="rounded-full bg-accent px-5 py-2 text-[15px] font-medium text-accent-on transition-opacity hover:opacity-90"
          >
            Join the club
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pb-24 pt-20 sm:pb-32 sm:pt-28">
        <svg
          aria-hidden="true"
          viewBox="0 0 800 800"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 text-accent opacity-[0.06]"
        >
          <circle cx="400" cy="400" r="120" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="400" cy="400" r="220" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="400" cy="400" r="320" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="400" cy="400" r="400" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight sm:text-[64px]">
            Where Udaipur plays, together.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted sm:text-[19px]">
            Join weekend matches, track your stats, and earn your place on the
            leaderboard — all in one club built for Udaipur&apos;s players.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              id="join"
              href="#"
              className="w-full rounded-full bg-accent px-7 py-3.5 text-[17px] font-medium text-accent-on transition-opacity hover:opacity-90 sm:w-auto"
            >
              Join the club
            </a>
            <a
              href="#play"
              className="w-full rounded-full border border-border px-7 py-3.5 text-[17px] font-medium text-content transition-colors hover:bg-surface-raised sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      <section id="play" className="border-t border-border px-6 py-20 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-3 sm:gap-8">
          <Feature
            emoji="🏏"
            title="Play"
            description="Weekend matches across cricket, football, and badminton — pick a sport, grab a spot."
          />
          <Feature
            emoji="🏆"
            title="Compete"
            description="Live scoreboards, leaderboards, and badges that track every match you play."
          />
          <Feature
            emoji="🤝"
            title="Belong"
            description="A real community of local players, not just another booking app."
          />
        </div>
      </section>

      <section
        id="community"
        className="border-t border-border bg-surface-raised px-6 py-20 text-center sm:py-28"
      >
        <h2 className="text-[28px] font-semibold tracking-tight sm:text-[36px]">
          Ready to get on the field?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[17px] text-muted">
          It takes less than a minute to join.
        </p>
        <a
          href="#"
          className="mt-8 inline-block rounded-full bg-accent px-7 py-3.5 text-[17px] font-medium text-accent-on transition-opacity hover:opacity-90"
        >
          Join the club
        </a>
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-[13px] text-muted sm:flex-row">
          <span>USC · Udaipur Sports Club</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center sm:text-left">
      <div aria-hidden="true" className="text-[28px]">
        {emoji}
      </div>
      <h3 className="mt-3 text-[19px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{description}</p>
    </div>
  );
}
