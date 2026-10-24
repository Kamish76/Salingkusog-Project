"use client";

import { useState, useTransition, useEffect } from "react";
import type { PostRecord } from "@/components/landing/memory-board";
import { UploadMemoryModal, type BingoTaskOption, type OriginRect } from "@/components/landing/upload-memory-modal";
import { togglePostReactionAction } from "@/app/actions/posts";

interface PersonalGalleryViewProps {
  posts: PostRecord[];
  user: {
    id: string;
    name: string;
    email: string;
  };
  currentDay: number;
  bingoTasks: BingoTaskOption[];
}

const ROTATIONS = [
  "rotate-[-1.5deg]",
  "rotate-[1.5deg]",
  "rotate-[-1deg]",
  "rotate-[2deg]",
  "rotate-[-2deg]",
  "rotate-[1deg]",
];

const TAPES = ["washi-tape-coral", "washi-tape-sage", "washi-tape-butter"];

const PHOTO_ASPECTS: Record<"portrait" | "landscape" | "square", string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

function formatTimeAgo(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}

export function PersonalGalleryView({
  posts,
  user,
  currentDay,
  bingoTasks,
}: PersonalGalleryViewProps) {
  const [, startTransition] = useTransition();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadOriginRect, setUploadOriginRect] = useState<OriginRect | null>(null);

  // Dynamic aspect ratio calculation matching memory board
  const [imageOrientations, setImageOrientations] = useState<
    Record<string, "portrait" | "landscape" | "square">
  >({});

  useEffect(() => {
    posts.forEach((p) => {
      if (p.imageUrl) {
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
        img.src = p.imageUrl;
        if (img.complete) {
          updateOrientation();
        }
      }
    });
  }, [posts]);

  // Optimistic reactions tracker
  const [localReactions, setLocalReactions] = useState<
    Record<string, { heart: number; fire: number; trophy: number }>
  >({});

  const handleReact = (postId: string, type: "heart" | "fire" | "trophy") => {
    setLocalReactions((prev) => {
      const current = prev[postId] || {
        heart: posts.find((p) => p.id === postId)?.heartCount || 0,
        fire: posts.find((p) => p.id === postId)?.fireCount || 0,
        trophy: posts.find((p) => p.id === postId)?.trophyCount || 0,
      };
      return {
        ...prev,
        [postId]: {
          ...current,
          [type]: current[type] + 1,
        },
      };
    });

    startTransition(async () => {
      await togglePostReactionAction(postId, type);
    });
  };

  const handleOpenUpload = (e?: React.MouseEvent<HTMLElement>) => {
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
    setUploadOriginRect(null);
  };

  // Calculate totals
  const totalHearts = posts.reduce((sum, p) => sum + p.heartCount, 0);
  const totalFires = posts.reduce((sum, p) => sum + p.fireCount, 0);
  const totalTrophies = posts.reduce((sum, p) => sum + p.trophyCount, 0);
  const totalCheers = totalHearts + totalFires + totalTrophies;
  const bingoSnapsCount = posts.filter((p) => p.isBingoEntry).length;

  return (
    <div className="w-full flex flex-col gap-8">
      {/* ALBUM HEADER SECTION */}
      <section
        aria-label="Personal album summary"
        className="relative bg-white border border-[#e8ded5] rounded-2xl p-6 sm:p-8 overflow-hidden shadow-xs"
      >
        {/* Decorative corner washi tape */}
        <div className="washi-tape-coral w-24 h-4.5 absolute -top-1 right-8 rounded-xs opacity-80 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#f5ece9] border border-[#e8ded5] flex items-center justify-center text-2xl font-display font-extrabold text-[#ff5e4d] shrink-0 shadow-inner">
              {user.name ? user.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fbf2ee] text-[#b4281e] text-[11px] font-display font-bold uppercase tracking-wider mb-1">
                Student Keepsake Album
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#1e1b19] tracking-tight">
                {user.name}&apos;s Memories
              </h1>
              <p className="font-body text-xs sm:text-sm text-[#5a413d] mt-0.5">
                {user.email} • Salingkusog 2026
              </p>
            </div>
          </div>

          {/* Quick Metrics & Upload CTA */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-4 bg-[#fcf9f5] border border-[#e8ded5] rounded-xl px-4 py-2.5">
              <div className="text-center">
                <span className="block font-display font-black text-lg text-[#1e1b19] leading-none">
                  {posts.length}
                </span>
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8e706c]">
                  Snaps
                </span>
              </div>
              <div className="w-px h-6 bg-[#e8ded5]"></div>
              <div className="text-center">
                <span className="block font-display font-black text-lg text-[#ff5e4d] leading-none">
                  {bingoSnapsCount}
                </span>
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8e706c]">
                  Bingo
                </span>
              </div>
              <div className="w-px h-6 bg-[#e8ded5]"></div>
              <div className="text-center">
                <span className="block font-display font-black text-lg text-[#588157] leading-none">
                  {totalCheers}
                </span>
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8e706c]">
                  Cheers
                </span>
              </div>
            </div>

            <button
              onClick={handleOpenUpload}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#1e1b19] focus-visible:outline-none sm:hover:active:scale-95 cursor-pointer shadow-xs ml-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Drop a Memory</span>
            </button>
          </div>
        </div>
      </section>

      {/* POLAROID MASONRY GRID OR EMPTY ALBUM */}
      {posts.length === 0 ? (
        <section
          aria-label="Empty scrapbook notice"
          className="w-full my-8 p-10 sm:p-16 rounded-2xl bg-white border border-[#e8ded5] text-center flex flex-col items-center justify-center relative overflow-hidden"
        >
          {/* Top Washi Tape */}
          <div className="washi-tape-butter w-28 h-5 absolute -top-2 left-1/2 -translate-x-1/2 opacity-80 pointer-events-none"></div>

          <div className="w-16 h-16 rounded-2xl bg-[#fcf9f5] border border-[#e8ded5] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#8e706c]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>

          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#1e1b19] tracking-tight mb-2">
            Your Scrapbook is Empty
          </h2>
          <p className="font-body text-xs sm:text-sm text-[#5a413d] max-w-md leading-relaxed mb-6">
            Snap moments around the court, cheer for your college department, or complete 3×3 Bingo challenges to pin your polaroids here.
          </p>

          <button
            onClick={handleOpenUpload}
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1e1b19] hover:bg-stone-800 text-white font-display text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Drop Your First Memory</span>
          </button>
        </section>
      ) : (
        <section
          aria-label="Polaroid memory collection"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-start"
        >
          {posts.map((post, index) => {
            const rotation = ROTATIONS[index % ROTATIONS.length];
            const tapeClass = TAPES[index % TAPES.length];
            const reactions = localReactions[post.id] || {
              heart: post.heartCount,
              fire: post.fireCount,
              trophy: post.trophyCount,
            };

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
                  <div className="flex items-center justify-between mb-2">
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

                {/* Reaction Row */}
                <div className="mt-4 pt-3 border-t border-[#f5ece9] flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleReact(post.id, "heart")}
                    type="button"
                    aria-label={`Cheer with heart, count ${reactions.heart}`}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg bg-[#fbf2ee] hover:bg-[#ffdad5] text-[#b4281e] text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none sm:hover:active:scale-95 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span>{reactions.heart}</span>
                  </button>

                  <button
                    onClick={() => handleReact(post.id, "fire")}
                    type="button"
                    aria-label={`Cheer with fire, count ${reactions.fire}`}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg bg-[#fef5ec] hover:bg-[#ffe6cf] text-[#8e4e14] text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#f4a261] focus-visible:outline-none sm:hover:active:scale-95 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
                    </svg>
                    <span>{reactions.fire}</span>
                  </button>

                  <button
                    onClick={() => handleReact(post.id, "trophy")}
                    type="button"
                    aria-label={`Cheer with trophy, count ${reactions.trophy}`}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg bg-[#f2f8f2] hover:bg-[#d8edd8] text-[#588157] text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#588157] focus-visible:outline-none sm:hover:active:scale-95 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                    </svg>
                    <span>{reactions.trophy}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Upload Modal directly accessible from gallery */}
      <UploadMemoryModal
        isOpen={isUploadOpen}
        onClose={handleCloseUpload}
        originRect={uploadOriginRect}
        returnToBingo={false}
        isAuthenticated={true}
        currentDay={currentDay}
        bingoTasks={bingoTasks}
      />
    </div>
  );
}
