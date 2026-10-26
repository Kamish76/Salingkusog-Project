"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { ModerationPostItem } from "@/app/actions/moderation";
import {
  hidePostAction,
  restorePostAction,
  deletePostPermanentlyAction,
  banUserFromModerationAction,
  getModerationPostsAction,
} from "@/app/actions/moderation";

export function ModerationClient({
  initialPosts,
}: {
  initialPosts: ModerationPostItem[];
}) {
  const [posts, setPosts] = useState<ModerationPostItem[]>(initialPosts);
  const [statusFilter, setStatusFilter] = useState<"all" | "flagged" | "published" | "hidden">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Refresh post list from server
  const refreshPosts = () => {
    startTransition(async () => {
      try {
        const fresh = await getModerationPostsAction({ status: "all", limit: 100 });
        setPosts(fresh);
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to refresh moderation queue.",
        });
      }
    });
  };

  // 1. Hide post handler
  const handleHide = (postId: string) => {
    setActionLoadingId(postId);
    setFeedback(null);

    startTransition(async () => {
      const res = await hidePostAction(postId, "Hidden by moderator in queue");
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: "hidden" } : p))
        );
        setFeedback({ type: "success", message: "Post hidden and linked raffle tickets disqualified." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to hide post." });
      }
      setActionLoadingId(null);
    });
  };

  // 2. Restore post handler
  const handleRestore = (postId: string) => {
    setActionLoadingId(postId);
    setFeedback(null);

    startTransition(async () => {
      const res = await restorePostAction(postId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: "published" } : p))
        );
        setFeedback({ type: "success", message: "Post restored to public feed." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to restore post." });
      }
      setActionLoadingId(null);
    });
  };

  // 3. Delete post permanently handler
  const handleDelete = (postId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this photo? This will purge the image from Neon S3 storage and remove all database records. This cannot be undone."
      )
    ) {
      return;
    }

    setActionLoadingId(postId);
    setFeedback(null);

    startTransition(async () => {
      const res = await deletePostPermanentlyAction(postId);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setFeedback({ type: "success", message: "Photo permanently purged from S3 and database." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to delete post." });
      }
      setActionLoadingId(null);
    });
  };

  // 4. Ban user handler
  const handleBanUser = (targetUserId: string, userName: string) => {
    const reason = window.prompt(
      `Enter reason for suspending ${userName}'s account:`,
      "Violation of intramural campus photo standards"
    );

    if (!reason || !reason.trim()) return;

    setActionLoadingId(targetUserId);
    setFeedback(null);

    startTransition(async () => {
      const res = await banUserFromModerationAction(targetUserId, reason.trim());
      if (res.success) {
        // Optimistically hide all posts from this user
        setPosts((prev) =>
          prev.map((p) =>
            p.userId === targetUserId ? { ...p, status: "hidden", userBanned: true } : p
          )
        );
        setFeedback({
          type: "success",
          message: `Account for ${userName} suspended. All user posts hidden and active raffle tickets disqualified.`,
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to suspend account." });
      }
      setActionLoadingId(null);
    });
  };

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    if (statusFilter !== "all" && post.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = post.userName.toLowerCase().includes(q);
      const matchEmail = post.userEmail.toLowerCase().includes(q);
      const matchCaption = (post.caption || "").toLowerCase().includes(q);
      const matchTask = (post.bingoTaskTitle || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchCaption || matchTask;
    }
    return true;
  });

  const flaggedCount = posts.filter((p) => p.status === "flagged").length;
  const hiddenCount = posts.filter((p) => p.status === "hidden").length;
  const publishedCount = posts.filter((p) => p.status === "published").length;

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-xs font-mono border flex items-center justify-between gap-3 shadow-md ${
            feedback.type === "success"
              ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/20 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === "success" ? "✓" : "⚠️"}</span>
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-500 hover:text-zinc-300 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Controls: Filter Pills & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "all"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <span>All Posts</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-900 border border-zinc-700">
              {posts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("flagged")}
            className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "flagged"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <span>Flagged by AI</span>
            {flaggedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse font-bold">
                {flaggedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("published")}
            className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "published"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <span>Published</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-900 border border-zinc-700">
              {publishedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("hidden")}
            className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "hidden"
                ? "bg-zinc-700 text-zinc-200 border-zinc-600 font-bold"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <span>Hidden</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-900 border border-zinc-700">
              {hiddenCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, email, or caption..."
            className="w-full md:w-72 px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 font-mono"
          />

          <button
            type="button"
            disabled={isPending}
            onClick={refreshPosts}
            title="Refresh queue"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-mono transition cursor-pointer disabled:opacity-50"
          >
            {isPending ? "..." : "⟳"}
          </button>
        </div>
      </div>

      {/* Photo Cards Grid */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-zinc-500 font-mono text-xs">
          No photo submissions found matching the current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => {
            const isLoading = actionLoadingId === post.id || actionLoadingId === post.userId;

            return (
              <div
                key={post.id}
                className={`rounded-2xl border transition overflow-hidden flex flex-col justify-between shadow-lg bg-zinc-900/60 ${
                  post.status === "flagged"
                    ? "border-rose-500/50 ring-1 ring-rose-500/30"
                    : post.status === "hidden"
                    ? "border-zinc-800 opacity-75"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {/* Photo Image Container */}
                <div className="relative w-full aspect-[4/3] bg-zinc-950 overflow-hidden">
                  <Image
                    src={post.imageUrl}
                    alt={post.caption || "Student upload"}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />

                  {/* Status Overlay Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide border shadow-sm ${
                        post.status === "flagged"
                          ? "bg-rose-500/90 text-white border-rose-400"
                          : post.status === "hidden"
                          ? "bg-zinc-900/90 text-zinc-400 border-zinc-700"
                          : "bg-emerald-600/90 text-white border-emerald-500"
                      }`}
                    >
                      {post.status}
                    </span>

                    {post.bingoTaskTitle && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900/90 text-amber-300 border border-zinc-700 truncate max-w-[160px]">
                        🎯 {post.bingoTaskTitle}
                      </span>
                    )}
                  </div>

                  {post.userBanned && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-950/90 text-rose-300 border border-rose-500">
                      BANNED ACCOUNT
                    </div>
                  )}
                </div>

                {/* Post Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Caption */}
                    <p className="text-xs text-zinc-200 line-clamp-2">
                      {post.caption || <span className="italic text-zinc-500">No caption provided</span>}
                    </p>

                    {/* Student Info */}
                    <div className="text-[11px] font-mono text-zinc-400 space-y-0.5 pt-1 border-t border-zinc-800/60">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-300 truncate max-w-[150px]">
                          {post.userName}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-zinc-500 truncate text-[10px]">{post.userEmail}</div>
                      {post.collegeDept && (
                        <div className="text-zinc-500 text-[10px]">{post.collegeDept}</div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
                    {post.status === "hidden" ? (
                      <button
                        type="button"
                        disabled={isLoading || isPending}
                        onClick={() => handleRestore(post.id)}
                        className="w-full py-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold transition cursor-pointer text-center disabled:opacity-50"
                      >
                        {isLoading ? "..." : "✓ Restore"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading || isPending}
                        onClick={() => handleHide(post.id)}
                        className="w-full py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold transition cursor-pointer text-center disabled:opacity-50"
                      >
                        {isLoading ? "..." : "⊘ Hide"}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isLoading || isPending}
                      onClick={() => handleDelete(post.id)}
                      className="w-full py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold transition cursor-pointer text-center disabled:opacity-50"
                    >
                      {isLoading ? "..." : "🗑 Purge S3"}
                    </button>

                    {!post.userBanned && (
                      <button
                        type="button"
                        disabled={isLoading || isPending}
                        onClick={() => handleBanUser(post.userId, post.userName)}
                        className="col-span-2 w-full py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-zinc-700 hover:border-rose-500/40 transition cursor-pointer text-center disabled:opacity-50"
                      >
                        {isLoading ? "..." : "⛔ Suspend Student Account"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
