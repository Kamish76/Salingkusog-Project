"use client";

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type FormEvent, type DragEvent } from "react";
import { processAndDownscaleImage, isHeicFormat, hasHeicMagicBytes } from "@/lib/image-processing";
import { submitStudentPostAction } from "@/app/actions/posts";
import { authClient } from "@/lib/auth/client";
import { isTaskUnlocked } from "@/lib/bingo-engine";

export interface BingoTaskOption {
  id: string;
  slotIndex: number;
  title: string;
  description?: string;
  unlockDay: number;
}

export interface OriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface UploadMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  currentDay: number;
  isEventActive?: boolean;
  bingoTasks: BingoTaskOption[];
  preselectedTaskId?: string;
  originRect?: OriginRect | null;
  returnToBingo?: boolean;
}

const PREVIEW_ASPECTS: Record<"portrait" | "landscape" | "square", string> = {
  portrait: "aspect-[3/4] max-h-[52vh]",
  landscape: "aspect-[4/3] max-h-[46vh]",
  square: "aspect-square max-h-[48vh]",
};

export function UploadMemoryModal({
  isOpen,
  onClose,
  isAuthenticated,
  currentDay,
  isEventActive = true,
  bingoTasks,
  preselectedTaskId,
  originRect,
  returnToBingo = false,
}: UploadMemoryModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [prevPreselectedTaskId, setPrevPreselectedTaskId] = useState(preselectedTaskId);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(preselectedTaskId || "");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [previewOrientation, setPreviewOrientation] = useState<"portrait" | "landscape" | "square">("landscape");

  // Fluid opening animation states
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preselectedTaskId and isOpen when props change during render
  if (preselectedTaskId !== prevPreselectedTaskId) {
    setPrevPreselectedTaskId(preselectedTaskId);
    setSelectedTaskId(preselectedTaskId || "");
  }

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setIsExpanded(false);
    }
  }

  // Manage fluid zoom entrance state
  useEffect(() => {
    if (isOpen && !isClosing) {
      const raf = requestAnimationFrame(() => {
        setIsExpanded(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, isClosing]);

  // Smooth collapse dismissal
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setIsExpanded(false);
  }, [isClosing]);

  const handleModalTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && isClosing) {
      onClose();
      setIsClosing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsProcessingImage(false);
      setPreviewOrientation("landscape");
      setCaption("");
      setErrorMessage(null);
      setSuccessInfo(null);
    }
  };

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Clean up object URLs on preview change or unmount to prevent DOM memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Keyboard accessibility: Escape to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const activeTask = bingoTasks.find((t) => t.id === selectedTaskId);
  const isTaskLockedForUpload = activeTask
    ? !isTaskUnlocked(activeTask.unlockDay, currentDay) || !isEventActive
    : false;

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

  const handleProcessFile = async (file: File) => {
    try {
      setIsProcessingImage(true);
      setErrorMessage(null);

      // Downscale to 1080p WebP/JPEG in browser to preserve storage and bandwidth,
      // and safely transcode iOS HEIC photos
      const processed = await processAndDownscaleImage(file, 1080, 0.82);

      const extension = processed.outputType === "image/jpeg" ? ".jpg" : ".webp";
      const convertedFileName = file.name.replace(/\.[^.]+$/, "") + extension;
      const convertedFile = new File([processed.blob], convertedFileName, {
        type: processed.outputType,
      });

      setSelectedFile(convertedFile);
      setPreviewUrl(processed.previewUrl);
      const aspect = processed.resizedWidth / processed.resizedHeight;
      setPreviewOrientation(aspect > 1.15 ? "landscape" : aspect < 0.88 ? "portrait" : "square");
    } catch (err: unknown) {
      console.error("Image processing failed:", err);
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not read this photo format. Please take a new snapshot or choose a standard photo."
      );
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleProcessFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/") || isHeicFormat(file) || (await hasHeicMagicBytes(file))) {
      await handleProcessFile(file);
    } else {
      setErrorMessage("Unsupported file type. Please drop a JPEG, PNG, WebP, AVIF, or HEIC photo.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please choose or snap a photo before dropping.");
      return;
    }

    if (isTaskLockedForUpload) {
      setErrorMessage(
        !isEventActive
          ? "Bingo challenge submissions are currently paused."
          : `This challenge is locked until Day ${activeTask?.unlockDay}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption);
      formData.append("isAnonymous", String(isAnonymous));
      if (selectedTaskId) {
        formData.append("bingoTaskId", selectedTaskId);
      }

      const res = await submitStudentPostAction(formData);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to drop memory.");
        setSubmitting(false);
        return;
      }

      setSuccessInfo(
        res.newRaffleCode
          ? `🎉 Bingo line complete! Claimed Raffle Ticket: ${res.newRaffleCode}`
          : "Photo dropped into the memory well!"
      );

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Compute Apple Quick-Look origin transform from clicked button or slot
  const getCardAnimationStyles = (): React.CSSProperties => {
    if (!originRect || typeof window === "undefined") {
      return {
        transform: isExpanded ? "scale(1)" : "scale(0.85)",
        opacity: isExpanded ? 1 : 0,
        transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease",
      };
    }

    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const sourceCenterX = originRect.left + originRect.width / 2;
    const sourceCenterY = originRect.top + originRect.height / 2;

    const deltaX = sourceCenterX - viewportCenterX;
    const deltaY = sourceCenterY - viewportCenterY;
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
      borderRadius: "20px",
      transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms ease, opacity 250ms ease",
    };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeTask ? `Upload Slot #${activeTask.slotIndex + 1}` : "Drop a Memory"}
      onClick={handleClose}
      onTransitionEnd={handleModalTransitionEnd}
      style={{
        opacity: isExpanded ? 1 : 0,
        transition: "opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-stone-950/70 backdrop-blur-xs select-none overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={getCardAnimationStyles()}
        className="relative w-full max-w-md bg-white border border-[#e8ded5] rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden will-change-transform"
      >
        {/* Top Washi Tape Decoration */}
        <div className="washi-tape-coral w-28 h-5 absolute -top-2 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-20 opacity-90 shadow-xs" />

        {/* Card Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-3 border-b border-[#e8ded5]/80 shrink-0 bg-white">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#f5ece9] text-[#8e4e14] border border-[#e8ded5] shrink-0 font-body">
              Day {currentDay} • {activeTask ? `Slot #${activeTask.slotIndex + 1}` : "Memory Well"}
            </span>
            <h2 className="font-display font-bold text-sm sm:text-base text-[#1e1b19] truncate">
              {activeTask ? activeTask.title : "Drop a Memory"}
            </h2>
          </div>

          <button
            onClick={handleClose}
            type="button"
            aria-label="Close upload modal"
            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer shrink-0 active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Card Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-3.5">
          {!isAuthenticated ? (
            <div className="p-6 rounded-2xl bg-[#fcf9f5] border border-[#e8ded5] text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#e8ded5] shadow-xs flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-base text-[#1e1b19]">
                Sign in to Drop Memories
              </h3>
              <p className="font-body text-xs text-[#5a413d] max-w-xs leading-relaxed">
                Sign in with your student Google account to upload photos, earn bingo stamps, and enter stage raffle drawings.
              </p>
              <button
                onClick={handleSignIn}
                type="button"
                className="mt-2 px-5 py-2.5 rounded-xl bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-xs shadow-xs transition focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <span>Sign in with Google</span>
                <span>→</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {/* Active Challenge Target Highlight */}
              {activeTask && (
                <div className="p-3 rounded-xl bg-[#fff8f5] border border-[#f4a261]/40 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#ff5e4d]/10 border border-[#ff5e4d]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="5" />
                      <circle cx="12" cy="12" r="1" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-bold text-xs text-[#8e4e14] block leading-tight truncate">
                      Target: Slot #{activeTask.slotIndex + 1} - {activeTask.title}
                    </span>
                    {activeTask.description && (
                      <p className="font-body text-xs text-[#5a413d] mt-0.5 leading-snug">
                        {activeTask.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tactile Polaroid Photo Dropzone */}
              <div
                onClick={() => {
                  if (!isProcessingImage) fileInputRef.current?.click();
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative w-full ${
                  previewUrl ? PREVIEW_ASPECTS[previewOrientation] : "aspect-[4/3] max-h-[38vh]"
                } overflow-hidden rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center group ${
                  isProcessingImage
                    ? "bg-[#fff5f2] border-2 border-dashed border-[#ff5e4d]/60 cursor-wait"
                    : previewUrl
                    ? "bg-white p-2.5 pb-4 border border-[#e8ded5] shadow-md"
                    : isDragging
                    ? "bg-[#fff0eb] border-2 border-dashed border-[#ff5e4d] shadow-xs"
                    : "bg-[#fcf9f5] hover:bg-[#fff9f6] border-2 border-dashed border-[#e8ded5] hover:border-[#f4a261]"
                }`}
              >
                {isProcessingImage ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-[#1e1b19] gap-3">
                    <div className="w-9 h-9 border-3 border-[#ff5e4d]/25 border-t-[#ff5e4d] rounded-full animate-spin" />
                    <div className="flex flex-col items-center">
                      <span className="font-display font-bold text-xs sm:text-sm text-[#1e1b19]">
                        Optimizing photo...
                      </span>
                      <span className="font-body text-[11px] text-[#5a413d] mt-0.5">
                        Converting and formatting for campus memory board
                      </span>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <div className="relative w-full h-full rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                    {/* Corner Washi Tape */}
                    <div className="washi-tape-coral w-16 h-3.5 absolute -top-1 right-4 rounded-xs pointer-events-none opacity-85 shadow-xs" />

                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-display font-medium flex items-center gap-1.5 shadow-sm hover:bg-stone-900 transition">
                      <svg className="w-3.5 h-3.5 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      <span>Change Photo</span>
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-xs border border-[#e8ded5] text-[#588157] text-[11px] font-display font-bold shadow-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#588157]"></span>
                      <span>Ready to Drop</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center p-5 text-[#1e1b19]">
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#e8ded5] shadow-xs flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:border-[#f4a261] transition-transform">
                      <svg className="w-6 h-6 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                      </svg>
                    </div>
                    <span className="font-display font-bold text-xs sm:text-sm text-[#1e1b19]">
                      Tap to snap or upload photo
                    </span>
                    <span className="font-body text-[11px] sm:text-xs text-[#5a413d] mt-0.5 max-w-xs leading-relaxed">
                      Selfie, cheering snapshot, or booth moment
                    </span>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif,.HEIC,.HEIF"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Gentle Photo Consent & Courtesy Banner */}
              <div className="p-2.5 rounded-xl bg-[#fff8f5] border border-[#ffdad5] text-[#5a413d] text-xs font-body flex items-start gap-2">
                <span className="text-sm shrink-0">🤝</span>
                <p className="leading-snug">
                  <strong className="font-display font-bold text-[#b4281e]">Campus Photo Tip:</strong> Make sure friends and classmates in your photo are happy to have it shared on the campus memory board!
                </p>
              </div>

              {/* Caption Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Write a quick memory note or cheer..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={200}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] text-[#1e1b19] placeholder:text-stone-400 text-xs sm:text-sm font-body focus:outline-none focus:border-[#ff5e4d] focus:bg-white focus:ring-2 focus:ring-[#ff5e4d]/20 transition shadow-2xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 font-mono">
                  {caption.length}/200
                </span>
              </div>

              {/* Bingo Task Selector (when not preselected) */}
              {!preselectedTaskId && (
                <div>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] text-[#1e1b19] text-xs sm:text-sm font-body focus:outline-none focus:border-[#ff5e4d] focus:bg-white focus:ring-2 focus:ring-[#ff5e4d]/20 transition shadow-2xs"
                  >
                    <option value="">General Memory (No bingo slot)</option>
                    {bingoTasks.map((t) => {
                      const isUnlocked = isTaskUnlocked(t.unlockDay, currentDay);
                      const isLocked = !isUnlocked || !isEventActive;
                      return (
                        <option key={t.id} value={t.id} disabled={isLocked}>
                          Slot #{t.slotIndex + 1}: {t.title}{" "}
                          {isLocked
                            ? !isEventActive
                              ? "(Paused)"
                              : `(Unlocks Day ${t.unlockDay})`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Locked Task Notice */}
              {isTaskLockedForUpload && activeTask && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs font-body flex items-center gap-2">
                  <span className="text-sm shrink-0">🔒</span>
                  <span>
                    {!isEventActive
                      ? "Bingo challenge submissions are currently paused."
                      : `Slot #${activeTask.slotIndex + 1} (${activeTask.title}) unlocks on Day ${activeTask.unlockDay}. Submissions are locked until then.`}
                  </span>
                </div>
              )}

              {/* Anonymous Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-[#e8ded5] text-[#ff5e4d] focus:ring-[#ff5e4d] h-4 w-4 cursor-pointer accent-[#ff5e4d]"
                />
                <span className="font-body text-xs text-[#5a413d]">
                  Post anonymously (hides your name on the public board)
                </span>
              </label>

              {/* Error & Success Feedback */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs text-center font-body flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {successInfo && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-body font-bold flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span>{successInfo}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Pinned Card Footer */}
        {isAuthenticated && (
          <div className="px-4 sm:px-6 py-3.5 bg-[#fcf9f5] border-t border-[#e8ded5] flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleSubmit}
              type="button"
              disabled={submitting || isProcessingImage || !selectedFile || isTaskLockedForUpload}
              className="flex-1 py-2.5 sm:py-3 px-4 min-h-[44px] rounded-xl bg-[#ff5e4d] hover:bg-[#b4281e] disabled:opacity-40 disabled:hover:bg-[#ff5e4d] text-white font-display font-bold text-xs sm:text-sm shadow-xs transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>{submitting ? "Dropping..." : isProcessingImage ? "Optimizing Photo..." : "Drop Into Well"}</span>
            </button>

            <button
              onClick={handleClose}
              type="button"
              aria-label={returnToBingo ? "Back to Bingo Card" : "Cancel"}
              className="py-2.5 sm:py-3 px-4 min-h-[44px] rounded-xl bg-white hover:bg-stone-50 text-[#5a413d] hover:text-[#1e1b19] font-display font-bold text-xs sm:text-sm border border-[#e8ded5] transition focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none cursor-pointer flex items-center justify-center active:scale-95"
            >
              {returnToBingo ? "← Back to Bingo" : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
