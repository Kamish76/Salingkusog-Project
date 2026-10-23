"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient } from "@/lib/auth/client";
import { removeBingoTaskPhotoAction } from "@/app/actions/posts";

export interface BingoTaskItem {
  id: string;
  slotIndex: number;
  title: string;
  description: string;
  category: string;
  unlockDay: number;
  requiresSelfie: boolean;
}

export interface UserProgressItem {
  slotIndex: number;
  taskId: string;
  postId: string;
  completedAt: string | Date;
  imageUrl?: string | null;
  caption?: string | null;
}

export interface RaffleEntryItem {
  raffleCode: string;
  lineType: string;
  lineIndex: number;
}

export interface OriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface FloatingBingoModalProps {
  isAuthenticated: boolean;
  tasks: BingoTaskItem[];
  userProgress: UserProgressItem[];
  raffleEntries: RaffleEntryItem[];
  currentDay: number;
  onSelectTaskToUpload?: (taskId: string, originRect?: OriginRect) => void;
}

const ICONS_BY_CATEGORY: Record<string, string> = {
  spirit: "📣",
  booth: "🍢",
  sports: "🏀",
  culture: "🎨",
};

export function FloatingBingoModal({
  isAuthenticated,
  tasks,
  userProgress,
  raffleEntries,
  currentDay,
  onSelectTaskToUpload,
}: FloatingBingoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [selectedSlotDetail, setSelectedSlotDetail] = useState<{
    task: BingoTaskItem;
    progress: UserProgressItem;
  } | null>(null);

  // Detail photo zoom state
  const [originRect, setOriginRect] = useState<OriginRect | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // 3x3 Bingo Card modal origin zoom state
  const [bingoButtonRect, setBingoButtonRect] = useState<OriginRect | null>(null);
  const [isBingoExpanded, setIsBingoExpanded] = useState(false);
  const [isBingoClosing, setIsBingoClosing] = useState(false);

  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Map progress by slot index
  const progressBySlot = new Map(userProgress.map((p) => [p.slotIndex, p]));
  const completedCount = progressBySlot.size;

  // Manage Apple fluid zoom entrance state for Photo Detail
  useEffect(() => {
    if (selectedSlotDetail && !isClosing) {
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          setIsExpanded(true);
        });
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }
  }, [selectedSlotDetail, isClosing]);

  // Manage Apple fluid zoom entrance state for 3x3 Bingo Card Modal
  useEffect(() => {
    if (isOpen && !isBingoClosing) {
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          setIsBingoExpanded(true);
        });
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }
  }, [isOpen, isBingoClosing]);

  // Close detail view with Apple smooth collapse animation
  const handleCloseDetail = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setIsExpanded(false);
    setTimeout(() => {
      setSelectedSlotDetail(null);
      setOriginRect(null);
      setIsClosing(false);
      setRemoveError(null);
    }, 380);
  }, [isClosing]);

  // Close 3x3 Bingo modal with Apple smooth collapse animation
  const handleCloseBingo = useCallback(() => {
    if (isBingoClosing) return;
    setIsBingoClosing(true);
    setIsBingoExpanded(false);
    setTimeout(() => {
      setIsOpen(false);
      setBingoButtonRect(null);
      setIsBingoClosing(false);
    }, 380);
  }, [isBingoClosing]);

  // Keyboard accessibility: Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedSlotDetail) {
          handleCloseDetail();
        } else if (isOpen) {
          handleCloseBingo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSlotDetail, isOpen, handleCloseDetail, handleCloseBingo]);

  const handleTileClick = (task: BingoTaskItem, e: React.MouseEvent<HTMLButtonElement>) => {
    const progress = progressBySlot.get(task.slotIndex);
    const isCompleted = Boolean(progress);
    // All locks disabled for testing as requested
    const isLocked = false;

    if (isCompleted && progress) {
      // Capture element rect for Apple fluid zoom from tile origin
      const rect = e.currentTarget.getBoundingClientRect();
      setOriginRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setSelectedSlotDetail({ task, progress });
      setRemoveError(null);
      setIsClosing(false);
      setIsExpanded(false);
      return;
    }

    if (isLocked) {
      setActiveHint(`🔒 Day ${task.unlockDay} challenge.`);
      return;
    }

    if (!isAuthenticated) {
      setActiveHint(`📸 Tapped Slot #${task.slotIndex + 1} ("${task.title}"). Sign in with Google to submit proof!`);
      return;
    }

    // Empty slot: open upload modal immediately with origin animation from pressed tile
    if (onSelectTaskToUpload) {
      const rect = e.currentTarget.getBoundingClientRect();
      setIsOpen(false);
      onSelectTaskToUpload(task.id, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setActiveHint(`📸 Slot #${task.slotIndex + 1}: ${task.description}`);
    }
  };

  const handleRemovePhoto = async () => {
    if (!selectedSlotDetail) return;
    if (!confirm("Are you sure you want to remove this photo from your bingo card?")) return;

    try {
      setIsRemoving(true);
      setRemoveError(null);
      const res = await removeBingoTaskPhotoAction(selectedSlotDetail.task.id);
      if (!res.success) {
        setRemoveError(res.error || "Failed to remove photo.");
        setIsRemoving(false);
        return;
      }
      handleCloseDetail();
    } catch (err: unknown) {
      setRemoveError(err instanceof Error ? err.message : "Error removing photo");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleChangePhoto = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!selectedSlotDetail) return;
    const taskId = selectedSlotDetail.task.id;
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectedSlotDetail(null);
    setOriginRect(null);
    setIsOpen(false);
    if (onSelectTaskToUpload) {
      onSelectTaskToUpload(taskId, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
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

  // Compute Apple Quick-Look origin transform for photo
  const getImageAnimationStyles = (): React.CSSProperties => {
    if (!originRect || typeof window === "undefined") {
      return {
        transform: isExpanded ? "scale(1)" : "scale(0.85)",
        opacity: isExpanded ? 1 : 0,
        transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease",
      };
    }

    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const tileCenterX = originRect.left + originRect.width / 2;
    const tileCenterY = originRect.top + originRect.height / 2;

    const deltaX = tileCenterX - viewportCenterX;
    const deltaY = tileCenterY - viewportCenterY;
    const targetWidth = Math.min(window.innerWidth - 48, 440);
    const scale = Math.max(0.18, Math.min(1, originRect.width / targetWidth));

    if (!isExpanded) {
      return {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`,
        borderRadius: "16px",
        transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms ease, opacity 250ms ease",
      };
    }

    return {
      transform: "translate3d(0, 0, 0) scale(1)",
      borderRadius: "28px",
      transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms ease, opacity 250ms ease",
    };
  };

  // Compute 3x3 Bingo Card Modal origin transform from bottom-right button
  const getBingoCardStyles = (): React.CSSProperties => {
    if (!bingoButtonRect || typeof window === "undefined") {
      return {
        transform: isBingoExpanded ? "scale(1)" : "scale(0.92)",
        opacity: isBingoExpanded ? 1 : 0,
        transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease",
      };
    }

    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const btnCenterX = bingoButtonRect.left + bingoButtonRect.width / 2;
    const btnCenterY = bingoButtonRect.top + bingoButtonRect.height / 2;

    const deltaX = btnCenterX - viewportCenterX;
    const deltaY = btnCenterY - viewportCenterY;
    const targetWidth = Math.min(window.innerWidth - 32, 448);
    const scale = Math.max(0.15, Math.min(1, bingoButtonRect.width / targetWidth));

    if (!isBingoExpanded) {
      return {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`,
        borderRadius: "9999px",
        opacity: 0,
        transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms ease, opacity 250ms ease",
      };
    }

    return {
      transform: "translate3d(0, 0, 0) scale(1)",
      borderRadius: "24px",
      opacity: 1,
      transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms ease, opacity 250ms ease",
    };
  };

  // Surrounding controls fade & slide in smoothly once image expands
  const controlsStyle: React.CSSProperties = {
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? "translateY(0)" : "translateY(12px)",
    transition: isExpanded
      ? "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1) 150ms, transform 380ms cubic-bezier(0.16, 1, 0.3, 1) 150ms"
      : "opacity 180ms ease, transform 180ms ease",
    pointerEvents: isExpanded ? "auto" : "none",
  };

  return (
    <>
      {/* PERSISTENT FLOATING BINGO ICON / SIDE BUTTON */}
      <aside aria-label="3x3 Bingo Challenge" className="fixed bottom-6 right-5 sm:right-8 z-40">
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setBingoButtonRect({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            });
            setSelectedSlotDetail(null);
            setIsBingoClosing(false);
            setIsBingoExpanded(false);
            setIsOpen(true);
          }}
          type="button"
          aria-label="Open 3x3 Bingo Card"
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-white text-[#1e1b19] border border-[#e8ded5] shadow-polaroid hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          {/* Status Indicator */}
          <span className="relative flex h-3 w-3">
            {completedCount > 0 ? (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#588157]"></span>
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5e4d] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff5e4d]"></span>
              </>
            )}
          </span>

          <span className="text-xl">🎯</span>

          <div className="flex flex-col text-left">
            <span className="font-display font-extrabold text-xs sm:text-sm tracking-tight text-[#1e1b19] leading-tight">
              3x3 Bingo Card
            </span>
            <span className="font-body text-[10px] text-[#8e706c] font-medium leading-tight">
              {completedCount} of 9 complete • Testing Unlocked
            </span>
          </div>

          <span className="text-xs text-[#8e706c] group-hover:text-[#ff5e4d] transition-colors ml-1">
            ↗
          </span>
        </button>
      </aside>

      {/* 3x3 BINGO CARD MODAL DIALOG WITH FLUID OPENING ANIMATION */}
      {isOpen && (
        <div
          onClick={handleCloseBingo}
          style={{
            opacity: isBingoExpanded ? 1 : 0,
            transition: "opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-xs select-none"
        >
          {/* Card Container (Zooms up from bottom-right button) */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={getBingoCardStyles()}
            className="relative w-full max-w-md bg-white border border-[#e8ded5] shadow-polaroid p-6 sm:p-7 flex flex-col justify-between overflow-hidden max-h-[92vh] overflow-y-auto will-change-transform"
          >
            {/* Top Washi Tape Strip */}
            <div className="washi-tape-coral w-32 h-5.5 absolute -top-2 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90"></div>

            {/* Header with Close Button */}
            <div className="flex items-start justify-between mb-4 pt-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg sm:text-xl text-[#1e1b19] tracking-tight">
                    Intramurals 3x3 Bingo
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                    Day {currentDay} • Testing Mode
                  </span>
                </div>
                <p className="font-body text-xs text-[#5a413d] mt-0.5">
                  All 9 slots unlocked for testing! Tap any slot to test or view.
                </p>
              </div>

              <button
                onClick={handleCloseBingo}
                type="button"
                aria-label="Close modal"
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-bold transition cursor-pointer -mr-1 -mt-1"
              >
                ✕
              </button>
            </div>

            {/* 3x3 Challenge Grid */}
            <div className="my-2 bg-[#fcf9f5] p-3 sm:p-4 rounded-2xl border border-[#e8ded5]">
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {tasks.map((task) => {
                  const progress = progressBySlot.get(task.slotIndex);
                  const isCompleted = Boolean(progress);
                  const isCenter = task.slotIndex === 4;
                  const icon = ICONS_BY_CATEGORY[task.category] || "📸";

                  return (
                    <button
                      key={task.id}
                      onClick={(e) => handleTileClick(task, e)}
                      type="button"
                      className={`group aspect-square rounded-2xl relative flex flex-col items-center justify-center text-center transition-all duration-200 transform cursor-pointer select-none active:scale-95 overflow-hidden ${
                        isCompleted
                          ? "bg-stone-900 border-2 border-emerald-500/80 shadow-md ring-2 ring-emerald-500/20"
                          : isCenter
                          ? "bg-[#ffdad5]/40 text-[#630002] border-2 border-[#ff5e4d] shadow-xs font-bold hover:scale-[1.02]"
                          : "bg-white border border-[#e8ded5] hover:border-stone-400 hover:scale-[1.02] text-[#1e1b19]"
                      }`}
                    >
                      {/* Highlight photo with crisp edge-to-edge layout & zero obscuring background */}
                      {isCompleted && progress?.imageUrl ? (
                        <div className="relative w-full h-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={progress.imageUrl}
                            alt={task.title}
                            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                          />

                          {/* Frosted Glass Corner Stamp */}
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-emerald-300 text-[8px] font-bold flex items-center gap-0.5 shadow-sm">
                            <span>✓</span>
                          </div>

                          {/* Minimal Bottom Scrim with Title */}
                          <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-1.5 text-left pointer-events-none">
                            <span className="font-display text-[9px] font-bold text-white leading-tight truncate drop-shadow-xs">
                              {task.title}
                            </span>
                            <span className="text-[7px] font-medium text-emerald-300 uppercase tracking-wider">
                              Tap to view
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-1.5 flex flex-col items-center justify-center">
                          <span className="text-xl mb-0.5">
                            {isCompleted ? "✅" : icon}
                          </span>
                          <span className="font-display text-[10px] font-bold leading-tight truncate w-full text-stone-800">
                            {task.title}
                          </span>
                          {isCompleted ? (
                            <span className="text-[8px] font-bold text-[#588157] uppercase tracking-wider">
                              Stamped
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold text-[#ff5e4d] uppercase tracking-wider">
                              + Upload
                            </span>
                          )}
                        </div>
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

            {/* Real Claimed Raffle Ticket Box */}
            {raffleEntries.length > 0 ? (
              <div className="mt-3 p-3 rounded-2xl bg-[#fff8f5] border border-[#f4a261]/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎟️</span>
                  <div>
                    <span className="font-display text-xs font-bold text-[#8e4e14] block leading-tight">
                      Raffle Ticket Earned!
                    </span>
                    <span className="font-mono text-[10px] text-stone-600 block">
                      Code: {raffleEntries[0].raffleCode} ({raffleEntries[0].lineType})
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-[#f4a261]/20 text-[#8e4e14] font-bold text-[10px] tracking-wide uppercase">
                  Valid Entry
                </span>
              </div>
            ) : (
              <div className="mt-3 p-3 rounded-2xl bg-[#fcf9f5] border border-[#e8ded5] flex items-center gap-2 text-stone-600 text-xs font-body">
                <span>🎟️</span>
                <span>Complete any 3-slot row, column, or diagonal line to earn a verifiable stage raffle entry!</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-[#e8ded5] flex flex-col gap-2">
              {!isAuthenticated ? (
                <button
                  onClick={handleSignIn}
                  type="button"
                  className="w-full py-2.5 rounded-full bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign in with Google to Play</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  onClick={handleCloseBingo}
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

      {/* APPLE QUICK-LOOK PHOTO DETAIL MODAL WITH FLUID ZOOM EXPANSION */}
      {selectedSlotDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedSlotDetail.task.title}
          onClick={handleCloseDetail}
          style={{
            opacity: isExpanded ? 1 : 0,
            transition: "opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-between p-4 sm:p-7 bg-black/65 backdrop-blur-xs select-none overflow-hidden"
        >
          {/* Top Floating Glass Header Pill */}
          <div
            style={controlsStyle}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md flex items-center justify-between px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-2xl"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                Slot #{selectedSlotDetail.task.slotIndex + 1}
              </span>
              <span className="font-display font-bold text-xs sm:text-sm text-white truncate">
                {selectedSlotDetail.task.title}
              </span>
            </div>

            <button
              onClick={handleCloseDetail}
              type="button"
              aria-label="Close photo view"
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0 ml-2"
            >
              ✕
            </button>
          </div>

          {/* Central Hero Photo (Zooms and expands from tapped tile origin) */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={getImageAnimationStyles()}
            className="relative w-full max-w-md aspect-[4/3] sm:aspect-square max-h-[62vh] overflow-hidden shadow-2xl ring-1 ring-white/20 bg-stone-950 flex items-center justify-center will-change-transform my-auto"
          >
            {selectedSlotDetail.progress.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedSlotDetail.progress.imageUrl}
                alt={selectedSlotDetail.task.title}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            ) : (
              <div className="text-stone-400 text-xs">No photo preview available</div>
            )}

            {/* Corner Stamped Badge */}
            <div className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-emerald-400 text-[10px] font-display font-bold shadow-md flex items-center gap-1 pointer-events-none">
              <span>✓</span>
              <span>Stamped Proof</span>
            </div>

            {/* Discreet Floating Caption Badge (secondary to photo) */}
            {selectedSlotDetail.progress.caption && (
              <div className="absolute bottom-3.5 inset-x-3.5 p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-white/95 text-xs font-body shadow-xl pointer-events-none">
                <span className="block text-[9px] font-display font-bold text-white/50 uppercase tracking-wider mb-0.5">
                  Caption
                </span>
                <p className="line-clamp-2 italic font-light">
                  &ldquo;{selectedSlotDetail.progress.caption}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Bottom Floating Glass Action Bar (Fades & Slides In) */}
          <div
            style={controlsStyle}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md flex flex-col gap-2 pt-2"
          >
            {removeError && (
              <div className="p-2.5 rounded-2xl bg-red-500/25 border border-red-500/40 text-red-100 text-xs text-center backdrop-blur-md font-body">
                ⚠️ {removeError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleChangePhoto}
                type="button"
                disabled={isRemoving}
                className="py-3 px-4 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white font-display font-bold text-xs shadow-lg backdrop-blur-md border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Change Photo</span>
              </button>

              <button
                onClick={handleRemovePhoto}
                type="button"
                disabled={isRemoving}
                className="py-3 px-4 rounded-full bg-red-500/20 hover:bg-red-500/35 active:scale-95 text-red-300 hover:text-red-100 font-display font-bold text-xs shadow-lg backdrop-blur-md border border-red-400/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>🗑️</span>
                <span>{isRemoving ? "Removing..." : "Remove Photo"}</span>
              </button>
            </div>

            <button
              onClick={handleCloseDetail}
              type="button"
              className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-98 text-white/80 hover:text-white font-display font-medium text-xs backdrop-blur-md border border-white/10 transition cursor-pointer"
            >
              ← Back to 3x3 Card
            </button>
          </div>
        </div>
      )}
    </>
  );
}
