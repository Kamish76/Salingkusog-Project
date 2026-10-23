import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Rubik } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Salingkusog | Freedom Board & 3x3 Intramurals Bingo",
  description:
    "Snap your day. Fill your board. Join the campus challenge and claim stage raffle tickets during university intramurals.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${rubik.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-body bg-[#00161c] text-[#bfe9f7]">
        {children}
      </body>
    </html>
  );
}
