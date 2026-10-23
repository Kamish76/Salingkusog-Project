import type { Metadata } from "next";
import { Bricolage_Grotesque, Karla, Caveat } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Salingkusog | Collegiate Memory Board & 3x3 Intramurals Bingo",
  description:
    "Drop student memories into the infinite campus board, track your 3x3 Intramurals Bingo card, and claim verified stage raffle entries.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${karla.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-[#fcf9f5] text-[#1e1b19]">
        {children}
      </body>
    </html>
  );
}
