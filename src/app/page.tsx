import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AuthButton } from "@/components/auth-button";
import { EventTicker } from "@/components/landing/event-ticker";
import { BingoGridPreview } from "@/components/landing/bingo-grid-preview";
import { FreedomBoardPreview } from "@/components/landing/freedom-board-preview";
import { FloatingAuthModal } from "@/components/landing/floating-auth-modal";

export const instant = false;

export default async function HomePage() {
  const user = await getCurrentUser();
  const currentRole = user?.role ?? "guest";

  return (
    <div className="min-h-screen bg-[#00161c] text-[#bfe9f7] flex flex-col font-body selection:bg-[#e09f3e] selection:text-[#00161c] relative overflow-x-hidden">
      {/* Top Navigation */}
      <header className="border-b border-[#335c67]/40 bg-[#00161c]/85 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Event Tag */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#9e2a2b] to-[#e09f3e] p-0.5 shadow-md shadow-[#9e2a2b]/30">
                <div className="w-full h-full rounded-full bg-[#00232b] flex items-center justify-center text-base">
                  ⚡
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-base sm:text-lg text-[#fff3b0] tracking-tight group-hover:text-[#e09f3e] transition">
                  Salingkusog
                </span>
                <span className="font-display text-[9px] uppercase tracking-widest text-[#d5c4b1] font-semibold -mt-1 hidden xs:block">
                  Intramurals 2026
                </span>
              </div>
            </Link>

            <span className="text-[10px] font-display font-bold px-2.5 py-0.5 rounded-full bg-[#335c67]/30 text-[#e09f3e] border border-[#e09f3e]/30 hidden sm:inline-block">
              Campus Hub
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Role indicator for authenticated users */}
            {user && (
              <div className="hidden md:flex items-center gap-1.5 text-xs font-display">
                <span className="text-[#d5c4b1]/70">Role:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                    currentRole === "superadmin"
                      ? "bg-[#e09f3e]/20 text-[#e09f3e] border border-[#e09f3e]/50"
                      : currentRole === "admin"
                      ? "bg-[#9e2a2b]/30 text-[#ffb4ab] border border-[#9e2a2b]/50"
                      : "bg-[#0b3a44] text-[#bfe9f7] border border-[#335c67]"
                  }`}
                >
                  {currentRole}
                </span>
              </div>
            )}

            {/* Auth Button */}
            <AuthButton user={user} />
          </div>
        </div>
      </header>

      {/* Live Campus Event Ticker */}
      <EventTicker />

      {/* Main Content Showcase */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 w-full flex flex-col gap-8 sm:gap-12 relative z-10">
        {/* Dynamic Header Section */}
        {user ? (
          <section className="rounded-3xl bg-[#00232b]/80 border border-[#335c67]/50 p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#001115]/50 border border-[#e09f3e]/40 text-xs text-[#e09f3e] font-display font-semibold mb-2">
                  <span>👋</span>
                  <span>Authenticated as {user.name ?? user.email}</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#fff3b0] tracking-tight">
                  Welcome to Your Intramurals HQ
                </h1>
                <p className="text-xs sm:text-sm text-[#bfe9f7]/80 mt-1 max-w-xl">
                  Your 3x3 Bingo Card is active for Day 1 challenges. Snap selfies, fill rows or diagonals, and claim stage raffle tickets!
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3.5 py-1.5 rounded-full bg-[#9e2a2b] text-[#fff3b0] font-display font-bold text-xs shadow-md">
                  🔥 Streak Multiplier 1x
                </span>
              </div>
            </div>
          </section>
        ) : (
          <section className="text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00232b] text-[#e09f3e] border border-[#335c67]/60 text-xs font-display font-bold mb-2">
                <span>⚡</span>
                <span>University Intramurals Challenge</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#fff3b0] tracking-tight leading-tight">
                Snap your day. Fill your board.<br />
                <span className="text-[#e09f3e]">Join the Salingkusog challenge.</span>
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-[#bfe9f7]/80 mt-2 max-w-2xl leading-relaxed">
                Explore the live Freedom Board selfie stream and 3x3 challenge grid below. Sign in with Google to submit photo proofs and earn verified stage raffle tickets.
              </p>
            </div>
          </section>
        )}

        {/* Two-Column Responsive Showcase (3x3 Bingo on Left, Freedom Board on Right) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 3x3 Intramurals Bingo Simulation (Span 5) */}
          <div className="lg:col-span-5 w-full">
            <BingoGridPreview />
          </div>

          {/* Right Column: Freedom Board Live Stream (Span 7) */}
          <div className="lg:col-span-7 w-full">
            <FreedomBoardPreview />
          </div>
        </section>
      </main>

      {/* Floating Auth Modal for Unauthenticated Visitors */}
      {!user && <FloatingAuthModal />}

      {/* Footer */}
      <footer className="border-t border-[#335c67]/40 bg-[#001115] py-6 px-4 text-center text-xs text-[#d5c4b1]/60 font-display">
        <p>Salingkusog 2026 · Next.js 16 App Router · Lakebase Postgres (Neon)</p>
      </footer>
    </div>
  );
}
