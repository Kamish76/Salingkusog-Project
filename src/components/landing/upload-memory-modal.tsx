"use client";

import { useState, useRef, type ChangeEvent, type FormEvent, type DragEvent } from "react";
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

interface UploadMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  currentDay: number;
  bingoTasks: BingoTaskOption[];
  preselectedTaskId?: string;
}

export function UploadMemoryModal({
  isOpen,
  onClose,
  isAuthenticated,
  currentDay,
  bingoTasks,
  preselectedTaskId,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preselectedTaskId when prop changes during render
  if (preselectedTaskId !== prevPreselectedTaskId) {
    setPrevPreselectedTaskId(preselectedTaskId);
    setSelectedTaskId(preselectedTaskId || "");
  }

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
        onClose();
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption("");
        setSuccessInfo(null);
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#e8ded5] shadow-polaroid p-6 sm:p-7 flex flex-col justify-between overflow-hidden animate-scaleIn max-h-[92vh] overflow-y-auto">
        {/* Top Washi Tape Strip */}
        <div className="washi-tape-coral w-32 h-5.5 absolute -top-2 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4 pt-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl text-[#1e1b19] tracking-tight">
                {activeTask ? "Upload Challenge Photo" : "Drop a Memory"}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fbf2ee] text-[#b4281e] uppercase tracking-wider">
                Photo Well
              </span>
            </div>
            <p className="font-body text-xs text-[#5a413d] mt-0.5">
              {activeTask
                ? `Submit photographic proof for Slot #${activeTask.slotIndex + 1}`
                : "Toss an intramural selfie, courtside cheer, or campus memory into the well."}
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Close upload modal"
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-bold transition cursor-pointer -mr-1 -mt-1"
          >
            ✕
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="my-6 p-6 rounded-2xl bg-[#fff8f5] border border-[#f4a261]/40 text-center flex flex-col items-center gap-3">
            <span className="text-3xl">🔒</span>
            <h4 className="font-display font-bold text-base text-[#1e1b19]">
              Sign in to Drop Memories
            </h4>
            <p className="font-body text-xs text-[#5a413d] max-w-xs">
              Sign in with your student Google account to upload photos, earn bingo stamps, and enter stage raffle drawings!
            </p>
            <button
              onClick={handleSignIn}
              type="button"
              className="mt-2 px-5 py-2.5 rounded-full bg-[#1e1b19] hover:bg-stone-800 text-white font-display font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
            >
              Sign in with Google →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Active Challenge Target Highlight */}
            {activeTask && (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#fff8f5] border border-[#f4a261]/40 flex items-start gap-3">
                <span className="text-2xl mt-0.5">🎯</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-display font-extrabold text-xs sm:text-sm text-[#8e4e14]">
                      Slot #{activeTask.slotIndex + 1}: {activeTask.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f4a261]/20 text-[#8e4e14] uppercase tracking-wide">
                      Bingo Slot
                    </span>
                  </div>
                  {activeTask.description && (
                    <p className="font-body text-xs text-[#5a413d] mt-1 leading-snug">
                      {activeTask.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Photo Dropzone / Camera Picker */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group ${
                isDragging
                  ? "border-[#ff5e4d] bg-[#fff5f3] scale-[1.01]"
                  : previewUrl
                  ? "border-[#e8ded5] bg-[#1e1b19]"
                  : "border-[#e8ded5] hover:border-[#ff5e4d] bg-[#fcf9f5] hover:bg-[#fffaf7]"
              }`}
            >
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                  />
                  <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-display font-bold shadow-xs">
                    Tap to change
                  </div>
                  <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-display font-bold text-xs">
                    Choose different photo
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-5">
                  <div className="w-12 h-12 rounded-full bg-white border border-[#e8ded5] flex items-center justify-center text-2xl mb-2 shadow-2xs group-hover:scale-105 transition-transform">
                    📷
                  </div>
                  <span className="font-display font-bold text-sm text-[#1e1b19]">
                    Tap to snap or upload photo
                  </span>
                  <span className="font-body text-[11px] text-[#8e706c] mt-0.5 max-w-xs">
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-display font-bold text-xs text-[#1e1b19]">
                  Caption
                </label>
                <span className="font-body text-[10px] text-[#8e706c]">
                  {caption.length}/200
                </span>
              </div>
              <input
                type="text"
                placeholder="Write a quick memory note or cheer..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] focus:outline-none focus:border-[#ff5e4d] text-xs font-body text-[#1e1b19] placeholder:text-[#8e706c]"
              />
            </div>

            {/* Bingo Task Selector (Only if not preselected from a slot) */}
            {!preselectedTaskId && (
              <div>
                <label className="block font-display font-bold text-xs text-[#1e1b19] mb-1">
                  Link to 3x3 Bingo Slot (Optional)
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] text-xs font-body text-[#1e1b19] focus:outline-none focus:border-[#ff5e4d]"
                >
                  <option value="">General Memory (No slot)</option>
                  {bingoTasks
                    .filter((t) => t.unlockDay <= currentDay)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        Slot #{t.slotIndex + 1}: {t.title}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Anonymous Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded text-[#ff5e4d] focus:ring-[#ff5e4d]"
              />
              <span className="font-body text-xs text-[#5a413d]">
                Post anonymously (hides your name on the public board)
              </span>
            </label>

            {/* Status alerts */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-body">
                ⚠️ {errorMessage}
              </div>
            )}

            {successInfo && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-body font-semibold">
                {successInfo}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedFile}
                className="w-full py-2.5 rounded-full bg-[#ff5e4d] hover:bg-[#b4281e] disabled:opacity-50 text-white font-display font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{submitting ? "Tumbling into well..." : "Drop Memory Into Well"}</span>
                <span>✨</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
