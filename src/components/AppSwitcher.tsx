"use client";

/**
 * FILE: src/components/AppSwitcher.tsx
 *
 * App switcher dropdown — grid icon that shows all of Avi's apps.
 * Only rendered for logged-in users.
 * Opens a dropdown with colored icons for each app.
 */

import { useState, useRef, useEffect } from "react";

interface AppConfig {
  name: string;
  url: string;
  color: string;
  icon: string;
  current: boolean;
}

const AUTO_LOGIN_KEY = process.env.NEXT_PUBLIC_APP_AUTO_LOGIN_KEY ?? "";

const APPS: AppConfig[] = [
  {
    name: "Advocate Hub",
    url: `${process.env.NEXT_PUBLIC_ADVOCATE_HUB_URL}/auth/auto-login?key=${AUTO_LOGIN_KEY}&redirect=/diary`,
    color: "from-blue-400 to-blue-600",
    icon: "\u2696\uFE0F", // scales of justice
    current: false,
  },
  {
    name: "Udaipur Sports Club",
    url: `https://udaipur-sports-club.vercel.app/auth/auto-login?key=${AUTO_LOGIN_KEY}&redirect=/`,
    color: "from-amber-400 to-orange-500",
    icon: "\u{1F3C5}", // sports medal
    current: false,
  },
  {
    name: "Metro ERP",
    url: `${process.env.NEXT_PUBLIC_METRO_ERP_URL}/auth/auto-login?key=${AUTO_LOGIN_KEY}&redirect=/dashboard`,
    color: "from-emerald-400 to-emerald-600",
    icon: "\u{1F4E6}", // package
    current: false,
  },
  {
    name: "Warehouse Hub",
    url: "#",
    color: "from-purple-400 to-purple-600",
    icon: "\u{1F3ED}", // factory
    current: true,
  },
];

export default function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Grid icon button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Switch app"
      >
        {/* LayoutGrid icon — 4 squares */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/50 hover:text-white transition-colors"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a0f1a] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-white/5">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
              Switch App
            </p>
          </div>
          <div className="py-1">
            {APPS.map((app) => (
              <a
                key={app.name}
                href={app.current ? undefined : app.url}
                onClick={(e) => {
                  if (app.current) {
                    e.preventDefault();
                    setOpen(false);
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                  app.current
                    ? "bg-white/[0.05] cursor-default"
                    : "hover:bg-white/[0.05] cursor-pointer"
                }`}
              >
                {/* Colored icon circle */}
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center text-sm flex-shrink-0`}
                  aria-hidden="true"
                >
                  {app.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {app.name}
                  </p>
                  {app.current && (
                    <p className="text-[10px] text-amber-400 font-bold">
                      Current
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
