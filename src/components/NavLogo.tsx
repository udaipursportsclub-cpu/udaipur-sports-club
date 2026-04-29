import Link from "next/link";

export default function NavLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
        <span className="text-white font-black text-xs">U</span>
      </div>
      <span className="text-sm font-black tracking-[0.2em] uppercase text-white hidden sm:block">USC</span>
    </Link>
  );
}
