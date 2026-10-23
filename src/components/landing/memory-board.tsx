"use client";

import { useState } from "react";

interface MemoryPost {
  id: string;
  author: string;
  college: string;
  collegeColor: string;
  timeAgo: string;
  caption: string;
  slotBadge?: string;
  tapeColor: "coral" | "sage" | "butter";
  rotation: string;
  imageUrl: string;
  reactions: {
    heart: number;
    fire: number;
    trophy: number;
  };
}

const SAMPLE_MEMORIES: MemoryPost[] = [
  {
    id: "mem-1",
    author: "Maria Santos",
    college: "CEA Tigers",
    collegeColor: "bg-[#ffdad5] text-[#b4281e]",
    timeAgo: "3m ago",
    caption: "Day 1 parade opening was electrifying! Tigers cheering squad already taking over the grandstand! 🐅🎉",
    slotBadge: "Slot #1 • Parade Selfie",
    tapeColor: "coral",
    rotation: "rotate-[-1.5deg]",
    imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=700&q=80",
    reactions: { heart: 52, fire: 39, trophy: 28 },
  },
  {
    id: "mem-2",
    author: "Josh Reyes",
    college: "CAS Eagles",
    collegeColor: "bg-[#c1eebc] text-[#002106]",
    timeAgo: "7m ago",
    caption: "Met the campus mascot right by the oval! Managed to snap the Center Star selfie before the ballgames started! 🦅⭐",
    slotBadge: "Slot #4 • Mascot Star",
    tapeColor: "sage",
    rotation: "rotate-[1.8deg]",
    imageUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=700&q=80",
    reactions: { heart: 64, fire: 45, trophy: 31 },
  },
  {
    id: "mem-3",
    author: "Kenji & Squad",
    college: "CIT Knights",
    collegeColor: "bg-[#ffdcc4] text-[#6f3800]",
    timeAgo: "14m ago",
    caption: "5k Sunrise run was tough but the energy was unreal. Knights taking the early lead! 🏃🔥",
    slotBadge: "Slot #3 • 5k Sunrise",
    tapeColor: "butter",
    rotation: "rotate-[-1deg]",
    imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=700&q=80",
    reactions: { heart: 41, fire: 50, trophy: 19 },
  },
  {
    id: "mem-4",
    author: "Chloe David",
    college: "CBA Phoenix",
    collegeColor: "bg-[#ffdad5] text-[#b4281e]",
    timeAgo: "22m ago",
    caption: "Courtside volleyball cheering! Phoenix pride roaring loud in the gym. Let's bring home the cup! 🏆",
    slotBadge: "Slot #6 • Courtside Action",
    tapeColor: "coral",
    rotation: "rotate-[2deg]",
    imageUrl: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=700&q=80",
    reactions: { heart: 38, fire: 27, trophy: 44 },
  },
  {
    id: "mem-5",
    author: "Leo Cruz",
    college: "CAS Eagles",
    collegeColor: "bg-[#c1eebc] text-[#002106]",
    timeAgo: "35m ago",
    caption: "Food booth run with the crew. Support our local student vendor stalls near the quad! 🍢🥤",
    slotBadge: "Slot #2 • Food Booth Run",
    tapeColor: "sage",
    rotation: "rotate-[-2deg]",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=700&q=80",
    reactions: { heart: 29, fire: 18, trophy: 12 },
  },
  {
    id: "mem-6",
    author: "Bea Alcantara",
    college: "CEA Tigers",
    collegeColor: "bg-[#ffdad5] text-[#b4281e]",
    timeAgo: "48m ago",
    caption: "College banner painted and raised! Team spirit unmatched for Salingkusog 2026. 🎨✨",
    slotBadge: "Slot #7 • Banner & Chants",
    tapeColor: "butter",
    rotation: "rotate-[1.2deg]",
    imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=700&q=80",
    reactions: { heart: 57, fire: 33, trophy: 25 },
  },
];

