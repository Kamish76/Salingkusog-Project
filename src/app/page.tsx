import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AuthButton } from "@/components/auth-button";
import { MemoryBoard } from "@/components/landing/memory-board";
import { FloatingBingoModal } from "@/components/landing/floating-bingo-modal";

export const instant = false;

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[#fcf9f5] text-[#1e1b19] flex flex-col font-body selection:bg-[#ffdcc4] selection:text-[#6f3800] relative overflow-x-hidden">
      {/* Scrapbook Warm Ambient Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#fed7aa]/35 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-20 w-[420px] h-[420px] bg-[#fecdd3]/25 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-[#bbf7d0]/20 rounded-full blur-3xl"></div>
      </div>

      {/* FLOATING WARM SCRAPBOOK HEADER */}
      <header className="sticky top-3 sm:top-4 z-40 px-3 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="bg-white/92 backdrop-blur-md px-4 sm:px-6 py-2.5 rounded-full border border-[#e8ded5] shadow-scrapbook flex items-center justify-between gap-3">
          {/* Logo & Subtitle */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-800 flex items-center justify-center border border-stone-200/80 group-hover:scale-105 transition-transform text-base shadow-xs">
              ⚡
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[#1e1b19]">
                  Salingkusog
                </span>
                <span className="text-[10px] bg-[#f5ece9] text-[#5a413d] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase">
                  Memory Well
                </span>
              </div>
              <span className="text-[11px] font-handwriting text-[#8e706c] -mt-0.5 hidden xs:inline tracking-wide">
                curated collegiate intramural moments
              </span>
            </div>
          </Link>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Day Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff8f5] border border-[#f4a261]/40 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#ff5e4d] animate-pulse"></span>
              <span className="font-display font-bold text-[11px] text-[#8e4e14] uppercase tracking-wider">
                Day 1 Live
              </span>
            </div>

            {/* Authenticated user indicator */}
            {user && (
              <span className="text-xs font-display font-semibold text-[#5a413d] hidden md:inline">
                {user.name?.split(" ")[0] ?? "Student"}
              </span>
            )}

            {/* Google Auth Button */}
            <AuthButton user={user} />
          </div>
        </div>
      </header>

      {/* MAIN CAMPUS SCRAPBOOK CANVAS */}
      <main className="relative z-10 pt-8 sm:pt-12 pb-24 max-w-6xl mx-auto px-4 sm:px-6 flex-1 w-full flex flex-col gap-8 sm:gap-10">
        {/* HERO TITLE SECTION */}
        <section className="text-center max-w-2xl mx-auto pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white border border-[#e8ded5] text-stone-600 text-xs font-medium tracking-wide shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e4d]"></span>
            <span className="font-display font-semibold text-[11px] text-[#8e4e14]">
              Intramurals 2026 • Live Photo Chute
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold text-[#1e1b19] tracking-tight leading-[1.15]">
            Toss memories into the{" "}
            <span className="font-handwriting font-normal text-[#ff5e4d] text-4xl sm:text-6xl md:text-7xl ml-1">
              infinite well
            </span>
          </h1>

          <p className="mt-3 text-[#5a413d] font-body text-sm sm:text-base max-w-lg mx-auto font-normal leading-relaxed">
            A quiet, bottomless physical memory board for Salingkusog. Snap campus selfies, cheer for your college, and unlock your 3x3 Bingo lines on the side!
          </p>

          {/* Quick Stats Pill Marquee */}
          <div className="mt-6 inline-flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-2 rounded-2xl bg-white border border-[#e8ded5] shadow-xs text-xs font-body">
            <div className="flex items-center gap-1.5 text-[#1e1b19]">
              <span className="font-display font-bold text-sm text-[#ff5e4d]">3,420+</span>
              <span className="text-[#8e706c]">Photos Snapped</span>
            </div>
            <span className="text-[#e8ded5]">•</span>
            <div className="flex items-center gap-1.5 text-[#1e1b19]">
              <span className="font-display font-bold text-sm text-[#8e4e14]">840</span>
              <span className="text-[#8e706c]">Raffle Entries</span>
            </div>
            <span className="text-[#e8ded5] hidden xs:inline">•</span>
            <div className="hidden xs:flex items-center gap-1.5 text-[#1e1b19]">
              <span className="font-display font-bold text-sm text-[#588157]">9 Colleges</span>
              <span className="text-[#8e706c]">Battling</span>
            </div>
          </div>
        </section>

        {/* POLAROID MEMORY BOARD (WHERE IMAGES LAND) */}
        <section aria-label="Campus Memory Board" className="w-full">
          <MemoryBoard />
        </section>
      </main>

      {/* FLOATING 3X3 BINGO MODAL ICON & SIDE OVERLAY */}
      <FloatingBingoModal isAuthenticated={Boolean(user)} />

      {/* GUEST FLOATING BOTTOM BAR PROMPT */}
      {!user && (
        <div className="fixed bottom-6 left-4 sm:left-8 z-30 pointer-events-auto">
          <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-full bg-white/95 border border-[#e8ded5] shadow-polaroid backdrop-blur-md">
            <span className="text-base sm:text-lg pl-2">📸</span>
            <span className="font-body text-xs text-[#5a413d] hidden sm:inline">
              Join Salingkusog to drop photos & claim raffle tickets!
            </span>
            <div className="pl-1">
              <AuthButton user={null} />
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#e8ded5] bg-[#fff8f5] py-8 px-4 text-center text-xs text-[#8e706c] font-body">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-display font-bold text-stone-700">
            Salingkusog 2026 · Collegiate Memory Board & 3x3 Bingo
          </p>
          <p className="font-handwriting text-sm text-[#b4281e]">
            made with warm paper & student spirit
          </p>
        </div>
      </footer>
    </div>
  );
}
