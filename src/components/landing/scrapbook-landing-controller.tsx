"use client";

import { useState } from "react";
import { MemoryBoard, type PostRecord } from "./memory-board";
import {
  FloatingBingoModal,
  type BingoTaskItem,
  type UserProgressItem,
  type RaffleEntryItem,
} from "./floating-bingo-modal";
import { UploadMemoryModal } from "./upload-memory-modal";
import { AuthButton } from "@/components/auth-button";

interface ScrapbookLandingControllerProps {
  posts: PostRecord[];
  tasks: BingoTaskItem[];
  userProgress: UserProgressItem[];
  raffleEntries: RaffleEntryItem[];
  currentDay: number;
  isRaffleActive?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function ScrapbookLandingController({
  posts,
  tasks,
  userProgress,
  raffleEntries,
  currentDay,
  isRaffleActive = true,
  user,
}: ScrapbookLandingControllerProps) {
  const [isBingoOpen, setIsBingoOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [preselectedTaskId, setPreselectedTaskId] = useState<string | undefined>(undefined);
  const [uploadOriginRect, setUploadOriginRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [uploadSource, setUploadSource] = useState<"bingo" | "board">("board");

  const handleOpenUpload = (
    taskId?: string,
    originRect?: { top: number; left: number; width: number; height: number },
    source: "bingo" | "board" = "board"
  ) => {
    setPreselectedTaskId(taskId);
    setUploadOriginRect(originRect || null);
    setUploadSource(source);
    // Keep bingo modal mounted at the back so returning requires zero reload
    setIsUploadOpen(true);
  };

  const handleCloseUpload = () => {
    setIsUploadOpen(false);
    setUploadOriginRect(null);
    setUploadSource("board");
  };

  const completedCount = userProgress.length;
  const remainingTasks = Math.max(0, 9 - completedCount);
  const completedSlotSet = new Set(userProgress.map((p) => p.slotIndex));

  return (
    <div className="w-full flex flex-col gap-8 sm:gap-12">
      {/* 1. HERO ACTION & PROGRESS CARD (Tailored for Guest vs Logged-In) */}
      <div className="w-full max-w-xl mx-auto -mt-2 sm:-mt-4">
        {user ? (
          /* LOGGED IN: PERSONAL 3x3 PROGRESS CARD */
          <div className="relative p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs flex flex-col gap-4 overflow-hidden">
            {/* Top Washi Tape accent */}
            <div className="washi-tape-coral w-28 h-4.5 absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-xs opacity-85 pointer-events-none"></div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#8e706c]">
                  Your Intramurals Quest
                </span>
                <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#1e1b19] tracking-tight">
                  {user.name?.split(" ")[0] ?? "Student"}&apos;s 3×3 Card
                </h2>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdf5f2] border border-[#ffdad5] text-[#b4281e] font-display font-bold text-xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#ff5e4d]"></span>
                <span>{completedCount} of 9 Stamped</span>
              </div>
            </div>

            {/* 9-Slot Stamp Tracker Dots */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-3 py-2.5 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
              {Array.from({ length: 9 }).map((_, idx) => {
                const isDone = completedSlotSet.has(idx);
                return (
                  <div
                    key={idx}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      isDone
                        ? "bg-[#ff5e4d]"
                        : "bg-[#e8ded5]"
                    }`}
                    title={`Slot ${idx + 1}: ${isDone ? "Completed" : "Pending"}`}
                  />
                );
              })}
            </div>

            {/* Incentive Status Line */}
            <p className="text-xs font-body text-[#5a413d] leading-relaxed">
              {completedCount >= 9 ? (
                <span className="text-[#2b6127] font-semibold">
                  🎉 Card completed! You have earned your entry into the Stage Raffle Draw.
                </span>
              ) : (
                <>
                  Snap <strong className="font-bold text-[#b4281e]">{remainingTasks} more</strong>{" "}
                  {remainingTasks === 1 ? "campus photo" : "campus photos"} to complete your card and enter the stage raffle draw!
                </>
              )}
            </p>

            {/* Primary Action Button */}
            <button
              onClick={() => setIsBingoOpen(true)}
              type="button"
              className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-sm shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
              </svg>
              <span>{completedCount > 0 ? "Continue 3×3 Bingo Card" : "Open 3×3 Bingo Card"}</span>
              <span className="text-white/80 font-normal">→</span>
            </button>
          </div>
        ) : (
          /* GUEST: INSTANT CALL-TO-ACTION CARD */
          <div className="relative p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5 overflow-hidden">
            {/* Top Washi Tape accent */}
            <div className="washi-tape-butter w-28 h-4.5 absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-xs opacity-85 pointer-events-none"></div>

            <div className="flex-1 text-center sm:text-left pt-1">
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#ff5e4d]">
                Join the Rally
              </span>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#1e1b19] tracking-tight mt-0.5">
                Ready to start your 3×3 Card?
              </h2>
              <p className="text-xs font-body text-[#5a413d] mt-1 leading-relaxed">
                Sign in with your Google account to snap challenges, stamp your board, and win stage raffle prizes.
              </p>
            </div>

            <div className="shrink-0 w-full sm:w-auto flex flex-col items-center sm:items-end gap-1">
              <AuthButton
                user={null}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
              />
              <span className="text-[10px] text-[#8e706c] font-body">Instant • No password needed</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. "HOW TO PLAY & WIN" 3-STEP VISUAL STRIP */}
      <section aria-label="How to play" className="w-full max-w-5xl mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="font-display font-extrabold text-sm sm:text-base tracking-tight text-[#8e706c] uppercase">
            How to Play & Win
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Step 1 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e8ded5] shadow-2xs flex flex-col gap-2 relative">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-[#fdf5f2] border border-[#ffdad5] text-[#b4281e] font-display font-extrabold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <h3 className="font-display font-bold text-sm text-[#1e1b19]">
                Pick a Challenge
              </h3>
            </div>
            <p className="font-body text-xs text-[#5a413d] leading-relaxed pl-10">
              Browse 9 fun Intramural tasks — block mate selfies, cheering chants, and team booth visits.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e8ded5] shadow-2xs flex flex-col gap-2 relative">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-[#fdf5f2] border border-[#ffdad5] text-[#b4281e] font-display font-extrabold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <h3 className="font-display font-bold text-sm text-[#1e1b19]">
                Snap & Stamp
              </h3>
            </div>
            <p className="font-body text-xs text-[#5a413d] leading-relaxed pl-10">
              Snap photos live during the games. Each submission stamps your card and joins the campus board.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e8ded5] shadow-2xs flex flex-col gap-2 relative">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-[#fdf5f2] border border-[#ffdad5] text-[#b4281e] font-display font-extrabold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <h3 className="font-display font-bold text-sm text-[#1e1b19]">
                Win Stage Prizes
              </h3>
            </div>
            <p className="font-body text-xs text-[#5a413d] leading-relaxed pl-10">
              Complete all 9 squares to earn your verified raffle code for the official stage draw!
            </p>
          </div>
        </div>
      </section>

      {/* 3. CENTRAL POLAROID MEMORY BOARD */}
      <MemoryBoard
        posts={posts}
        isAuthenticated={Boolean(user)}
        currentUserId={user?.id}
        onOpenUpload={(rect) => handleOpenUpload(undefined, rect, "board")}
        onOpenBingo={() => setIsBingoOpen(true)}
      />

      {/* 4. PERSISTENT 3x3 BINGO DOCK & MODAL */}
      <FloatingBingoModal
        isAuthenticated={Boolean(user)}
        tasks={tasks}
        userProgress={userProgress}
        raffleEntries={raffleEntries}
        currentDay={currentDay}
        isRaffleActive={isRaffleActive}
        isOpen={isBingoOpen}
        onOpenChange={setIsBingoOpen}
        isUploadOpen={isUploadOpen}
        onSelectTaskToUpload={(taskId, rect) => handleOpenUpload(taskId, rect, "bingo")}
      />

      {/* 5. PHOTO UPLOAD / DROP MEMORY MODAL */}
      <UploadMemoryModal
        isOpen={isUploadOpen}
        onClose={handleCloseUpload}
        originRect={uploadOriginRect}
        returnToBingo={uploadSource === "bingo"}
        isAuthenticated={Boolean(user)}
        currentDay={currentDay}
        bingoTasks={tasks.map((t) => ({
          id: t.id,
          slotIndex: t.slotIndex,
          title: t.title,
          description: t.description,
          unlockDay: t.unlockDay,
        }))}
        preselectedTaskId={preselectedTaskId}
      />
    </div>
  );
}
