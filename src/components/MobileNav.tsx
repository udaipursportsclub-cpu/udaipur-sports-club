"use client";

/**
 * FILE: src/components/MobileNav.tsx
 *
 * Sticky bottom navigation bar — visible only on mobile.
 * Gives quick access to the most important pages.
 * Hidden on md+ screens (desktop has the top nav).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",            label: "Home",       icon: "🏠" },
  { href: "/units",       label: "Units",      icon: "📦" },
  { href: "/rentals",     label: "Rentals",    icon: "🔑" },
  { href: "/contracts",   label: "Contracts",  icon: "📜" },
  { href: "/dashboard",   label: "Me",         icon: "👤" },
];

export default function MobileNav() {
  const pathname = usePathname();

  // Hide on admin/auth/api pages
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login")
  ) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#030712] border-t border-white/5 safe-bottom">
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
                isActive ? "text-amber-400" : "text-white/50 hover:text-white/50"
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
              )}
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`text-[10px] font-bold tracking-wide ${
                isActive ? "text-amber-400" : "text-white/50"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
