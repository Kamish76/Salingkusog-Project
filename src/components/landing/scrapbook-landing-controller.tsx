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

  return (
    <>
      {/* Central Polaroid Memory Board */}
      <MemoryBoard
        posts={posts}
        isAuthenticated={Boolean(user)}
        currentUserId={user?.id}
        onOpenUpload={(rect) => handleOpenUpload(undefined, rect, "board")}
      />

      {/* Floating 3x3 Bingo Side Widget & Modal */}
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

      {/* Photo Upload / Drop Memory Modal */}
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

      {/* Anchored Guest Call-To-Action (hidden on mobile to prevent collision with Bingo trigger) */}
      {!user && (
        <aside aria-label="Sign in prompt" className="hidden sm:block fixed bottom-6 left-4 sm:left-8 z-30 pointer-events-auto">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#e8ded5] shadow-xs">
            <svg className="w-5 h-5 text-[#ff5e4d] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
            <span className="font-body text-xs text-[#5a413d]">
              Join Salingkusog to drop photos and claim raffle tickets
            </span>
            <div className="pl-1">
              <AuthButton user={null} />
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
