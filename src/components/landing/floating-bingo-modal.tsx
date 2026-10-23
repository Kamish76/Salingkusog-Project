"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

interface BingoTile {
  id: number;
  label: string;
  category: string;
  status: "completed_coral" | "completed_sage" | "center_free" | "pending" | "locked";
  icon: string;
}

const INITIAL_TILES: BingoTile[] = [
  { id: 0, label: "Morning Parade", category: "Opening", status: "completed_coral", icon: "🎉" },
  { id: 1, label: "College Cheer", category: "Spirit", status: "pending", icon: "📣" },
  { id: 2, label: "Food Booth Run", category: "Social", status: "completed_sage", icon: "🍢" },
  { id: 3, label: "5k Sunrise Run", category: "Sports", status: "completed_coral", icon: "🏃" },
  { id: 4, label: "Free Mascot Snap", category: "Special", status: "center_free", icon: "⭐" },
  { id: 5, label: "Friendship Selfie", category: "Social", status: "completed_sage", icon: "🤝" },
  { id: 6, label: "Courtside Action", category: "Sports", status: "pending", icon: "🏀" },
  { id: 7, label: "Banner & Chants", category: "Spirit", status: "completed_coral", icon: "🎨" },
  { id: 8, label: "Night Fireworks", category: "Finale", status: "locked", icon: "🔒" },
];

interface FloatingBingoModalProps {
  isAuthenticated?: boolean;
}

export function FloatingBingoModal({ isAuthenticated = false }: FloatingBingoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  const handleTileClick = (tile: BingoTile) => {
    if (tile.status === "locked") {
      setActiveHint("🔒 Day 3 challenge — unlocks on finals day!");
    } else if (tile.status === "center_free") {
      setActiveHint("⭐ Center star is automatically unlocked for all registered students!");
    } else if (tile.status.startsWith("completed")) {
      setActiveHint(`✅ Verified photo proof submitted for "${tile.label}"!`);
    } else {
      setActiveHint(`📸 Tapped "${tile.label}". ${isAuthenticated ? "Upload your selfie proof!" : "Sign in to submit your selfie!"}`);
    }
  };

  const handleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  };

  return (
    <>
      {/* PERSISTENT FLOATING BINGO ICON / SIDE BUTTON */}
      <aside aria-label="3x3 Bingo Challenge" className="fixed bottom-6 right-5 sm:right-8 z-40">
        <button
          onClick={() => setIsOpen(true)}
          type="button"
          aria-label="Open 3x3 Bingo Card"
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-white text-[#1e1b19] border border-[#e8ded5] shadow-polaroid hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          {/* Pulsing Notification Dot */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5e4d] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff5e4d]"></span>
          </span>

          <span className="text-xl">🎯</span>

          <div className="flex flex-col text-left">
            <span className="font-display font-extrabold text-xs sm:text-sm tracking-tight text-[#1e1b19] leading-tight">
              3x3 Bingo Card
            </span>
            <span className="font-body text-[10px] text-[#8e706c] font-medium leading-tight">
              3 of 9 complete • Day 1
            </span>
          </div>

          <span className="text-xs text-[#8e706c] group-hover:text-[#ff5e4d] transition-colors ml-1">
            ↗
          </span>
        </button>
      </aside>

      {/* MODAL DIALOG OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/45 backdrop-blur-sm animate-fadeIn">
          {/* Card Container */}
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#e8ded5] shadow-polaroid p-6 sm:p-8 flex flex-col justify-between overflow-hidden animate-scaleIn">
            {/* Top Washi Tape Strip */}
            <div className="washi-tape-coral w-32 h-6 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90"></div>

            {/* Header with Close Button */}
            <div className="flex items-start justify-between mb-4 pt-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg sm:text-xl text-[#1e1b19] tracking-tight">
                    Intramurals 3x3 Bingo
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdad5] text-[#b4281e] tracking-wide uppercase">
                    Day 1
                  </span>
                </div>
                <p className="font-body text-xs text-[#5a413d] mt-0.5">
                  Snap selfies, complete any row or column, and win stage raffle tickets!
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                type="button"
                aria-label="Close modal"
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-bold transition cursor-pointer -mr-2 -mt-1"
              >
                ✕
              </button>
            </div>

            {/* 3x3 Challenge Grid */}
            <div className="my-2 bg-[#fcf9f5] p-3 sm:p-4 rounded-2xl border border-[#e8ded5]">
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {INITIAL_TILES.map((tile) => {
                  const isCenter = tile.status === "center_free";
                  const isCoral = tile.status === "completed_coral";
                  const isSage = tile.status === "completed_sage";
                  const isLocked = tile.status === "locked";

                  return (
                    <button
                      key={tile.id}
                      onClick={() => handleTileClick(tile)}
                      type="button"
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center p-1.5 transition-all duration-150 transform cursor-pointer select-none active:scale-95 shadow-xs ${
                        isCenter
                          ? "bg-[#ffdad5] text-[#630002] border-2 border-[#ff5e4d] shadow-sm font-bold animate-pulse"
                          : isCoral
                          ? "bg-white text-[#1e1b19] border-2 border-[#ff5e4d] shadow-sm font-bold"
                          : isSage
                          ? "bg-white text-[#1e1b19] border-2 border-[#588157] shadow-sm font-bold"
                          : isLocked
                          ? "bg-stone-100 border border-stone-200 text-stone-400 opacity-60"
                          : "bg-white border border-[#e8ded5] hover:border-stone-400 text-[#1e1b19]"
                      }`}
                    >
                      <span className="text-xl mb-0.5">{tile.icon}</span>
                      <span className="font-display text-[10px] font-bold leading-tight truncate w-full text-stone-800">
                        {tile.label}
                      </span>
                      {(isCoral || isSage) && (
                        <span className="text-[8px] font-bold text-[#b4281e] uppercase tracking-wider">
                          ✓ Stamped
                        </span>
                      )}
                      {isCenter && (
                        <span className="text-[8px] font-bold text-[#ff5e4d] uppercase tracking-wider">
                          ★ Free
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Interactive Hint */}
              {activeHint && (
                <div className="mt-3 px-3 py-1.5 rounded-xl bg-white border border-[#e8ded5] text-[#1e1b19] text-xs font-body flex items-center gap-2 shadow-xs animate-fadeIn">
                  <span>ℹ️</span>
                  <span>{activeHint}</span>
                </div>
              )}
            </div>

            {/* Winning Line / Raffle Status Box */}
            <div className="mt-3 p-3 rounded-2xl bg-[#fff8f5] border border-[#f4a261]/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎟️</span>
                <div>
                  <span className="font-display text-xs font-bold text-[#8e4e14] block leading-tight">
                    Row 2 Completed!
                  </span>
                  <span className="font-mono text-[10px] text-stone-600 block">
                    Ticket: SK-RFL-78A42B
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-[#f4a261]/20 text-[#8e4e14] font-bold text-[10px] tracking-wide uppercase">
                Active in Draw
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-[#e8ded5] flex flex-col gap-2">
              {!isAuthenticated ? (
                <button
                  onClick={handleSignIn}
                  type="button"
                  className="w-full py-2.5 rounded-full bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign in with Google to Claim & Snap</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsOpen(false)}
                  type="button"
                  className="w-full py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-display font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Return to Memory Board
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
