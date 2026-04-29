"use client";

import { useEffect, useState } from "react";

type Slide = { id: string; image_url: string };

type Props = {
  slides: Slide[];
  rotationSeconds: number;
  children: React.ReactNode;
};

export default function HeroSlideshow({ slides, rotationSeconds, children }: Props) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent(i => (i + 1) % slides.length);
    }, rotationSeconds * 1000);
    return () => clearInterval(interval);
  }, [slides.length, rotationSeconds]);

  return (
    <section className="relative overflow-hidden min-h-[520px] md:min-h-[600px] flex flex-col justify-end">
      {/* Background slides */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${slide.image_url})`,
            opacity: i === current ? 1 : 0,
          }}
        />
      ))}

      {/* Overlay — dark gradient so text stays readable */}
      {slides.length > 0 && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-amber-400 w-5" : "bg-white/30"}`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full">{children}</div>
    </section>
  );
}
