"use client";

import { useState } from "react";

interface BingoTileMock {
  id: number;
  label: string;
  category: string;
  status: "completed_vanilla" | "completed_yellow" | "center_free" | "pending" | "locked";
  icon: string;
}

const INITIAL_TILES: BingoTileMock[] = [
  { id: 0, label: "Morning Parade", category: "Opening", status: "completed_vanilla", icon: "🎉" },
  { id: 1, label: "College Cheer", category: "Spirit", status: "pending", icon: "📣" },
  { id: 2, label: "Food Booth Run", category: "Social", status: "completed_yellow", icon: "🍢" },
  { id: 3, label: "5k Sunrise Run", category: "Sports", status: "completed_vanilla", icon: "🏃" },
  { id: 4, label: "Free Mascot Snap", category: "Special", status: "center_free", icon: "⭐" },
  { id: 5, label: "Friendship Selfie", category: "Social", status: "completed_yellow", icon: "🤝" },
  { id: 6, label: "Courtside Action", category: "Sports", status: "pending", icon: "🏀" },
  { id: 7, label: "Banner & Chants", category: "Spirit", status: "completed_yellow", icon: "🎨" },
  { id: 8, label: "Night Fireworks", category: "Finale", status: "locked", icon: "🔒" },
];

interface BingoGridPreviewProps {
  onInteract?: () => void;
}

export function BingoGridPreview({ onInteract }: BingoGridPreviewProps) {
  const [activeHint, setActiveHint] = useState<string | null>(null);

  const handleTileClick = (tile: BingoTileMock) => {
    if (tile.status === "locked") {
      setActiveHint("🔒 Locked until Day 3! Sign in to view full schedule.");
    } else if (tile.status === "center_free") {
      setActiveHint("⭐ Center Free Snap unlocked automatically for all registered students!");
    } else if (tile.status.startsWith("completed")) {
      setActiveHint(`✅ Verified Selfie Snap recorded for "${tile.label}"!`);
    } else {
      setActiveHint(`📸 Tapped "${tile.label}". Sign in with Google to snap your selfie!`);
    }

    if (onInteract) {
      onInteract();
    }
  };

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#335c67] via-[#21414a] to-[#9e2a2b] text-[#fff3b0] p-6 sm:p-8 lg:p-10 shadow-2xl border border-[#335c67]/60">
      {/* Ambient decorative glowing halos */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#e09f3e]/20 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#9e2a2b]/35 blur-3xl pointer-events-none"></div>

      {/* Header Row */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#001115]/40 backdrop-blur-md text-[#fff3b0] border border-[#fff3b0]/20 text-xs">
          <span className="text-[#e09f3e] font-bold">⚡</span>
          <span className="font-display tracking-wider uppercase font-semibold text-[11px]">
            Daily 3x3 Sprint • Day 1
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#001115]/30 border border-[#e09f3e]/30 text-xs text-[#e09f3e] font-display font-bold">
          <span>★</span>
          <span>4.9 Streak</span>
        </div>
      </div>

      {/* Interactive 3x3 Grid Simulation */}
      <div className="relative z-10 my-4 sm:my-6 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-sm bg-[#001115]/30 backdrop-blur-md p-3.5 sm:p-4.5 rounded-3xl shadow-2xl border border-[#fff3b0]/15">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {INITIAL_TILES.map((tile) => {
              const isCenter = tile.status === "center_free";
              const isVanilla = tile.status === "completed_vanilla";
              const isYellow = tile.status === "completed_yellow";
              const isLocked = tile.status === "locked";

              return (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile)}
                  type="button"
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-center p-2 transition-all duration-200 transform cursor-pointer select-none active:scale-95 ${
                    isCenter
                      ? "bg-[#9e2a2b] text-[#fff3b0] border-2 border-[#e09f3e] shadow-lg animate-pulse"
                      : isVanilla
                      ? "bg-[#fff3b0] text-[#00232b] shadow-md hover:scale-105 font-bold"
                      : isYellow
                      ? "bg-[#e09f3e] text-[#452b00] shadow-md hover:scale-105 font-bold"
                      : isLocked
                      ? "bg-[#00232b]/80 border border-[#335c67]/50 text-[#d5c4b1]/50"
                      : "bg-[#00232b]/60 border border-[#fff3b0]/15 text-[#fff3b0] hover:bg-[#00232b] hover:scale-105"
                  }`}
                >
                  <span className="text-xl sm:text-2xl mb-1">{tile.icon}</span>
                  <span
                    className={`font-display text-[10px] sm:text-[11px] font-bold leading-tight truncate w-full ${
                      isVanilla
                        ? "text-[#00232b]"
                        : isYellow
                        ? "text-[#372400]"
                        : isCenter
                        ? "text-[#fff3b0] uppercase tracking-wider text-[9px]"
                        : "text-[#fff3b0]/90"
                    }`}
                  >
                    {tile.label}
                  </span>
                  {(isVanilla || isYellow) && (
                    <span className="text-[9px] font-sans font-bold text-[#9e2a2b] uppercase tracking-wider mt-0.5">
                      ✓ Done
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Floating Pill Badges Over the Grid */}
          <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-[#9e2a2b] text-[#fff3b0] shadow-lg flex items-center gap-1 transform rotate-3 border border-[#e09f3e]/50 text-[11px] font-bold">
            <span>🔥</span>
            <span>Streak +1</span>
          </div>

          <div className="absolute -bottom-3 -left-3 px-3.5 py-1.5 rounded-full bg-[#002f38] text-[#fff3b0] shadow-2xl flex items-center gap-1.5 transform -rotate-2 border border-[#fff3b0]/25 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#e09f3e] animate-ping"></span>
            <span className="text-[#e09f3e]">Row 2 Complete! 🎟️</span>
          </div>
        </div>

        {/* Dynamic Interactive Hint Alert */}
        {activeHint && (
          <div className="mt-3 px-3.5 py-1.5 rounded-full bg-[#001115]/80 backdrop-blur-md border border-[#e09f3e]/40 text-[#fff3b0] text-xs font-display flex items-center gap-2 animate-fadeIn">
            <span>ℹ️</span>
            <span>{activeHint}</span>
          </div>
        )}
      </div>

      {/* Banner Footer & Social Proof */}
      <div className="relative z-10 pt-2">
        <p className="font-display text-xs uppercase tracking-wider text-[#e09f3e] font-bold">
          Tactile Intramurals Gamification
        </p>
        <h3 className="font-display text-xl sm:text-2xl font-extrabold text-[#fff3b0] mt-0.5 tracking-tight">
          Proof in selfies. Victories in lines.
        </h3>
        <p className="text-xs text-[#fff3b0]/80 mt-1 max-w-md">
          Complete any horizontal, vertical, or diagonal line on your card to generate verified stage raffle tickets.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-[#e09f3e] flex items-center justify-center text-[#452b00] font-bold text-xs ring-2 ring-[#00232b]">
              EJ
            </div>
            <div className="w-7 h-7 rounded-full bg-[#fff3b0] flex items-center justify-center text-[#00232b] font-bold text-xs ring-2 ring-[#00232b]">
              MK
            </div>
            <div className="w-7 h-7 rounded-full bg-[#9e2a2b] flex items-center justify-center text-[#fff3b0] font-bold text-xs ring-2 ring-[#00232b]">
              TL
            </div>
          </div>
          <span className="text-xs text-[#fff3b0]/90 font-display">
            <strong className="text-[#e09f3e]">14.2k Snappers</strong> competing across campus
          </span>
        </div>
      </div>
    </div>
  );
}
