import type { FC } from "react";

export const EventTicker: FC = () => {
  return (
    <div className="w-full bg-[#001f26]/90 border-y border-[#335c67]/40 backdrop-blur-md py-2.5 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs">
        {/* Event Status Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e09f3e] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e09f3e]"></span>
          </span>
          <span className="font-display font-bold text-[#e09f3e] uppercase tracking-wider text-[11px] sm:text-xs">
            Intramurals 2026 Live
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#9e2a2b] text-[#fff3b0] font-bold text-[10px] tracking-wide uppercase">
            Day 1: Opening
          </span>
        </div>

        {/* Live Metrics Ticker */}
        <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar font-display">
          <div className="flex items-center gap-1.5 flex-shrink-0 text-[#bfe9f7]/90">
            <span className="text-[#e09f3e] font-bold text-sm">3,420+</span>
            <span className="text-[11px] text-[#d5c4b1]">Selfies Snapped</span>
          </div>

          <span className="text-[#335c67] hidden xs:inline">•</span>

          <div className="flex items-center gap-1.5 flex-shrink-0 text-[#bfe9f7]/90">
            <span className="text-[#fff3b0] font-bold text-sm">840</span>
            <span className="text-[11px] text-[#d5c4b1]">Raffle Tickets</span>
          </div>

          <span className="text-[#335c67] hidden md:inline">•</span>

          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 text-[#bfe9f7]/90">
            <span className="text-[#e09f3e] font-bold text-sm">9</span>
            <span className="text-[11px] text-[#d5c4b1]">Colleges Active</span>
          </div>

          <span className="text-[#335c67] hidden lg:inline">•</span>

          <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0 text-[#bfe9f7]/90">
            <span className="px-2 py-0.5 rounded-full bg-[#335c67]/40 text-[#fff3b0] text-[10px] font-semibold border border-[#e09f3e]/30">
              ⚡ 3x Streak Multiplier Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
