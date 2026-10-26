"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ROTATIONS, TAPES, PHOTO_ASPECTS, formatTimeAgo } from "@/lib/polaroid";
import type { PostRecord } from "@/components/landing/memory-board";
import { UploadMemoryModal, type OriginRect } from "@/components/landing/upload-memory-modal";
import type { BingoTaskItem, UserProgressItem } from "@/components/landing/floating-bingo-modal";
import { exportRecaptchaBingoCard } from "@/lib/export-recaptcha-card";

interface PersonalGalleryViewProps {
  posts: PostRecord[];
  user: {
    id: string;
    name: string;
    email: string;
  };
  currentDay: number;
  tasks: BingoTaskItem[];
  userProgress: UserProgressItem[];
}

export function PersonalGalleryView({
  posts,
  user,
  currentDay,
  tasks,
  userProgress,
}: PersonalGalleryViewProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [preselectedTaskId, setPreselectedTaskId] = useState<string | undefined>(undefined);
  const [uploadOriginRect, setUploadOriginRect] = useState<OriginRect | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Track failed / missing images to exclude them from the album
  const [failedPostIds, setFailedPostIds] = useState<Set<string>>(new Set());

  // Only display posts that have a valid non-empty photo and have not failed to load
  const validPosts = useMemo(
    () =>
      posts.filter(
        (p) => Boolean(p.imageUrl && p.imageUrl.trim()) && !failedPostIds.has(p.id)
      ),
    [posts, failedPostIds]
  );

  // Dynamic aspect ratio calculation matching memory board
  const [imageOrientations, setImageOrientations] = useState<
    Record<string, "portrait" | "landscape" | "square">
  >({});
  const probedImageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    validPosts.forEach((p) => {
      if (p.imageUrl && !probedImageIds.current.has(p.id)) {
        probedImageIds.current.add(p.id);
        const img = new Image();
        const updateOrientation = () => {
          if (img.naturalWidth && img.naturalHeight) {
            const aspect = img.naturalWidth / img.naturalHeight;
            const detected: "portrait" | "landscape" | "square" =
              aspect > 1.15 ? "landscape" : aspect < 0.88 ? "portrait" : "square";
            setImageOrientations((prev) => {
              if (prev[p.id] === detected) return prev;
              return { ...prev, [p.id]: detected };
            });
          }
        };
        img.onload = updateOrientation;
        img.onerror = () => {
          setFailedPostIds((prev) => {
            if (prev.has(p.id)) return prev;
            const next = new Set(prev);
            next.add(p.id);
            return next;
          });
        };
        img.src = p.imageUrl;
        if (img.complete) {
          updateOrientation();
        }
      }
    });
  }, [validPosts]);

  const handleOpenUpload = (taskId?: string, e?: React.MouseEvent<HTMLElement>) => {
    setPreselectedTaskId(taskId);
    if (e) {
      const r = e.currentTarget.getBoundingClientRect();
      setUploadOriginRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setUploadOriginRect(null);
    }
    setIsUploadOpen(true);
  };

  const handleCloseUpload = () => {
    setIsUploadOpen(false);
    setPreselectedTaskId(undefined);
    setUploadOriginRect(null);
  };

  // Map progress by slot index
  const progressBySlot = new Map(userProgress.map((p) => [p.slotIndex, p]));
  const completedCount = progressBySlot.size;


  /**
   * Export the 3x3 Bingo Card as a 2400x2800 high-resolution PNG image
   */
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

  return (
    <div className="w-full flex flex-col gap-10">
      {/* 1. ALBUM HEADER SECTION */}
      <section
        aria-label="Personal album summary"
        className="relative bg-white border border-[#e8ded5] rounded-2xl p-4 sm:p-8 overflow-hidden shadow-xs"
      >
        {/* Decorative corner washi tape */}
        <div className="washi-tape-coral w-24 h-4.5 absolute -top-1 right-8 rounded-xs opacity-80 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#f5ece9] border border-[#e8ded5] flex items-center justify-center text-xl sm:text-2xl font-display font-extrabold text-[#ff5e4d] shrink-0 shadow-inner">
              {user.name ? user.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fbf2ee] text-[#b4281e] text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-wider mb-1">
                Student Keepsake Album
              </div>
              <h1 className="text-xl sm:text-3xl font-display font-extrabold text-[#1e1b19] tracking-tight">
                {user.name}&apos;s Memories
              </h1>
              <p className="font-body text-xs sm:text-sm text-[#5a413d] mt-0.5 truncate max-w-[240px] sm:max-w-none">
                {user.email} • Salingkusog 2026
              </p>
            </div>
          </div>

          {/* Quick Metrics & Upload CTA */}
          <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-3 sm:gap-4 bg-[#fcf9f5] border border-[#e8ded5] rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5">
              <div className="text-center">
                <span className="block font-display font-black text-base sm:text-lg text-[#1e1b19] leading-none">
                  {validPosts.length}
                </span>
                <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-[#8e706c]">
                  Snaps
                </span>
              </div>
              <div className="w-px h-6 bg-[#e8ded5]"></div>
              <div className="text-center">
                <span className="block font-display font-black text-base sm:text-lg text-[#ff5e4d] leading-none">
                  {completedCount} / 9
                </span>
                <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-[#8e706c]">
                  Bingo
                </span>
              </div>
            </div>

            <button
              onClick={(e) => handleOpenUpload(undefined, e)}
              type="button"
              className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 min-h-[40px] rounded-xl bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#1e1b19] focus-visible:outline-none active:scale-95 cursor-pointer shadow-xs ml-auto"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Drop a Memory</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE 3x3 BINGO CARD WITH HIGH-RES PNG EXPORT */}
      <section
        aria-label="My 3x3 Bingo Card"
        className="relative bg-white border border-[#e8ded5] rounded-2xl p-4 sm:p-8 overflow-hidden shadow-xs"
      >
        {/* Top Washi Tape */}
        <div className="washi-tape-butter w-32 h-5 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-xs opacity-90 pointer-events-none"></div>

        {/* Section Header with Export Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-[#e8ded5]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#fbf2ee] text-[#b4281e] border border-[#ffdcc4]">
                Day {currentDay} • Active Rally
              </span>
              <span className="text-xs text-[#8e706c] font-body">
                {completedCount} of 9 stamped
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-display font-extrabold text-[#1e1b19] tracking-tight mt-1">
              My 3×3 Bingo Rally Card
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {exportError && (
              <span className="text-xs text-rose-600 font-body">{exportError}</span>
            )}
            <button
              onClick={handleExportBingoCard}
              disabled={isExporting}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 min-h-[44px] rounded-xl bg-[#1e1b19] hover:bg-stone-800 disabled:bg-stone-400 text-white font-display text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer shadow-xs active:scale-95 shrink-0 w-full sm:w-auto"
            >
              {isExporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Generating High-Res PNG...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Export Card (PNG)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3x3 Card Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 9 }).map((_, slotIndex) => {
            const task = tasks.find((t) => t.slotIndex === slotIndex);
            const progress = progressBySlot.get(slotIndex);
            const isUnlocked = (task?.unlockDay || 1) <= currentDay;

            if (progress && progress.imageUrl) {
              return (
                <div
                  key={slotIndex}
                  className="group relative bg-[#fcf9f5] border-2 border-emerald-300 rounded-xl p-3 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xs transition"
                >
                  <div className="aspect-[4/3] w-full rounded-lg bg-stone-100 overflow-hidden relative mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={progress.imageUrl}
                      alt={task?.title || "Bingo submission"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                      Slot #{slotIndex + 1}
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                      <span>✓</span>
                      <span>STAMPED</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-display font-bold text-xs text-[#1e1b19] truncate">
                      {task?.title || `Slot #${slotIndex + 1}`}
                    </span>
                    <button
                      onClick={(e) => handleOpenUpload(task?.id, e)}
                      type="button"
                      aria-label={`Replace photo for ${task?.title || "slot"}`}
                      className="text-xs font-display font-bold text-[#8e4e14] hover:text-[#ff5e4d] underline cursor-pointer shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-end p-1"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={slotIndex}
                className={`relative rounded-xl p-3.5 sm:p-4 border border-dashed flex flex-col justify-between min-h-[170px] ${
                  isUnlocked
                    ? "bg-[#fcf9f5] border-[#ded2c7] hover:border-[#ff5e4d]/60 transition"
                    : "bg-stone-50 border-stone-200 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-display font-bold text-xs text-[#8e4e14]">
                      Slot #{slotIndex + 1}
                    </span>
                    <span className="text-[10px] font-body text-stone-500 uppercase tracking-wider">
                      {task?.category || "Challenge"}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-sm text-[#1e1b19] leading-snug">
                    {task?.title || `Challenge Slot #${slotIndex + 1}`}
                  </h3>
                  {task?.description && (
                    <p className="font-body text-[11px] text-[#5a413d] mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-[#e8ded5]/60 flex items-center justify-between">
                  {isUnlocked ? (
                    <button
                      onClick={(e) => handleOpenUpload(task?.id, e)}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#1e1b19] focus-visible:outline-none cursor-pointer active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span>Drop Photo</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-body font-semibold text-stone-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      <span>Unlocks Day {task?.unlockDay}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. POLAROID MASONRY GRID OR EMPTY ALBUM */}
      <section aria-label="Individual keepsakes">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-display font-extrabold text-[#1e1b19] tracking-tight">
              Individual Keepsake Snaps
            </h2>
            <p className="font-body text-xs text-[#8e706c]">
              {validPosts.length} {validPosts.length === 1 ? "polaroid pinned" : "polaroids pinned"}
            </p>
          </div>
        </div>

        {validPosts.length === 0 ? (
          <div className="w-full my-4 p-10 sm:p-14 rounded-2xl bg-white border border-[#e8ded5] text-center flex flex-col items-center justify-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-[#fcf9f5] border border-[#e8ded5] flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-[#8e706c]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>

            <h3 className="font-display font-bold text-lg text-[#1e1b19] mb-1">
              No photos uploaded yet
            </h3>
            <p className="font-body text-xs text-[#5a413d] max-w-sm mb-4">
              Upload photos from the memory board or complete 3×3 Bingo challenges to pin your polaroids here.
            </p>

            <button
              onClick={(e) => handleOpenUpload(undefined, e)}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e1b19] hover:bg-stone-800 text-white font-display text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <span>Drop a Memory</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-start">
            {validPosts.map((post, index) => {
              const rotation = ROTATIONS[index % ROTATIONS.length];
              const tapeClass = TAPES[index % TAPES.length];
              const orientation = imageOrientations[post.id] || "landscape";
              const photoAspect = PHOTO_ASPECTS[orientation];

              return (
                <article
                  key={post.id}
                  className={`scrapbook-card relative bg-white border border-[#e8ded5] rounded-xl p-3.5 pb-5 sm:p-4 sm:pb-6 flex flex-col justify-between col-span-1 ${rotation}`}
                >
                  {/* Washi Tape Strip */}
                  <div
                    className={`${tapeClass} w-24 h-5 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90`}
                  ></div>

                  <div>
                    {/* Photo Frame */}
                    <div className={`${photoAspect} bg-stone-100 rounded-lg overflow-hidden mb-3 relative transition-[aspect-ratio] duration-300`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.imageUrl}
                        alt={post.caption || "Student memory"}
                        loading="lazy"
                        onError={() => {
                          setFailedPostIds((prev) => {
                            if (prev.has(post.id)) return prev;
                            const next = new Set(prev);
                            next.add(post.id);
                            return next;
                          });
                        }}
                        onLoad={(e) => {
                          const target = e.currentTarget;
                          if (target.naturalWidth && target.naturalHeight) {
                            const aspect = target.naturalWidth / target.naturalHeight;
                            const detected: "portrait" | "landscape" | "square" =
                              aspect > 1.15 ? "landscape" : aspect < 0.88 ? "portrait" : "square";
                            setImageOrientations((prev) => {
                              if (prev[post.id] === detected) return prev;
                              return { ...prev, [post.id]: detected };
                            });
                          }
                        }}
                        className="w-full h-full object-cover select-none"
                      />

                      {post.taskTitle && (
                        <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-[#1e1b19]/85 text-white text-[11px] font-display font-medium backdrop-blur-xs">
                          Slot #{post.slotIndex !== null ? post.slotIndex + 1 : ""} • {post.taskTitle}
                        </span>
                      )}
                    </div>

                    {/* Header / Timestamp */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex flex-col">
                        <span className="font-display font-bold text-sm text-[#1e1b19] leading-tight">
                          {post.collegeDept ? post.collegeDept : "Salingkusog Memory"}
                        </span>
                        <span className="font-body text-[11px] text-[#8e706c]">
                          {formatTimeAgo(post.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Caption */}
                    {post.caption && (
                      <p className="font-body text-xs sm:text-[13px] text-[#5a413d] leading-relaxed">
                        {post.caption}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Upload Modal directly accessible from gallery slots */}
      <UploadMemoryModal
        isOpen={isUploadOpen}
        onClose={handleCloseUpload}
        originRect={uploadOriginRect}
        returnToBingo={false}
        isAuthenticated={true}
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
