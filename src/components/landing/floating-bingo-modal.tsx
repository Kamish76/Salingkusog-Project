"use client";

import { useState } from "react";
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

interface FloatingBingoModalProps {
  isAuthenticated: boolean;
  tasks: BingoTaskItem[];
  userProgress: UserProgressItem[];
  raffleEntries: RaffleEntryItem[];
  currentDay: number;
  onSelectTaskToUpload?: (taskId: string) => void;
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
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Map progress by slot index
  const progressBySlot = new Map(userProgress.map((p) => [p.slotIndex, p]));
  const completedCount = progressBySlot.size;

  const handleTileClick = (task: BingoTaskItem) => {
    const progress = progressBySlot.get(task.slotIndex);
    const isCompleted = Boolean(progress);
    const isLocked = task.unlockDay > currentDay;

    if (isCompleted && progress) {
      // Open photo detail view with remove and change settings
      setSelectedSlotDetail({ task, progress });
      setRemoveError(null);
      return;
    }

    if (isLocked) {
      setActiveHint(`🔒 Day ${task.unlockDay} challenge. Unlocks when organizers advance the event day.`);
      return;
    }

    if (!isAuthenticated) {
      setActiveHint(`📸 Tapped Slot #${task.slotIndex + 1} ("${task.title}"). Sign in with Google to submit proof!`);
      return;
    }

    // Empty slot: open upload modal immediately with this task pre-selected
    if (onSelectTaskToUpload) {
      setIsOpen(false);
      onSelectTaskToUpload(task.id);
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
      setSelectedSlotDetail(null);
    } catch (err: unknown) {
      setRemoveError(err instanceof Error ? err.message : "Error removing photo");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleChangePhoto = () => {
    if (!selectedSlotDetail) return;
    const taskId = selectedSlotDetail.task.id;
    setSelectedSlotDetail(null);
    setIsOpen(false);
    if (onSelectTaskToUpload) {
      onSelectTaskToUpload(taskId);
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
          onClick={() => {
            setSelectedSlotDetail(null);
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
              {completedCount} of 9 complete • Day {currentDay}
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
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#e8ded5] shadow-polaroid p-6 sm:p-7 flex flex-col justify-between overflow-hidden animate-scaleIn max-h-[92vh] overflow-y-auto">
            {/* Top Washi Tape Strip */}
            <div className="washi-tape-coral w-32 h-5.5 absolute -top-2 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90"></div>

            {/* DETAIL VIEW: OPENED PHOTO SETTINGS */}
            {selectedSlotDetail ? (
              <div className="flex flex-col gap-4 pt-1">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-base sm:text-lg text-[#1e1b19] tracking-tight">
                        Slot #{selectedSlotDetail.task.slotIndex + 1}: {selectedSlotDetail.task.title}
                      </span>
                    </div>
                    <p className="font-body text-xs text-[#5a413d] mt-0.5">
                      {selectedSlotDetail.task.description}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedSlotDetail(null)}
                    type="button"
                    aria-label="Back to grid"
                    className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-bold transition cursor-pointer -mr-1 -mt-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Uploaded Photo Preview Frame */}
                <div className="relative w-full aspect-[4/3] rounded-2xl bg-stone-100 overflow-hidden border border-[#e8ded5] shadow-inner">
                  {selectedSlotDetail.progress.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedSlotDetail.progress.imageUrl}
                      alt={selectedSlotDetail.task.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 text-xs">
                      <span className="text-3xl mb-1">📷</span>
                      <span>No photo preview available</span>
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-[#588157] text-white text-[10px] font-display font-bold shadow-xs flex items-center gap-1">
                    <span>✓</span>
                    <span>Stamped</span>
                  </div>
                </div>

                {/* Caption / Note */}
                {selectedSlotDetail.progress.caption && (
                  <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                    <span className="block font-display text-[10px] font-bold text-[#8e706c] uppercase mb-0.5">
                      Your Caption
                    </span>
                    <p className="font-body text-xs text-[#1e1b19]">
                      &ldquo;{selectedSlotDetail.progress.caption}&rdquo;
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {removeError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-body">
                    ⚠️ {removeError}
                  </div>
                )}

                {/* Action Buttons: Change Photo, Remove Photo, Back */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleChangePhoto}
                      type="button"
                      disabled={isRemoving}
                      className="py-2.5 px-3 rounded-full bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🔄</span>
                      <span>Change Photo</span>
                    </button>

                    <button
                      onClick={handleRemovePhoto}
                      type="button"
                      disabled={isRemoving}
                      className="py-2.5 px-3 rounded-full bg-white hover:bg-red-50 border border-red-200 text-red-600 font-display font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <span>🗑️</span>
                      <span>{isRemoving ? "Removing..." : "Remove Photo"}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedSlotDetail(null)}
                    type="button"
                    className="w-full py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-[#1e1b19] font-display font-bold text-xs transition cursor-pointer"
                  >
                    ← Back to 3x3 Card
                  </button>
                </div>
              </div>
            ) : (
              /* STANDARD 3x3 BINGO CARD VIEW */
              <>
                {/* Header with Close Button */}
                <div className="flex items-start justify-between mb-4 pt-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-lg sm:text-xl text-[#1e1b19] tracking-tight">
                        Intramurals 3x3 Bingo
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdad5] text-[#b4281e] tracking-wide uppercase">
                        Day {currentDay}
                      </span>
                    </div>
                    <p className="font-body text-xs text-[#5a413d] mt-0.5">
                      Tap any open slot to upload proof, or tap completed slots to view/edit!
                    </p>
                  </div>

                  <button
                    onClick={() => setIsOpen(false)}
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
                      const isLocked = task.unlockDay > currentDay;
                      const isCenter = task.slotIndex === 4;
                      const icon = ICONS_BY_CATEGORY[task.category] || "📸";

                      return (
                        <button
                          key={task.id}
                          onClick={() => handleTileClick(task)}
                          type="button"
                          className={`aspect-square rounded-xl relative flex flex-col items-center justify-center text-center p-1.5 transition-all duration-150 transform cursor-pointer select-none active:scale-95 shadow-xs overflow-hidden ${
                            isCompleted
                              ? "bg-white text-[#1e1b19] border-2 border-[#588157] shadow-sm font-bold"
                              : isLocked
                              ? "bg-stone-100 border border-stone-200 text-stone-400 opacity-60"
                              : isCenter
                              ? "bg-[#ffdad5]/40 text-[#630002] border-2 border-[#ff5e4d] shadow-xs font-bold"
                              : "bg-white border border-[#e8ded5] hover:border-stone-400 text-[#1e1b19]"
                          }`}
                        >
                          {/* If completed with an uploaded photo, show thumbnail with stamp overlay */}
                          {isCompleted && progress?.imageUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={progress.imageUrl}
                                alt={task.title}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-1">
                                <span className="text-base sm:text-lg drop-shadow-xs">✅</span>
                                <span className="font-display text-[9px] font-bold text-white leading-tight truncate w-full drop-shadow-xs">
                                  {task.title}
                                </span>
                                <span className="text-[7px] font-bold text-emerald-300 uppercase tracking-wider drop-shadow-xs">
                                  Tap to View
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="text-xl mb-0.5">
                                {isCompleted ? "✅" : isLocked ? "🔒" : icon}
                              </span>
                              <span className="font-display text-[10px] font-bold leading-tight truncate w-full text-stone-800">
                                {task.title}
                              </span>
                              {isCompleted ? (
                                <span className="text-[8px] font-bold text-[#588157] uppercase tracking-wider">
                                  Stamped
                                </span>
                              ) : isLocked ? (
                                <span className="text-[8px] font-medium text-stone-400 uppercase tracking-wider">
                                  Day {task.unlockDay}
                                </span>
                              ) : (
                                <span className="text-[8px] font-bold text-[#ff5e4d] uppercase tracking-wider">
                                  + Upload
                                </span>
                              )}
                            </>
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
                      onClick={() => setIsOpen(false)}
                      type="button"
                      className="w-full py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-display font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      Return to Memory Board
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
