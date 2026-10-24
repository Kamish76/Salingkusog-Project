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
      const aspect = processed.resizedWidth / processed.resizedHeight;
      setPreviewOrientation(aspect > 1.15 ? "landscape" : aspect < 0.88 ? "portrait" : "square");
    } catch (err: unknown) {
      console.error("Image processing failed:", err);
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        setPreviewOrientation(aspect > 1.15 ? "landscape" : aspect < 0.88 ? "portrait" : "square");
      };
      img.src = url;
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
      onTransitionEnd={handleModalTransitionEnd}
      style={{
        opacity: isExpanded ? 1 : 0,
        transition: "opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-4 sm:p-7 ${
        returnToBingo ? "bg-black/60" : "bg-black/75"
      } select-none overflow-y-auto`}
    >
      {/* Top Header */}
      <div
        style={controlsStyle}
        onClick={(e) => e.stopPropagation()}
        className="sticky top-0 z-10 w-full max-w-md flex items-center justify-between px-4 py-3 rounded-xl bg-[#1e1b19]/95 backdrop-blur-md border border-stone-800 text-white shadow-lg shrink-0"
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-800 text-stone-200 border border-stone-700">
            Day {currentDay} • {activeTask ? `Slot #${activeTask.slotIndex + 1}` : "Memory Well"}
          </span>
          <span className="font-display font-bold text-xs sm:text-sm text-white truncate">
            {activeTask ? activeTask.title : "Drop a Memory"}
          </span>
        </div>

        <button
          onClick={handleClose}
          type="button"
          aria-label="Close upload modal"
          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer shrink-0 ml-2"
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
            className="p-7 rounded-2xl bg-[#1e1b19] border border-stone-800 text-center flex flex-col items-center gap-3 text-white shadow-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h4 className="font-display font-bold text-base text-white">
              Sign in to Drop Memories
            </h4>
            <p className="font-body text-xs text-stone-300 max-w-xs">
              Sign in with your student Google account to upload photos, earn bingo stamps, and enter stage raffle drawings.
            </p>
            <button
              onClick={handleSignIn}
              type="button"
              className="mt-2 px-6 py-2.5 rounded-lg bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-xs transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
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
                className="px-4 py-2.5 rounded-xl bg-[#1e1b19] border border-stone-800 flex items-center gap-3 text-white shadow-md"
              >
                <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="12" cy="12" r="1" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-display font-bold text-xs text-emerald-300 block leading-tight truncate">
                    Target: Slot #{activeTask.slotIndex + 1} - {activeTask.title}
                  </span>
                  {activeTask.description && (
                    <span className="font-body text-[11px] text-stone-300 block leading-snug line-clamp-1">
                      {activeTask.description}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Photo Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={getCardAnimationStyles()}
              className={`relative w-full ${
                previewUrl ? PREVIEW_ASPECTS[previewOrientation] : "aspect-[4/3] sm:aspect-square max-h-[50vh]"
              } overflow-hidden shadow-2xl rounded-xl ring-1 ring-white/10 flex items-center justify-center cursor-pointer transition-colors group will-change-transform ${
                previewUrl
                  ? "bg-stone-950"
                  : isDragging
                  ? "bg-stone-800 ring-2 ring-[#ff5e4d]"
                  : "bg-[#1e1b19] hover:bg-stone-900 border border-dashed border-stone-700"
              }`}
            >
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-md bg-black/80 border border-white/20 text-white text-[11px] font-display font-medium flex items-center gap-1.5 shadow-md">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span>Tap to change</span>
                  </div>
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-[11px] font-display font-bold shadow-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Photo Selected</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-6 text-white">
                  <div className="w-14 h-14 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center mb-3 shadow-md">
                    <svg className="w-7 h-7 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                    </svg>
                  </div>
                  <span className="font-display font-bold text-sm text-white">
                    Tap to snap or upload photo
                  </span>
                  <span className="font-body text-xs text-stone-400 mt-1 max-w-xs leading-relaxed">
                    Intramurals selfie, cheering snapshot, or booth moment (auto-optimized)
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
                className="w-full px-4 py-2.5 rounded-lg bg-[#1e1b19] border border-stone-800 text-white placeholder:text-stone-500 text-xs font-body focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5e4d] shadow-sm"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 font-mono">
                {caption.length}/200
              </span>
            </div>

            {/* Bingo Task Selector */}
            {!preselectedTaskId && (
              <div style={controlsStyle}>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#1e1b19] border border-stone-800 text-white text-xs font-body focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5e4d] shadow-sm"
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
                className="rounded border-stone-700 text-[#ff5e4d] focus:ring-0 bg-stone-900"
              />
              <span className="font-body text-xs text-stone-400">
                Post anonymously (hides your name on the public board)
              </span>
            </label>
          </form>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div
        style={controlsStyle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md flex flex-col gap-2 shrink-0 pt-1"
      >
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs text-center font-body flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {successInfo && (
          <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs text-center font-body font-bold flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span>{successInfo}</span>
          </div>
        )}

        {isAuthenticated && (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleSubmit}
              type="button"
              disabled={submitting || !selectedFile}
              className="py-3 px-4 rounded-lg bg-[#ff5e4d] hover:bg-[#b4281e] disabled:opacity-40 text-white font-display font-bold text-xs shadow-md transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{submitting ? "Dropping..." : "Drop Into Well"}</span>
            </button>

            <button
              onClick={handleClose}
              type="button"
              aria-label={returnToBingo ? "Back to Bingo Card" : "Cancel"}
              className="py-3 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-display font-medium text-xs border border-stone-800 transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer flex items-center justify-center"
            >
              {returnToBingo ? "← Back to Bingo" : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
