"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { removeBingoTaskPhotoAction } from "@/app/actions/posts";
import { exportRecaptchaBingoCard } from "@/lib/export-recaptcha-card";

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
  isRaffleActive?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectTaskToUpload?: (taskId: string, originRect?: OriginRect) => void;
  isUploadOpen?: boolean;
  user?: { name?: string | null; email?: string | null } | null;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "spirit":
      return (
        <svg className="w-5 h-5 text-stone-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75Z" />
        </svg>
      );
    case "booth":
      return (
        <svg className="w-5 h-5 text-stone-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.614A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.015a2.993 2.993 0 0 0 2.25 1.015c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614M3.75 9.349h16.5" />
        </svg>
      );
    case "sports":
      return (
        <svg className="w-5 h-5 text-stone-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18M3 12a9 9 0 0 1 18 0M5.5 5.5l13 13M18.5 5.5l-13 13" />
        </svg>
      );
    case "culture":
      return (
        <svg className="w-5 h-5 text-stone-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-stone-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        </svg>
      );
  }
}

const POLAROID_ROTATIONS = [
  "rotate-[-3.5deg]", // Slot 0: Top-Left
  "rotate-[1.5deg]",  // Slot 1: Top-Center
  "rotate-[-2.5deg]", // Slot 2: Top-Right
  "rotate-[2deg]",    // Slot 3: Mid-Left
  "rotate-[-1deg]",   // Slot 4: Center
  "rotate-[3deg]",    // Slot 5: Mid-Right
  "rotate-[-2.5deg]", // Slot 6: Bottom-Left
  "rotate-[1.5deg]",  // Slot 7: Bottom-Center
  "rotate-[-2deg]",   // Slot 8: Bottom-Right
];

const POLAROID_SHAPES: Record<
  "landscape" | "portrait" | "square",
  { card: string; photo: string; detailAspect: string }
> = {
  landscape: {
    card: "w-[124%] sm:w-[130%] h-[105%] sm:h-[110%] -top-[2.5%] -left-[12%] sm:-top-[5%] sm:-left-[15%]",
    photo: "aspect-[16/10]",
    detailAspect: "aspect-[16/10] max-h-[58vh]",
  },
  portrait: {
    card: "w-[105%] sm:w-[110%] h-[128%] sm:h-[135%] -top-[14%] -left-[2.5%] sm:-top-[17%] sm:-left-[5%]",
    photo: "aspect-[3/4]",
    detailAspect: "aspect-[3/4] max-h-[70vh]",
  },
  square: {
    card: "w-[114%] sm:w-[118%] h-[122%] sm:h-[128%] -top-[11%] -left-[7%] sm:-top-[14%] sm:-left-[9%]",
    photo: "aspect-square",
    detailAspect: "aspect-square max-h-[62vh]",
  },
};

