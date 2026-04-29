/**
 * FILE: src/components/NavLogo.tsx
 * USC logo for the navigation bar — used across all pages.
 * Shows the logo image if available, falls back to SVG wordmark.
 */

import Link from "next/link";
import Image from "next/image";

export default function NavLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <Image
        src="/logo.svg"
        alt="Warehouse Rental Program"
        width={40}
        height={40}
        className="rounded-full"
        priority
      />
      <span className="text-sm font-black tracking-[0.2em] uppercase text-slate-900 hidden sm:block">
        WH-RENT
      </span>
    </Link>
  );
}
