"use client";

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type FormEvent, type DragEvent } from "react";
import { processAndDownscaleImage } from "@/lib/image-processing";
import { submitStudentPostAction } from "@/app/actions/posts";
import { authClient } from "@/lib/auth/client";

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
  bingoTasks: BingoTaskOption[];
  preselectedTaskId?: string;
  originRect?: OriginRect | null;
  returnToBingo?: boolean;
}

export function UploadMemoryModal({
  isOpen,
  onClose,
  isAuthenticated,
  currentDay,
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
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

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

  // Manage Apple fluid zoom entrance state
  useEffect(() => {
    if (isOpen && !isClosing) {
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          setIsExpanded(true);
        });
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }
  }, [isOpen, isClosing]);

  // Smooth collapse dismissal
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setIsExpanded(false);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
      setErrorMessage(null);
      setSuccessInfo(null);
    }, 380);
  }, [isClosing, onClose]);

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
      setErrorMessage(null);
      // Downscale to 1080p WebP in browser to preserve storage and bandwidth
      const processed = await processAndDownscaleImage(file, 1080, 0.82);
      const convertedFile = new File([processed.blob], file.name.replace(/\.[^.]+$/, ".webp"), {
        type: "image/webp",
      });
      setSelectedFile(convertedFile);
      setPreviewUrl(processed.previewUrl);
    } catch (err: unknown) {
      console.error("Image processing failed:", err);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
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
    if (file && file.type.startsWith("image/")) {
      await handleProcessFile(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please choose or snap a photo before dropping.");
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
      borderRadius: "28px",
      transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms ease, opacity 250ms ease",
    };
  };

  // Surrounding controls fade & slide in smoothly
  const controlsStyle: React.CSSProperties = {
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? "translateY(0)" : "translateY(12px)",
    transition: isExpanded
      ? "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1) 150ms, transform 380ms cubic-bezier(0.16, 1, 0.3, 1) 150ms"
      : "opacity 180ms ease, transform 180ms ease",
    pointerEvents: isExpanded ? "auto" : "none",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeTask ? `Upload Slot #${activeTask.slotIndex + 1}` : "Drop a Memory"}
      onClick={handleClose}
      style={{
        opacity: isExpanded ? 1 : 0,
        transition: "opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-between p-4 sm:p-7 ${
        returnToBingo ? "bg-black/50" : "bg-black/65"
      } backdrop-blur-xs select-none overflow-y-auto`}
    >
      {/* Top Floating Glass Header Pill */}
      <div
        style={controlsStyle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md flex items-center justify-between px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-2xl shrink-0"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
            Day {currentDay} • {activeTask ? `Slot #${activeTask.slotIndex + 1}` : "Photo Well"}
          </span>
          <span className="font-display font-bold text-xs sm:text-sm text-white truncate">
            {activeTask ? activeTask.title : "Drop a Memory"}
          </span>
        </div>

        <button
          onClick={handleClose}
          type="button"
          aria-label="Close upload modal"
          className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0 ml-2"
        >
          ✕
        </button>
      </div>

      {/* Main Content Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md my-auto flex flex-col gap-3 py-3"
      >
        {!isAuthenticated ? (
          <div
            style={controlsStyle}
            className="p-7 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 text-center flex flex-col items-center gap-3 text-white shadow-2xl"
          >
            <span className="text-3xl">🔒</span>
            <h4 className="font-display font-bold text-base text-white">
              Sign in to Drop Memories
            </h4>
            <p className="font-body text-xs text-white/70 max-w-xs">
              Sign in with your student Google account to upload photos, earn bingo stamps, and enter stage raffle drawings!
            </p>
            <button
              onClick={handleSignIn}
              type="button"
              className="mt-2 px-6 py-2.5 rounded-full bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer"
            >
              Sign in with Google →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Active Challenge Target Highlight */}
            {activeTask && (
              <div
                style={controlsStyle}
                className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2.5 text-white/90 shadow-lg"
              >
                <span className="text-xl">🎯</span>
                <div className="flex-1 min-w-0">
                  <span className="font-display font-bold text-xs text-emerald-300 block leading-tight truncate">
                    Target: Slot #{activeTask.slotIndex + 1} - {activeTask.title}
                  </span>
                  {activeTask.description && (
                    <span className="font-body text-[11px] text-white/70 block leading-snug line-clamp-1">
                      {activeTask.description}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Photo Dropzone / Hero Camera Picker Frame (Zooms from clicked slot or button) */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={getCardAnimationStyles()}
              className={`relative w-full aspect-[4/3] sm:aspect-square max-h-[50vh] overflow-hidden shadow-2xl ring-1 ring-white/20 flex items-center justify-center cursor-pointer transition-all duration-300 group will-change-transform ${
                previewUrl
                  ? "bg-stone-950"
                  : isDragging
                  ? "bg-white/15 ring-2 ring-[#ff5e4d]"
                  : "bg-white/10 hover:bg-white/15 border border-dashed border-white/25"
              }`}
            >
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-102 pointer-events-none"
                  />
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-display font-bold shadow-md">
                    🔄 Tap to change
                  </div>
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/25 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-[10px] font-display font-bold shadow-md flex items-center gap-1">
                    <span>✓</span>
                    <span>Photo Selected</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-6 text-white">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl mb-2.5 shadow-lg group-hover:scale-105 transition-transform">
                    📷
                  </div>
                  <span className="font-display font-bold text-sm text-white">
                    Tap to snap or upload photo
                  </span>
                  <span className="font-body text-[11px] text-white/60 mt-0.5 max-w-xs">
                    Intramurals selfie, cheering snapshot, or booth moment (auto-optimized to 1080p)
                  </span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Caption Input */}
            <div style={controlsStyle} className="relative">
              <input
                type="text"
                placeholder="Write a quick memory note or cheer..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white placeholder:text-white/40 text-xs font-body focus:outline-none focus:border-white/35 shadow-lg"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-white/40 font-mono">
                {caption.length}/200
              </span>
            </div>

            {/* Bingo Task Selector (All 9 tasks unlocked for testing) */}
            {!preselectedTaskId && (
              <div style={controlsStyle}>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-body focus:outline-none focus:border-white/35 shadow-lg"
                >
                  <option value="" className="bg-stone-900 text-white">
                    General Memory (No bingo slot)
                  </option>
                  {bingoTasks.map((t) => (
                    <option key={t.id} value={t.id} className="bg-stone-900 text-white">
                      Slot #{t.slotIndex + 1}: {t.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Anonymous Toggle */}
            <label style={controlsStyle} className="flex items-center gap-2 cursor-pointer select-none px-1">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-white/30 text-[#ff5e4d] focus:ring-0 bg-white/10"
              />
              <span className="font-body text-xs text-white/70">
                Post anonymously (hides your name on the public board)
              </span>
            </label>
          </form>
        )}
      </div>

      {/* Bottom Floating Glass Action Bar */}
      <div
        style={controlsStyle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md flex flex-col gap-2 shrink-0 pt-1"
      >
        {errorMessage && (
          <div className="p-2.5 rounded-2xl bg-red-500/25 border border-red-500/40 text-red-100 text-xs text-center backdrop-blur-md font-body">
            ⚠️ {errorMessage}
          </div>
        )}

        {successInfo && (
          <div className="p-2.5 rounded-2xl bg-emerald-500/25 border border-emerald-500/40 text-emerald-100 text-xs text-center backdrop-blur-md font-body font-bold">
            🎉 {successInfo}
          </div>
        )}

        {isAuthenticated && (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleSubmit}
              type="button"
              disabled={submitting || !selectedFile}
              className="py-3 px-4 rounded-full bg-[#ff5e4d] hover:bg-[#b4281e] disabled:opacity-40 text-white font-display font-bold text-xs shadow-lg backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{submitting ? "Dropping..." : "Drop Into Well"}</span>
              <span>✨</span>
            </button>

            <button
              onClick={handleClose}
              type="button"
              aria-label={returnToBingo ? "Back to Bingo Card" : "Cancel"}
              className="py-3 px-4 rounded-full bg-white/10 hover:bg-white/15 active:scale-98 text-white/80 hover:text-white font-display font-medium text-xs backdrop-blur-md border border-white/10 transition cursor-pointer flex items-center justify-center"
            >
              {returnToBingo ? "← Back to Bingo" : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