export function FloatingBingoModal({
  isAuthenticated,
  tasks,
  userProgress,
  raffleEntries,
  currentDay,
  isRaffleActive = true,
  isOpen: externalIsOpen,
  onOpenChange,
  onSelectTaskToUpload,
  isUploadOpen = false,
  user,
}: FloatingBingoModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportBingoCard = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportRecaptchaBingoCard({
        user,
        tasks,
        userProgress,
      });
    } catch (err) {
      console.error("Export error:", err);
      setExportError(err instanceof Error ? err.message : "Failed to export card image");
    } finally {
      setIsExporting(false);
    }
  };
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  const setIsOpen = useCallback(
    (open: boolean) => {
      if (isControlled) {
        onOpenChange?.(open);
      } else {
        setInternalIsOpen(open);
      }
    },
    [isControlled, onOpenChange]
  );
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

  // Stacking z-index: newer uploads have higher z-index to overlay older ones
  const sortedCompleted = [...userProgress]
    .filter((p) => Boolean(p.imageUrl))
    .sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return timeA - timeB;
    });

  const uploadOrderMap = new Map<number, number>();
  sortedCompleted.forEach((item, index) => {
    uploadOrderMap.set(item.slotIndex, index + 1);
  });

  // Track natural image aspect ratio to adapt polaroid orientation (landscape vs portrait vs square)
  const [imageOrientations, setImageOrientations] = useState<
    Record<number, "portrait" | "landscape" | "square">
  >({});
  const probedImagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    userProgress.forEach((p) => {
      if (p.imageUrl && p.slotIndex !== undefined) {
        const cacheKey = `${p.slotIndex}:${p.imageUrl}`;
        if (probedImagesRef.current.has(cacheKey)) return;
        probedImagesRef.current.add(cacheKey);

        const img = new Image();
        const updateOrientation = () => {
          if (img.naturalWidth && img.naturalHeight) {
            const aspect = img.naturalWidth / img.naturalHeight;
            const orientation: "portrait" | "landscape" | "square" =
              aspect > 1.15 ? "landscape" : aspect < 0.88 ? "portrait" : "square";
            setImageOrientations((prev) => {
              if (prev[p.slotIndex] === orientation) return prev;
              return { ...prev, [p.slotIndex]: orientation };
            });
          }
        };
        img.onload = updateOrientation;
        img.src = p.imageUrl;
        if (img.complete) {
          updateOrientation();
        }
      }
    });
  }, [userProgress]);

  // Reset states during render when props or active selection change
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setIsBingoExpanded(false);
    }
  }

  const [prevSelectedSlotDetail, setPrevSelectedSlotDetail] = useState(selectedSlotDetail);
  if (selectedSlotDetail !== prevSelectedSlotDetail) {
    setPrevSelectedSlotDetail(selectedSlotDetail);
    if (!selectedSlotDetail) {
      setIsExpanded(false);
    }
  }

  // Manage fluid zoom entrance state for Photo Detail
  useEffect(() => {
    if (selectedSlotDetail && !isClosing) {
      const raf = requestAnimationFrame(() => {
        setIsExpanded(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [selectedSlotDetail, isClosing]);

  // Manage fluid zoom entrance state for 3x3 Bingo Card Modal
  useEffect(() => {
    if (isOpen && !isBingoClosing) {
      const raf = requestAnimationFrame(() => {
        setIsBingoExpanded(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, isBingoClosing]);

  // Prevent background scrolling while modal or photo detail is open
  useEffect(() => {
    if (!isOpen && !selectedSlotDetail) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, selectedSlotDetail]);

  // Close detail view with smooth collapse
  const handleCloseDetail = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setIsExpanded(false);
  }, [isClosing]);

  const handleDetailTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && isClosing) {
      setSelectedSlotDetail(null);
      setOriginRect(null);
      setIsClosing(false);
      setRemoveError(null);
    }
  };

  // Close 3x3 Bingo modal with smooth collapse
  const handleCloseBingo = useCallback(() => {
    if (isBingoClosing) return;
    setIsBingoClosing(true);
    setIsBingoExpanded(false);
  }, [isBingoClosing]);

  const handleBingoTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && isBingoClosing) {
      setIsOpen(false);
      setBingoButtonRect(null);
      setIsBingoClosing(false);
    }
  };

  // Keyboard accessibility: Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isUploadOpen) return;
        if (selectedSlotDetail) {
          handleCloseDetail();
        } else if (isOpen) {
          handleCloseBingo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSlotDetail, isOpen, isUploadOpen, handleCloseDetail, handleCloseBingo]);

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

    // Empty slot: open upload modal immediately with origin animation from pressed tile (keep bingo mounted at back)
    if (onSelectTaskToUpload) {
      const rect = e.currentTarget.getBoundingClientRect();
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
    // Keep bingo mounted at back when switching to upload
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
      {/* PERSISTENT BINGO STAMP TRIGGER DOCK (Mobile-First Sticky Dock & Desktop Quick-Access) */}
      <aside aria-label="3x3 Bingo Challenge" className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-8 sm:bottom-6 z-40 flex justify-center pointer-events-none">
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
          className="pointer-events-auto group relative w-full sm:w-auto max-w-sm sm:max-w-none flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 sm:px-4 sm:py-3 min-h-[48px] sm:min-h-[44px] rounded-2xl sm:rounded-xl bg-white text-[#1e1b19] border-2 border-[#ffdad5] sm:border-[#e8ded5] hover:border-[#ff5e4d] focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none transition-all cursor-pointer shadow-lg sm:shadow-xs active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Status Indicator */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {completedCount >= 9 ? (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2b6127]"></span>
              ) : completedCount > 0 ? (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#588157]"></span>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff5e4d] animate-pulse"></span>
              )}
            </span>

            <svg className="w-5 h-5 text-[#ff5e4d] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>

            <div className="flex flex-col text-left">
              <span className="font-display font-bold text-xs sm:text-sm tracking-tight text-[#1e1b19] leading-tight">
                3×3 Bingo Rally
              </span>
              <span className="font-body text-[11px] text-[#8e706c] font-normal leading-tight">
                {completedCount >= 9 ? "🎉 Card completed!" : `${completedCount} of 9 stamped`}
              </span>
            </div>
          </div>

          {/* Quick-Action CTA Pill on Mobile */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#ff5e4d] text-white text-xs font-display font-bold shrink-0 sm:hidden">
            <span>Open Card</span>
            <span>→</span>
          </div>
        </button>
      </aside>

      {/* 3x3 BINGO CARD MODAL DIALOG WITH FLUID OPENING ANIMATION */}
      {isOpen && (
        <div
          onClick={handleCloseBingo}
          onTransitionEnd={handleBingoTransitionEnd}
          style={{
            opacity: isBingoExpanded ? 1 : 0,
            transition: "opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-black/60 select-none"
        >
          {/* Card Container (Zooms up from bottom-right button) */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={getBingoCardStyles()}
            className="relative w-full max-w-md bg-white border border-[#e8ded5] rounded-2xl shadow-xl p-4 sm:p-7 flex flex-col justify-between overflow-hidden max-h-[90dvh] overflow-y-auto will-change-transform"
          >
            {/* Top Washi Tape Strip */}
            <div className="washi-tape-coral w-32 h-5.5 absolute -top-2 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90"></div>

            {/* Header with Close Button */}
            <div className="flex items-start justify-between mb-3 sm:mb-4 pt-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-base sm:text-xl text-[#1e1b19] tracking-tight">
                    Intramurals 3x3 Bingo
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
                    Day {currentDay}
                  </span>
                </div>
                <p className="font-body text-xs text-[#5a413d] mt-1">
                  Complete all 9 challenges to enter the official stage raffle draw
                </p>
              </div>

              <div className="flex items-center gap-2 -mr-1 -mt-1">
                {userProgress.some((p) => p.imageUrl) && (
                  <button
                    onClick={handleExportBingoCard}
                    disabled={isExporting}
                    type="button"
                    title="Export 3x3 Bingo Card as PNG"
                    aria-label="Export 3x3 Bingo Card as PNG"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white font-display text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer shadow-xs active:scale-95 shrink-0"
                  >
                    {isExporting ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span className="hidden sm:inline">Exporting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        <span>Export PNG</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleCloseBingo}
                  type="button"
                  aria-label="Close modal"
                  className="w-10 h-10 sm:w-9 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer active:scale-95 shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>

            {exportError && (
              <div className="mb-2 text-xs text-rose-600 font-body px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                <span>{exportError}</span>
                <button
                  type="button"
                  onClick={() => setExportError(null)}
                  className="text-rose-500 hover:text-rose-700 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 3x3 Challenge Grid & Polaroid Collage */}
            <div className="my-2 bg-[#fcf9f5] p-3.5 sm:p-4.5 rounded-2xl border border-[#e8ded5] overflow-visible">
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 overflow-visible">
                {tasks.map((task) => {
                  const progress = progressBySlot.get(task.slotIndex);
                  const isCompleted = Boolean(progress && progress.imageUrl);
                  const isCenter = task.slotIndex === 4;
                  const icon = getCategoryIcon(task.category);
                  const rotationClass = POLAROID_ROTATIONS[task.slotIndex % POLAROID_ROTATIONS.length];
                  const uploadRank = uploadOrderMap.get(task.slotIndex) || 1;
                  const captionText = progress?.caption?.trim() || task.title;
                  const orientation = imageOrientations[task.slotIndex] || "square";
                  const shape = POLAROID_SHAPES[orientation];

                  return (
                    <div
                      key={task.id}
                      className="relative aspect-square flex items-center justify-center overflow-visible"
                    >
                      {!isCompleted ? (
                        /* Empty Slot Button: Tap to open upload modal */
                        <button
                          onClick={(e) => handleTileClick(task, e)}
                          type="button"
                          className={`w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-1.5 sm:p-2 text-center transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer select-none sm:hover:active:scale-98 ${
                            isCenter
                              ? "bg-[#ffdad5]/30 text-[#630002] border-[#ff5e4d]/60 font-bold"
                              : "bg-white/80 border-[#e8ded5] hover:border-stone-400 hover:bg-white text-[#1e1b19]"
                          }`}
                          style={{ zIndex: 1 }}
                        >
                          <span className="mb-1">{icon}</span>
                          <span className="font-display text-[10px] sm:text-xs font-bold leading-tight truncate w-full text-stone-800">
                            {task.title}
                          </span>
                          <span className="text-[9px] font-bold text-[#ff5e4d] mt-0.5">
                            + Add Photo
                          </span>
                        </button>
                      ) : (
                        <>
                          {/* Ghost Slot Placeholder */}
                          <div
                            className={`w-full h-full rounded-xl border border-dashed border-[#e8ded5]/60 bg-stone-100/35 pointer-events-none ${
                              isCenter ? "bg-[#ffdad5]/15 border-[#ff5e4d]/25" : ""
                            }`}
                          />

                          {/* Authentic Physical Polaroid */}
                          <button
                            onClick={(e) => handleTileClick(task, e)}
                            type="button"
                            aria-label={`View ${task.title} photo`}
                            style={{
                              zIndex: 10 + uploadRank,
                            }}
                            className={`group absolute ${shape.card} bg-white border border-stone-200/90 rounded-[3px] p-1.5 sm:p-2 flex flex-col justify-between cursor-pointer select-none transition sm:hover:active:scale-98 focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none ${rotationClass}`}
                          >
                            {/* Tactile Corner Pin / Scrapbook Pushpin Accent */}
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white/95 border border-stone-300 shadow-2xs flex items-center justify-center text-[9px] font-bold text-stone-400 pointer-events-none z-10 group-hover:text-[#ff5e4d] transition-colors">
                              ＋
                            </div>

                            {/* Inner Photo Frame */}
                            <div className={`relative w-full ${shape.photo} bg-stone-100 overflow-hidden rounded-[2px] border border-stone-200/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={progress?.imageUrl || ""}
                                alt={task.title}
                                onLoad={(e) => {
                                  const target = e.currentTarget;
                                  if (target.naturalWidth && target.naturalHeight) {
                                    const aspect = target.naturalWidth / target.naturalHeight;
                                    const detected: "portrait" | "landscape" | "square" =
                                      aspect > 1.15 ? "landscape" : aspect < 0.88 ? "portrait" : "square";
                                    setImageOrientations((prev) => {
                                      if (prev[task.slotIndex] === detected) return prev;
                                      return { ...prev, [task.slotIndex]: detected };
                                    });
                                  }
                                }}
                                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
                              />

                              {/* Subtle Corner Checkmark Badge */}
                              <div className="absolute top-1 left-1 px-1 py-0.5 rounded-sm bg-black/60 text-emerald-300 text-[8px] font-bold flex items-center shadow-2xs pointer-events-none">
                                ✓
                              </div>
                            </div>

                            {/* Polaroid Chin with Handwritten Caption or Title */}
                            <div className="w-full pt-1 sm:pt-1.5 pb-0.5 px-0.5 text-center flex flex-col items-center justify-center min-h-[20px] sm:min-h-[24px]">
                              <span className="font-handwriting font-bold text-stone-900 text-xs sm:text-[13px] leading-none tracking-tight truncate w-full group-hover:text-[#b4281e] transition-colors">
                                {captionText}
                              </span>
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Interactive Hint */}
              {activeHint && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-white border border-[#e8ded5] text-[#1e1b19] text-xs font-body flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e4d]"></span>
                  <span>{activeHint}</span>
                </div>
              )}
            </div>

            {/* Real Claimed Raffle Ticket Box */}
            {!isRaffleActive ? (
              raffleEntries.length > 0 ? (
                <div className="mt-3 p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
                    </svg>
                    <div>
                      <span className="font-display text-xs font-bold text-stone-700 block leading-tight">
                        Raffle Drawings on Standby
                      </span>
                      <span className="font-mono text-[10px] text-stone-500 block">
                        {raffleEntries.length} ticket{raffleEntries.length === 1 ? "" : "s"} saved · {raffleEntries[0].raffleCode}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-600 font-bold text-[10px]">
                    Standby
                  </span>
                </div>
              ) : (
                <div className="mt-3 p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] flex items-center gap-2 text-stone-600 text-xs font-body">
                  <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                  </svg>
                  <span>Raffle drawings are temporarily on pause while event setup is underway. Bingo stamps are active.</span>
                </div>
              )
            ) : raffleEntries.length > 0 ? (
              <div className="mt-3 p-3 rounded-xl bg-[#fff8f5] border border-[#f4a261]/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-[#8e4e14]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
                  </svg>
                  <div>
                    <span className="font-display text-xs font-bold text-[#8e4e14] block leading-tight">
                      Raffle Ticket Earned
                    </span>
                    <span className="font-mono text-[10px] text-stone-600 block">
                      Code: {raffleEntries[0].raffleCode} ({
                        raffleEntries[0].lineType === "row"
                          ? "Row Line"
                          : raffleEntries[0].lineType === "column"
                          ? "Column Line"
                          : raffleEntries[0].lineType === "diagonal"
                          ? "Diagonal Line"
                          : raffleEntries[0].lineType === "blackout"
                          ? "Full Blackout"
                          : raffleEntries[0].lineType === "milestone"
                          ? "Milestone"
                          : raffleEntries[0].lineType === "memory_drop"
                          ? "Campus Memory"
                          : raffleEntries[0].lineType
                      })
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-[#f4a261]/20 text-[#8e4e14] font-bold text-[10px]">
                  Valid Entry
                </span>
              </div>
            ) : (
              <div className="mt-3 p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] flex items-center gap-2 text-stone-600 text-xs font-body">
                <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
                </svg>
                <span>Complete any 3-slot row, column, or diagonal line to earn a verifiable stage raffle entry.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-[#e8ded5] flex flex-col gap-2">
              {!isAuthenticated ? (
                <button
                  onClick={handleSignIn}
                  type="button"
                  className="w-full py-2.5 rounded-lg bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-xs transition focus-visible:ring-2 focus-visible:ring-[#1e1b19] focus-visible:outline-none sm:hover:active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign in with Google to Play</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  onClick={handleCloseBingo}
                  type="button"
                  className="w-full py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-display font-bold text-xs transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none sm:hover:active:scale-98 cursor-pointer"
                >
                  Return to Memory Board
                </button>
              )}

              <div className="text-center pt-1">
                <Link
                  href="/rally-rules"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-body text-[#8e706c] hover:text-[#b4281e] underline decoration-stone-300 hover:decoration-[#b4281e] transition-colors"
                >
                  <span>📜 View Official Rally &amp; Raffle Rules</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO DETAIL MODAL WITH FLUID ZOOM EXPANSION */}
      {selectedSlotDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedSlotDetail.task.title}
          onClick={handleCloseDetail}
          onTransitionEnd={handleDetailTransitionEnd}
          style={{
            opacity: isExpanded ? 1 : 0,
            transition: "opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="fixed inset-0 z-[90] flex flex-col items-center justify-between p-4 sm:p-7 bg-black/75 select-none overflow-y-auto"
        >
          {/* Top Header */}
          <div
            style={controlsStyle}
            onClick={(e) => e.stopPropagation()}
            className="sticky top-0 z-10 w-full max-w-md flex items-center justify-between px-4 py-3 rounded-xl bg-[#1e1b19]/95 backdrop-blur-md border border-stone-800 text-white shadow-lg shrink-0"
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-800 text-stone-200 border border-stone-700">
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
              className="w-10 h-10 sm:w-8 sm:h-8 min-h-[44px] min-w-[44px] rounded-lg bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer shrink-0 ml-2 active:scale-95"
            >
              ✕
            </button>
          </div>

          {/* Central Hero Photo */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={getImageAnimationStyles()}
            className={`relative w-full max-w-md ${
              POLAROID_SHAPES[imageOrientations[selectedSlotDetail.task.slotIndex] || "square"].detailAspect
            } overflow-hidden shadow-2xl ring-1 ring-white/10 bg-stone-950 flex items-center justify-center will-change-transform my-auto rounded-lg`}
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
            <div className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-md bg-black/80 border border-white/20 text-emerald-400 text-[10px] font-display font-bold shadow-md flex items-center gap-1.5 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Stamped Proof</span>
            </div>

            {/* Discreet Floating Caption Badge */}
            {selectedSlotDetail.progress.caption && (
              <div className="absolute bottom-3.5 inset-x-3.5 p-3 rounded-xl bg-black/85 border border-white/15 text-white/95 text-xs font-body shadow-xl pointer-events-none">
                <span className="block text-[9px] font-display font-bold text-white/50 uppercase tracking-wider mb-0.5">
                  Caption
                </span>
                <p className="line-clamp-2 italic font-light">
                  &ldquo;{selectedSlotDetail.progress.caption}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div
            style={controlsStyle}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md flex flex-col gap-2 pt-2"
          >
            {removeError && (
              <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs text-center font-body flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>{removeError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleChangePhoto}
                type="button"
                disabled={isRemoving}
                className="py-3 px-4 min-h-[44px] rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-display font-bold text-xs border border-stone-700 transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>Change Photo</span>
              </button>

              <button
                onClick={handleRemovePhoto}
                type="button"
                disabled={isRemoving}
                className="py-3 px-4 min-h-[44px] rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 hover:text-white font-display font-bold text-xs border border-red-800 transition focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              >
                <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                <span>{isRemoving ? "Removing..." : "Remove Photo"}</span>
              </button>
            </div>

            <button
              onClick={handleCloseDetail}
              type="button"
              className="w-full py-3 min-h-[44px] rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-display font-medium text-xs border border-stone-800 transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer active:scale-95"
            >
              ← Back to 3x3 Card
            </button>
          </div>
        </div>
      )}
    </>
  );
}
