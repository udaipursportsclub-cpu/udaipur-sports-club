import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "USC · Udaipur Sports Club",
  description: "Join weekend matches, track your stats, and earn your place on the leaderboard — Udaipur's sports club.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
