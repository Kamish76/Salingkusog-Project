"use client";

import { useState, useTransition } from "react";
import { togglePostReactionAction } from "@/app/actions/posts";

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
  heartCount: number;
  fireCount: number;
  trophyCount: number;
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
  const [, startTransition] = useTransition();

  // Optimistic reaction tracker
  const [localReactions, setLocalReactions] = useState<
    Record<string, { heart: number; fire: number; trophy: number }>
  >({});

  const handleReact = (postId: string, type: "heart" | "fire" | "trophy") => {
    if (!isAuthenticated) {
      alert("Please sign in with Google to react to student photos!");
      return;
    }

    // Optimistic bump
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

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* CLEAN SCRAPBOOK ACTION & TITLE BAR */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-[#e8ded5]/70">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📸</span>
          <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#1e1b19] tracking-tight">
            Campus Memories
          </h2>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#e8ded5] text-[#8e706c] shadow-2xs">
            {posts.length} {posts.length === 1 ? "snap" : "snaps"}
          </span>
        </div>

        <button
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onOpenUpload({ top: r.top, left: r.left, width: r.width, height: r.height });
          }}
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer ml-auto"
        >
          <span>＋</span>
          <span>Drop a Memory</span>
        </button>
      </div>

      {/* POLAROID MASONRY FEED OR EMPTY STATE */}
      {posts.length === 0 ? (
        <div className="w-full my-8 p-10 sm:p-16 rounded-3xl bg-white border border-[#e8ded5] shadow-scrapbook text-center flex flex-col items-center justify-center relative overflow-hidden">
          {/* Top Washi Tape */}
          <div className="washi-tape-butter w-28 h-5 absolute -top-2 left-1/2 -translate-x-1/2 opacity-80"></div>

          <div className="w-16 h-16 rounded-full bg-[#fcf9f5] border border-[#e8ded5] flex items-center justify-center text-3xl mb-3 shadow-xs">
            📷
          </div>

          <h3 className="font-display font-extrabold text-xl sm:text-2xl text-[#1e1b19] tracking-tight">
            The memory well is waiting for its first snapshot
          </h3>

          <p className="font-body text-xs sm:text-sm text-[#5a413d] mt-1.5 max-w-md leading-relaxed">
            No memories have been dropped yet. Be the first student to toss an intramural photo or selfie into the memory well!
          </p>

          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onOpenUpload({ top: r.top, left: r.left, width: r.width, height: r.height });
            }}
            type="button"
            className="mt-6 px-6 py-2.5 rounded-full bg-[#1e1b19] hover:bg-stone-800 text-white font-display font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>Drop the First Memory</span>
            <span>✨</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-start">
          {posts.map((post, idx) => {
            const rotation = ROTATIONS[idx % ROTATIONS.length];
            const tapeClass = TAPES[idx % TAPES.length];

            const reactions = localReactions[post.id] || {
              heart: post.heartCount,
              fire: post.fireCount,
              trophy: post.trophyCount,
            };

            return (
              <div
                key={post.id}
                className={`scrapbook-card relative bg-white border border-[#e8ded5] rounded-2xl shadow-polaroid p-3 pb-5 sm:p-4 sm:pb-6 flex flex-col justify-between ${rotation}`}
              >
                {/* Washi Tape Strip */}
                <div
                  className={`${tapeClass} w-24 h-5 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90`}
                ></div>

                <div>
                  {/* Photo Thumbnail */}
                  <div className="aspect-[4/3] bg-stone-100 rounded-lg overflow-hidden mb-3 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.imageUrl}
                      alt={post.caption || "Student memory"}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-103"
                    />
                    {post.taskTitle && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-stone-900/75 backdrop-blur-xs text-white text-[10px] font-display font-bold shadow-xs">
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
                      <span className="font-body text-[10px] text-[#8e706c]">
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
                <div className="mt-4 pt-3 border-t border-[#f5ece9] flex items-center gap-2">
                  <button
                    onClick={() => handleReact(post.id, "heart")}
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fbf2ee] hover:bg-[#ffdad5] text-[#b4281e] text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <span>❤️</span>
                    <span>{reactions.heart}</span>
                  </button>

                  <button
                    onClick={() => handleReact(post.id, "fire")}
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fbf2ee] hover:bg-[#ffdcc4] text-[#8e4e14] text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <span>🔥</span>
                    <span>{reactions.fire}</span>
                  </button>

                  <button
                    onClick={() => handleReact(post.id, "trophy")}
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fbf2ee] hover:bg-[#c1eebc] text-[#0d3513] text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <span>🏆</span>
                    <span>{reactions.trophy}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
