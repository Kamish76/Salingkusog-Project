import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Karla, Caveat } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fcf9f5",
};

export const metadata: Metadata = {
  title: "Salingkusog | Collegiate Memory Board & 3x3 Intramurals Bingo",
  description:
    "Drop student memories into the infinite campus board, track your 3x3 Intramurals Bingo card, and share campus spirit.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${karla.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-[#fcf9f5] text-[#1e1b19] overflow-x-hidden w-full selection:bg-[#ffdcc4] selection:text-[#6f3800]">
        {children}
      </body>
    </html>
  );
}
