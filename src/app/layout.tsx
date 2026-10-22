import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Udaipur Sports Club",
  description: "Udaipur Sports Club",
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
