import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import MobileNav from "@/components/MobileNav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Udaipur Sports Club",
  description: "A home for every sport in the City of Lakes. Udaipur's premier sports events platform.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "USC",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* pb-16 md:pb-0 adds space on mobile so content isn't hidden under the bottom nav */}
        <div className="pb-16 md:pb-0">
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
