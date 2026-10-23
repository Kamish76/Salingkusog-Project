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
        onOpenUpload={(rect) => handleOpenUpload(undefined, rect, "board")}
      />

      {/* Floating 3x3 Bingo Side Widget & Modal */}
      <FloatingBingoModal
        isAuthenticated={Boolean(user)}
        tasks={tasks}
        userProgress={userProgress}
        raffleEntries={raffleEntries}
        currentDay={currentDay}
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

      {/* Floating Guest Bottom Call-To-Action (if not signed in) */}
      {!user && (
        <aside aria-label="Sign in prompt" className="fixed bottom-6 left-4 sm:left-8 z-30 pointer-events-auto">
          <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-full bg-white/95 border border-[#e8ded5] shadow-polaroid backdrop-blur-md">
            <span className="text-base sm:text-lg pl-2">📸</span>
            <span className="font-body text-xs text-[#5a413d] hidden sm:inline">
              Join Salingkusog to drop photos & claim raffle tickets!
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