const FILTER_OPTIONS = [
  { label: "All Moments", value: "all" },
  { label: "CEA Tigers 🐅", value: "CEA Tigers" },
  { label: "CAS Eagles 🦅", value: "CAS Eagles" },
  { label: "CIT Knights ⚔️", value: "CIT Knights" },
  { label: "CBA Phoenix 🔥", value: "CBA Phoenix" },
];

export function MemoryBoard() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [memories, setMemories] = useState(SAMPLE_MEMORIES);

  const filteredMemories =
    activeFilter === "all"
      ? memories
      : memories.filter((m) => m.college === activeFilter);

  const handleReaction = (id: string, type: "heart" | "fire" | "trophy") => {
    setMemories((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          reactions: {
            ...item.reactions,
            [type]: item.reactions[type] + 1,
          },
        };
      })
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* FILTER PILLS BAR */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          {FILTER_OPTIONS.map((filter) => {
            const isSelected = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
                className={`px-3.5 py-1.5 rounded-full font-medium transition-all duration-150 cursor-pointer text-xs select-none ${
                  isSelected
                    ? "bg-[#1e1b19] text-white shadow-xs scale-102"
                    : "bg-white text-[#5a413d] border border-[#e8ded5] hover:border-stone-400"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-[#8e706c] font-body">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>
            <strong className="text-[#1e1b19] font-bold">Live Stream</strong> • 7 photos tumbling in this hour
          </span>
        </div>
      </div>

      {/* POLAROID MEMORY BOARD MASONRY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-start">
        {filteredMemories.map((post) => {
          const tapeClass =
            post.tapeColor === "coral"
              ? "washi-tape-coral"
              : post.tapeColor === "sage"
              ? "washi-tape-sage"
              : "washi-tape-butter";

          return (
            <div
              key={post.id}
              className={`scrapbook-card relative bg-white border border-[#e8ded5] rounded-2xl shadow-polaroid p-3 pb-5 sm:p-4 sm:pb-6 flex flex-col justify-between ${post.rotation}`}
            >
              {/* Top Washi Tape Strip */}
              <div
                className={`${tapeClass} w-24 h-5 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90`}
              ></div>

              <div>
                {/* Photo Thumbnail */}
                <div className="aspect-[4/3] bg-stone-100 rounded-lg overflow-hidden mb-3 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.imageUrl}
                    alt={post.caption}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-103"
                  />
                  {post.slotBadge && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-stone-900/75 backdrop-blur-xs text-white text-[10px] font-display font-bold shadow-xs">
                      {post.slotBadge}
                    </span>
                  )}
                </div>

                {/* Author & College Tag */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="font-display font-bold text-sm text-[#1e1b19] leading-tight">
                      {post.author}
                    </span>
                    <span className="font-body text-[10px] text-[#8e706c]">
                      {post.timeAgo}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${post.collegeColor}`}
                  >
                    {post.college}
                  </span>
                </div>

                {/* Polaroid Caption */}
                <p className="font-body text-xs sm:text-[13px] text-[#5a413d] leading-relaxed">
                  {post.caption}
                </p>
              </div>

              {/* Reaction Stickers Row */}
              <div className="mt-4 pt-3 border-t border-[#f5ece9] flex items-center gap-2">
                <button
                  onClick={() => handleReaction(post.id, "heart")}
                  type="button"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fbf2ee] hover:bg-[#ffdad5] text-[#b4281e] text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <span>❤️</span>
                  <span>{post.reactions.heart}</span>
                </button>

                <button
                  onClick={() => handleReaction(post.id, "fire")}
                  type="button"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fbf2ee] hover:bg-[#ffdcc4] text-[#8e4e14] text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <span>🔥</span>
                  <span>{post.reactions.fire}</span>
                </button>

                <button
                  onClick={() => handleReaction(post.id, "trophy")}
                  type="button"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fbf2ee] hover:bg-[#c1eebc] text-[#0d3513] text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <span>🏆</span>
                  <span>{post.reactions.trophy}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
