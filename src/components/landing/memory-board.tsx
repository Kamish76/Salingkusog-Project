"use client";

import { useState, useEffect } from "react";

export interface PostRecord {
  id: string;
  userId: string;
  displayName: string;
  collegeDept: string | null;
  imageUrl: string;
  caption: string | null;
  isBingoEntry: boolean;
  taskTitle: string | null;
  slotIndex: number | null;
  createdAt: string | Date;
}


interface MemoryBoardProps {
  posts: PostRecord[];
  isAuthenticated: boolean;
  onOpenUpload: (originRect?: { top: number; left: number; width: number; height: number }) => void;
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

export function MemoryBoard({ posts, isAuthenticated, onOpenUpload }: MemoryBoardProps) {
  // Track failed / missing images to exclude them from the memory board
  const [failedPostIds, setFailedPostIds] = useState<Set<string>>(new Set());

  // Only display posts that have a valid non-empty photo and have not failed to load
  const validPosts = posts.filter(
    (p) => Boolean(p.imageUrl && p.imageUrl.trim()) && !failedPostIds.has(p.id)
  );

  // Track natural image aspect ratio to adapt polaroid orientation (landscape vs portrait vs square)
  const [imageOrientations, setImageOrientations] = useState<
    Record<string, "portrait" | "landscape" | "square">
  >({});

  useEffect(() => {
    validPosts.forEach((p) => {
      if (p.imageUrl) {
        const img = new Image();
        const updateOrientation = () => {
          if (img.naturalWidth && img.naturalHeight) {
            const aspect = img.naturalWidth / img.naturalHeight;
            const orientation: "portrait" | "landscape" | "square" =
              aspect > 1.15 ? "landscape" : aspect < 0.88 ? "portrait" : "square";
            setImageOrientations((prev) => {
              if (prev[p.id] === orientation) return prev;
              return { ...prev, [p.id]: orientation };
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


  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* CLEAN SCRAPBOOK ACTION & TITLE BAR */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#e8ded5]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f5ece9] text-[#1e1b19] flex items-center justify-center border border-[#e8ded5]">
            <svg className="w-5 h-5 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-[#1e1b19] tracking-tight">
              Campus Memories
            </h2>
            <p className="font-body text-xs text-[#8e706c]">
              {validPosts.length} {validPosts.length === 1 ? "moment shared" : "moments shared"}
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onOpenUpload({ top: r.top, left: r.left, width: r.width, height: r.height });
          }}
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#1e1b19] focus-visible:outline-none sm:hover:active:scale-95 cursor-pointer ml-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Drop a Memory</span>
        </button>
      </div>

      {/* POLAROID MASONRY FEED OR EMPTY STATE */}
      {validPosts.length === 0 ? (
        <div className="w-full my-8 p-10 sm:p-16 rounded-2xl bg-white border border-[#e8ded5] text-center flex flex-col items-center justify-center relative overflow-hidden">
          {/* Top Washi Tape */}
          <div className="washi-tape-butter w-28 h-5 absolute -top-2 left-1/2 -translate-x-1/2 opacity-80"></div>

          <div className="w-16 h-16 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#8e706c]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>

          <h3 className="font-display font-extrabold text-xl sm:text-2xl text-[#1e1b19] tracking-tight">
            The memory well is waiting for its first snapshot
          </h3>

          <p className="font-body text-xs sm:text-sm text-[#5a413d] mt-2 max-w-md leading-relaxed">
            No memories have been dropped yet. Be the first student to toss an intramural photo or selfie into the memory well.
          </p>

          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onOpenUpload({ top: r.top, left: r.left, width: r.width, height: r.height });
            }}
            type="button"
            className="mt-6 px-6 py-3 rounded-lg bg-[#1e1b19] hover:bg-stone-800 text-white font-display font-bold text-xs transition sm:hover:active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Drop the First Memory</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-start">
          {validPosts.map((post, idx) => {
            const isLead = idx === 0 && validPosts.length > 1;
            const rotation = ROTATIONS[idx % ROTATIONS.length];
            const tapeClass = TAPES[idx % TAPES.length];


            const orientation = imageOrientations[post.id] || "landscape";
            const photoAspect = isLead ? "aspect-[16/10]" : PHOTO_ASPECTS[orientation];

            return (
              <div
                key={post.id}
                className={`scrapbook-card relative bg-white border border-[#e8ded5] rounded-xl p-3.5 pb-5 sm:p-4 sm:pb-6 flex flex-col justify-between ${isLead ? "sm:col-span-2 lg:col-span-2" : "col-span-1"} ${rotation}`}
              >
                {/* Washi Tape Strip */}
                <div
                  className={`${tapeClass} w-24 h-5 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90`}
                ></div>

                <div>
                  {/* Photo Thumbnail */}
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
                      <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-[#1e1b19]/85 text-white text-[11px] font-display font-medium">
                        Slot #{post.slotIndex !== null ? post.slotIndex + 1 : ""} • {post.taskTitle}
                      </span>
                    )}
                  </div>

                  {/* Author Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-sm text-[#1e1b19] leading-tight">
                        {post.displayName}
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

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
