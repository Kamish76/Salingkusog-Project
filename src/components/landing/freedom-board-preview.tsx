"use client";

import { useState } from "react";

interface FreedomPost {
  id: string;
  author: string;
  college: string;
  collegeColor: string;
  avatarBg: string;
  timeAgo: string;
  caption: string;
  slotBadge?: string;
  imageUrl?: string;
  reactions: {
    fire: number;
    trophy: number;
    electric: number;
  };
}

const SAMPLE_POSTS: FreedomPost[] = [
  {
    id: "post-1",
    author: "Maria Santos (CEA)",
    college: "CEA Tigers",
    collegeColor: "bg-[#e09f3e] text-[#452b00]",
    avatarBg: "bg-[#e09f3e]",
    timeAgo: "3m ago",
    caption: "Day 1 parade opening was electrifying! Tigers cheering squad already taking over the grandstand! 🐅🔥",
    slotBadge: "Slot #1: Morning Parade",
    reactions: { fire: 48, trophy: 23, electric: 35 },
  },
  {
    id: "post-2",
    author: "Josh R. (CAS)",
    college: "CAS Eagles",
    collegeColor: "bg-[#335c67] text-[#fff3b0]",
    avatarBg: "bg-[#335c67]",
    timeAgo: "8m ago",
    caption: "Ran into the University Mascot near the gym! Managed to snag the Center Star selfie! Row 2 completed let's go! 🌟🎟️",
    slotBadge: "Slot #4: Free Mascot Snap",
    reactions: { fire: 62, trophy: 41, electric: 50 },
  },
  {
    id: "post-3",
    author: "Kenji & Friends (CIT)",
    college: "CIT Knights",
    collegeColor: "bg-[#9e2a2b] text-[#fff3b0]",
    avatarBg: "bg-[#9e2a2b]",
    timeAgo: "14m ago",
    caption: "Food booth run during halftime break. Support the local vendor stalls at the oval! 🍢✨",
    slotBadge: "Slot #2: Food Booth Run",
    reactions: { fire: 29, trophy: 12, electric: 19 },
  },
  {
    id: "post-4",
    author: "Chloe D. (CBA)",
    college: "CBA Phoenix",
    collegeColor: "bg-[#e09f3e] text-[#452b00]",
    avatarBg: "bg-[#d5c4b1]",
    timeAgo: "22m ago",
    caption: "Courtside volleyball action. Salingkusog energy is unmatched this year! Let's bring home the championship cup! 🏆",
    reactions: { fire: 54, trophy: 37, electric: 28 },
  },
];

interface FreedomBoardPreviewProps {
  onInteract?: () => void;
}

export function FreedomBoardPreview({ onInteract }: FreedomBoardPreviewProps) {
  const [posts, setPosts] = useState(SAMPLE_POSTS);

  const handleReact = (postId: string, type: "fire" | "trophy" | "electric") => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          reactions: {
            ...p.reactions,
            [type]: p.reactions[type] + 1,
          },
        };
      })
    );

    if (onInteract) {
      onInteract();
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Freedom Board Section Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="text-[#e09f3e] text-base">📣</span>
            <h3 className="font-display text-lg sm:text-xl font-extrabold text-[#bfe9f7] tracking-tight">
              Freedom Board Live Feed
            </h3>
          </div>
          <p className="text-xs text-[#d5c4b1] mt-0.5">
            Real-time student shouts, verified selfie proofs, and campus reactions
          </p>
        </div>

        <span className="text-[11px] font-display font-semibold px-2.5 py-1 rounded-full bg-[#00232b] text-[#e09f3e] border border-[#335c67]/60">
          Live Sync
        </span>
      </div>

      {/* Posts Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-2xl bg-[#00232b]/85 border border-[#335c67]/50 p-4 shadow-lg backdrop-blur-sm flex flex-col justify-between hover:border-[#e09f3e]/40 transition duration-200"
          >
            <div>
              {/* Post Author Header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full ${post.avatarBg} flex items-center justify-center font-bold text-xs text-[#00161c] shadow-sm`}
                  >
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-display text-xs font-bold text-[#fff3b0] leading-none">
                      {post.author}
                    </h4>
                    <span className="text-[10px] text-[#d5c4b1]/70">{post.timeAgo}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-display font-bold px-2 py-0.5 rounded-full ${post.collegeColor}`}
                >
                  {post.college}
                </span>
              </div>

              {/* Slot Completion Badge (if linked to a bingo task) */}
              {post.slotBadge && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#001115]/60 border border-[#e09f3e]/30 text-[10px] text-[#e09f3e] font-display font-semibold mb-2">
                  <span>📸</span>
                  <span>{post.slotBadge}</span>
                </div>
              )}

              {/* Post Caption */}
              <p className="text-xs sm:text-[13px] text-[#bfe9f7]/90 leading-relaxed font-body">
                {post.caption}
              </p>
            </div>

            {/* Reaction Pills Row */}
            <div className="mt-3.5 pt-3 border-t border-[#335c67]/30 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleReact(post.id, "fire")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00161c] hover:bg-[#9e2a2b]/30 text-[#fff3b0] text-[11px] font-display transition active:scale-95 border border-[#335c67]/40 cursor-pointer"
              >
                <span>🔥</span>
                <span>{post.reactions.fire}</span>
              </button>

              <button
                type="button"
                onClick={() => handleReact(post.id, "trophy")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00161c] hover:bg-[#e09f3e]/30 text-[#fff3b0] text-[11px] font-display transition active:scale-95 border border-[#335c67]/40 cursor-pointer"
              >
                <span>🏆</span>
                <span>{post.reactions.trophy}</span>
              </button>

              <button
                type="button"
                onClick={() => handleReact(post.id, "electric")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00161c] hover:bg-[#335c67]/50 text-[#fff3b0] text-[11px] font-display transition active:scale-95 border border-[#335c67]/40 cursor-pointer"
              >
                <span>⚡</span>
                <span>{post.reactions.electric}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
