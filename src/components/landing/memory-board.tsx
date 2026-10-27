"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ROTATIONS, TAPES, PHOTO_ASPECTS, formatTimeAgo } from "@/lib/polaroid";
import { deleteStudentPostAction, loadMorePostsAction } from "@/app/actions/posts";
import { ReportPhotoModal } from "@/components/legal/report-photo-modal";
import { RealtimePostsProvider } from "./realtime-posts-provider";
import { useLiveQuery } from "@neon/realtime-react";
import type { SealedLiveQuery } from "@neon/realtime/client";

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

interface LiveSubscriberProps {
  sealedQuery: SealedLiveQuery<PostRecord>;
  onLivePosts: (posts: readonly PostRecord[]) => void;
}

function LiveMemoryBoardSubscriber({ sealedQuery, onLivePosts }: LiveSubscriberProps) {
  const refreshQuery = useCallback(async () => {
    const res = await fetch("/api/realtime/posts", { method: "POST" });
    if (!res.ok) throw new Error("Failed to renew live posts query");
    return (await res.json()) as SealedLiveQuery<PostRecord>;
  }, []);

  const { data, error } = useLiveQuery(sealedQuery, { refreshQuery });

  useEffect(() => {
    if (data && data.length > 0) {
      onLivePosts(data);
    }
  }, [data, onLivePosts]);

  if (error) {
    console.warn("Neon Realtime notice:", error);
  }

  return null;
}

interface MemoryBoardProps {
  posts: PostRecord[];
  sealedPostsQuery?: SealedLiveQuery<PostRecord> | null;
  isAuthenticated: boolean;
  currentUserId?: string;
  onOpenUpload: (originRect?: { top: number; left: number; width: number; height: number }) => void;
  onOpenBingo?: () => void;
}

export function MemoryBoard({
  posts,
  sealedPostsQuery,
  currentUserId,
  onOpenUpload,
  onOpenBingo,
}: MemoryBoardProps) {
  // Prepended realtime posts and dynamically loaded older posts
  const [prependedPosts, setPrependedPosts] = useState<PostRecord[]>([]);
  const [appendedPosts, setAppendedPosts] = useState<PostRecord[]>([]);
  const [pendingRealtimePosts, setPendingRealtimePosts] = useState<PostRecord[]>([]);
  const [remotelyDeletedIds, setRemotelyDeletedIds] = useState<Set<string>>(new Set());
  const lastLiveRowIdsRef = useRef<Set<string> | null>(null);

  // Combined posts stream
  const allPosts = useMemo(() => {
    const map = new Map<string, PostRecord>();
    for (const p of prependedPosts) {
      map.set(p.id, p);
    }
    for (const p of posts) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    for (const p of appendedPosts) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  }, [prependedPosts, posts, appendedPosts]);

  // Keyset pagination / infinite scroll state
  const [hasMore, setHasMore] = useState<boolean>(posts.length >= 10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Handle incoming live rows from Neon Realtime
  const handleLivePostsUpdate = useCallback(
    (liveRows: readonly PostRecord[]) => {
      if (!liveRows) return;

      const liveIds = new Set(liveRows.map((r) => r.id));

      // Reconcile deletions / moderations: if a post was previously in the live top-window
      // but is now absent from liveRows, mark it as remotely deleted.
      if (lastLiveRowIdsRef.current) {
        const deletedIds: string[] = [];
        for (const prevId of lastLiveRowIdsRef.current) {
          if (!liveIds.has(prevId)) {
            deletedIds.push(prevId);
          }
        }
        if (deletedIds.length > 0) {
          setRemotelyDeletedIds((prev) => {
            const next = new Set(prev);
            deletedIds.forEach((id) => next.add(id));
            return next;
          });
        }
      }
      lastLiveRowIdsRef.current = liveIds;

      if (liveRows.length === 0) return;

      const isScrolledDown = typeof window !== "undefined" && window.scrollY > 200;

      const knownIds = new Set([
        ...posts.map((p) => p.id),
        ...prependedPosts.map((p) => p.id),
        ...appendedPosts.map((p) => p.id),
      ]);

      const incomingNew = liveRows.filter((row) => !knownIds.has(row.id));

      if (incomingNew.length > 0) {
        if (isScrolledDown) {
          setPendingRealtimePosts((curr) => {
            const pendingIds = new Set(curr.map((p) => p.id));
            const toAdd = incomingNew.filter((p) => !pendingIds.has(p.id));
            return [...toAdd, ...curr];
          });
        } else {
          setPrependedPosts((prev) => {
            const prevIds = new Set(prev.map((p) => p.id));
            const uniqueToAdd = incomingNew.filter((p) => !prevIds.has(p.id));
            return [...uniqueToAdd, ...prev];
          });
        }
      }
    },
    [posts, prependedPosts, appendedPosts]
  );

  const handleShowPendingPosts = useCallback(() => {
    if (pendingRealtimePosts.length === 0) return;
    setPrependedPosts((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      const toPrepend = pendingRealtimePosts.filter((p) => !existing.has(p.id));
      return [...toPrepend, ...prev];
    });
    setPendingRealtimePosts([]);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pendingRealtimePosts]);

  // Auto-reveal pending posts when user scrolls back to the very top
  useEffect(() => {
    if (pendingRealtimePosts.length === 0) return;
    const handleScroll = () => {
      if (window.scrollY < 60) {
        handleShowPendingPosts();
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pendingRealtimePosts.length, handleShowPendingPosts]);

  // Dynamic infinite scroll load more
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || allPosts.length === 0) return;
    setIsLoadingMore(true);

    const oldestPost = allPosts[allPosts.length - 1];
    if (!oldestPost) {
      setIsLoadingMore(false);
      return;
    }

    const cursorCreatedAt =
      typeof oldestPost.createdAt === "string"
        ? oldestPost.createdAt
        : oldestPost.createdAt.toISOString();
    const cursorId = oldestPost.id;

    try {
      const res = await loadMorePostsAction(cursorCreatedAt, cursorId, 10);
      if (res.success && res.posts) {
        if (!res.hasMore || res.posts.length < 10) {
          setHasMore(false);
        }
        if (res.posts.length > 0) {
          setAppendedPosts((prev) => {
            const existing = new Set([
              ...prev.map((p) => p.id),
              ...posts.map((p) => p.id),
              ...prependedPosts.map((p) => p.id),
            ]);
            const uniqueNew = res.posts.filter((p) => !existing.has(p.id));
            return [...prev, ...uniqueNew];
          });
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more posts:", err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, allPosts, posts, prependedPosts]);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoadingMore]);

  // Track failed / missing images to exclude them from the memory board
  const [failedPostIds, setFailedPostIds] = useState<Set<string>>(new Set());

  // Selected post for Expanded Polaroid Modal
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [modalOriginRect, setModalOriginRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);

  // Deletion states
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<Set<string>>(new Set());
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Only display posts that have a valid non-empty photo, have not failed to load, and haven't been deleted
  const validPosts = useMemo(
    () =>
      allPosts.filter(
        (p) =>
          Boolean(p.imageUrl && p.imageUrl.trim()) &&
          !failedPostIds.has(p.id) &&
          !locallyDeletedIds.has(p.id) &&
          !remotelyDeletedIds.has(p.id)
      ),
    [allPosts, failedPostIds, locallyDeletedIds, remotelyDeletedIds]
  );

  // Track natural image aspect ratio to adapt polaroid orientation (landscape vs portrait vs square)
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

  const handleOpenDetail = (
    post: PostRecord,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setModalOriginRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    setSelectedPost(post);
    setIsConfirmingDelete(false);
    setDeleteError(null);
    setIsModalClosing(false);
    setIsModalExpanded(false);
  };

  useEffect(() => {
    if (selectedPost && !isModalClosing) {
      const raf = requestAnimationFrame(() => {
        setIsModalExpanded(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [selectedPost, isModalClosing]);

  const handleCloseDetail = useCallback(() => {
    if (isModalClosing) return;
    setIsModalClosing(true);
    setIsModalExpanded(false);
  }, [isModalClosing]);

  const handleModalTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && isModalClosing) {
      setSelectedPost(null);
      setModalOriginRect(null);
      setIsModalClosing(false);
      setIsConfirmingDelete(false);
      setDeleteError(null);
    }
  };

  useEffect(() => {
    if (!selectedPost) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseDetail();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPost, handleCloseDetail]);

  const handleDeletePost = async () => {
    if (!selectedPost || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteStudentPostAction(selectedPost.id);
      if (!res.success) {
        setDeleteError(res.error || "Failed to delete post");
        setIsDeleting(false);
        return;
      }
      setLocallyDeletedIds((prev) => new Set(prev).add(selectedPost.id));
      handleCloseDetail();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const getModalAnimationStyles = (): React.CSSProperties => {
    if (!modalOriginRect || typeof window === "undefined") {
      return {
        transform: isModalExpanded ? "scale(1)" : "scale(0.88)",
        opacity: isModalExpanded ? 1 : 0,
        transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease",
      };
    }

    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const sourceCenterX = modalOriginRect.left + modalOriginRect.width / 2;
    const sourceCenterY = modalOriginRect.top + modalOriginRect.height / 2;

    const deltaX = sourceCenterX - viewportCenterX;
    const deltaY = sourceCenterY - viewportCenterY;
    const targetWidth = Math.min(window.innerWidth - 32, 512);
    const scale = Math.max(0.18, Math.min(1, modalOriginRect.width / targetWidth));

    if (!isModalExpanded) {
      return {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`,
        borderRadius: "16px",
        transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms ease, opacity 250ms ease",
      };
    }

    return {
      transform: "translate3d(0, 0, 0) scale(1)",
      borderRadius: "20px",
      transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms ease, opacity 250ms ease",
    };
  };



  const isRealtimeActive = Boolean(
    sealedPostsQuery && process.env.NEXT_PUBLIC_NEON_REALTIME_URL
  );

  return (
    <RealtimePostsProvider>
      {isRealtimeActive && sealedPostsQuery && (
        <LiveMemoryBoardSubscriber
          sealedQuery={sealedPostsQuery}
          onLivePosts={handleLivePostsUpdate}
        />
      )}

      {/* FLOATING REALTIME PILL */}
      {pendingRealtimePosts.length > 0 && (
        <div className="sticky top-20 z-40 flex justify-center w-full pointer-events-none -mb-3">
          <button
            onClick={handleShowPendingPosts}
            type="button"
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <svg className="w-3.5 h-3.5 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
            </svg>
            <span>
              {pendingRealtimePosts.length} new {pendingRealtimePosts.length === 1 ? "memory" : "memories"} shared · View
            </span>
          </button>
        </div>
      )}

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
              {validPosts.length} {validPosts.length === 1 ? "moment shared" : "moments shared"} from the rally
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {onOpenBingo && (
            <button
              onClick={onOpenBingo}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 min-h-[40px] rounded-lg bg-white hover:bg-[#fdfbf9] text-[#1e1b19] border border-[#e8ded5] font-display text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none active:scale-95 cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4 text-[#ff5e4d] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
              </svg>
              <span>View 3×3 Tasks</span>
            </button>
          )}

          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onOpenUpload({ top: r.top, left: r.left, width: r.width, height: r.height });
            }}
            type="button"
            className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 min-h-[40px] rounded-lg bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#1e1b19] focus-visible:outline-none active:scale-95 cursor-pointer shrink-0 shadow-2xs"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Upload Rally Photo</span>
          </button>
        </div>
      </div>

      {/* POLAROID MASONRY FEED OR EMPTY STATE */}
      {validPosts.length === 0 ? (
        <div className="w-full my-6 sm:my-8 p-6 sm:p-16 rounded-2xl bg-white border border-[#e8ded5] text-center flex flex-col items-center justify-center relative overflow-hidden">
          {/* Top Washi Tape */}
          <div className="washi-tape-butter w-28 h-5 absolute -top-2 left-1/2 -translate-x-1/2 opacity-80"></div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] flex items-center justify-center mb-4">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#8e706c]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>

          <h3 className="font-display font-extrabold text-lg sm:text-2xl text-[#1e1b19] tracking-tight">
            The rally board is waiting for its first snapshot
          </h3>

          <p className="font-body text-xs sm:text-sm text-[#5a413d] mt-2 max-w-md leading-relaxed px-2">
            No memories have been dropped yet. Be the first student to complete an intramural challenge and stamp your photo on the board!
          </p>

          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onOpenUpload({ top: r.top, left: r.left, width: r.width, height: r.height });
            }}
            type="button"
            className="mt-5 sm:mt-6 px-5 py-2.5 sm:px-6 sm:py-3 min-h-[44px] rounded-lg bg-[#ff5e4d] hover:bg-[#b4281e] text-white font-display font-bold text-xs transition active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Upload the First Rally Photo</span>
          </button>
        </div>
      ) : (
        <>
          {/* MOBILE PINTEREST-STYLE 2-COLUMN MASONRY FEED (< sm) */}
          <div className="grid grid-cols-2 gap-2.5 items-start sm:hidden">
            <div className="flex flex-col gap-2.5">
              {validPosts
                .filter((_, i) => i % 2 === 0)
                .map((post, colIdx) => {
                  const idx = colIdx * 2;
                  const tapeClass = TAPES[idx % TAPES.length];
                  const orientation = imageOrientations[post.id] || "landscape";
                  const photoAspect = PHOTO_ASPECTS[orientation];

                  return (
                    <div
                      key={post.id}
                      onClick={(e) => handleOpenDetail(post, e)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View memory by ${post.displayName}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpenDetail(post, e as unknown as React.MouseEvent<HTMLDivElement>);
                        }
                      }}
                      className="scrapbook-card relative bg-white border border-[#e8ded5] rounded-xl p-2.5 pb-3.5 flex flex-col justify-between shadow-2xs cursor-pointer hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5e4d]"
                    >
                      {/* Mini Scaled Washi Tape */}
                      <div
                        className={`${tapeClass} w-14 h-3.5 absolute -top-1.75 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90`}
                      ></div>

                      <div>
                        {/* Photo Thumbnail */}
                        <div
                          className={`${photoAspect} bg-stone-100 rounded-md overflow-hidden mb-2 relative transition-[aspect-ratio] duration-300`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.imageUrl}
                            alt={post.caption || "Student memory"}
                            loading={idx < 4 ? "eager" : "lazy"}
                            fetchPriority={idx < 2 ? "high" : "auto"}
                            decoding="async"
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
                            <span className="absolute bottom-1.5 left-1.5 max-w-[90%] truncate px-1.5 py-0.5 rounded bg-[#1e1b19]/85 text-white text-[9px] font-display font-medium">
                              Slot #{post.slotIndex !== null ? post.slotIndex + 1 : ""} • {post.taskTitle}
                            </span>
                          )}
                        </div>

                        {/* Author Header */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold text-xs text-[#1e1b19] leading-tight truncate">
                            {post.displayName}
                          </span>
                          <span className="font-body text-[10px] text-[#8e706c] shrink-0 ml-1">
                            {formatTimeAgo(post.createdAt)}
                          </span>
                        </div>

                        {/* Caption */}
                        {post.caption && (
                          <p className="font-body text-[11px] text-[#5a413d] leading-snug line-clamp-3">
                            {post.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex flex-col gap-2.5">
              {validPosts
                .filter((_, i) => i % 2 === 1)
                .map((post, colIdx) => {
                  const idx = colIdx * 2 + 1;
                  const tapeClass = TAPES[idx % TAPES.length];
                  const orientation = imageOrientations[post.id] || "landscape";
                  const photoAspect = PHOTO_ASPECTS[orientation];

                  return (
                    <div
                      key={post.id}
                      onClick={(e) => handleOpenDetail(post, e)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View memory by ${post.displayName}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpenDetail(post, e as unknown as React.MouseEvent<HTMLDivElement>);
                        }
                      }}
                      className="scrapbook-card relative bg-white border border-[#e8ded5] rounded-xl p-2.5 pb-3.5 flex flex-col justify-between shadow-2xs cursor-pointer hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5e4d]"
                    >
                      {/* Mini Scaled Washi Tape */}
                      <div
                        className={`${tapeClass} w-14 h-3.5 absolute -top-1.75 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90`}
                      ></div>

                      <div>
                        {/* Photo Thumbnail */}
                        <div
                          className={`${photoAspect} bg-stone-100 rounded-md overflow-hidden mb-2 relative transition-[aspect-ratio] duration-300`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.imageUrl}
                            alt={post.caption || "Student memory"}
                            loading={idx < 4 ? "eager" : "lazy"}
                            fetchPriority={idx < 2 ? "high" : "auto"}
                            decoding="async"
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
                            <span className="absolute bottom-1.5 left-1.5 max-w-[90%] truncate px-1.5 py-0.5 rounded bg-[#1e1b19]/85 text-white text-[9px] font-display font-medium">
                              Slot #{post.slotIndex !== null ? post.slotIndex + 1 : ""} • {post.taskTitle}
                            </span>
                          )}
                        </div>

                        {/* Author Header */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold text-xs text-[#1e1b19] leading-tight truncate">
                            {post.displayName}
                          </span>
                          <span className="font-body text-[10px] text-[#8e706c] shrink-0 ml-1">
                            {formatTimeAgo(post.createdAt)}
                          </span>
                        </div>

                        {/* Caption */}
                        {post.caption && (
                          <p className="font-body text-[11px] text-[#5a413d] leading-snug line-clamp-3">
                            {post.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* TABLET & DESKTOP 3-COLUMN SCRAPBOOK GRID (>= sm) */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 items-start">
            {validPosts.map((post, idx) => {
              const isLead = idx === 0 && validPosts.length > 1;
              const rotation = ROTATIONS[idx % ROTATIONS.length];
              const tapeClass = TAPES[idx % TAPES.length];
              const orientation = imageOrientations[post.id] || "landscape";
              const photoAspect = isLead ? "aspect-[16/10]" : PHOTO_ASPECTS[orientation];

              return (
                <div
                  key={post.id}
                  onClick={(e) => handleOpenDetail(post, e)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View memory by ${post.displayName}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenDetail(post, e as unknown as React.MouseEvent<HTMLDivElement>);
                    }
                  }}
                  className={`scrapbook-card relative bg-white border border-[#e8ded5] rounded-xl p-3.5 pb-5 sm:p-4 sm:pb-6 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5e4d] ${
                    isLead ? "sm:col-span-2 lg:col-span-2" : "col-span-1"
                  } ${rotation}`}
                >
                  {/* Washi Tape Strip */}
                  <div
                    className={`${tapeClass} w-24 h-5 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-10 opacity-90`}
                  ></div>

                  <div>
                    {/* Photo Thumbnail */}
                    <div
                      className={`${photoAspect} bg-stone-100 rounded-lg overflow-hidden mb-3 relative transition-[aspect-ratio] duration-300`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.imageUrl}
                        alt={post.caption || "Student memory"}
                        loading={idx < 4 ? "eager" : "lazy"}
                        fetchPriority={idx < 2 ? "high" : "auto"}
                        decoding="async"
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
        </>
      )}

      {/* INFINITE SCROLL / LOAD MORE SENTINEL */}
      {validPosts.length > 0 && (
        <div ref={sentinelRef} className="w-full py-8 flex flex-col items-center justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2.5 text-stone-600 font-display text-xs bg-white/80 backdrop-blur-xs px-4 py-2 rounded-full border border-[#e8ded5] shadow-2xs">
              <div className="w-3.5 h-3.5 border-2 border-[#ff5e4d] border-t-transparent rounded-full animate-spin" />
              <span>Loading more memories...</span>
            </div>
          )}
          {!hasMore && validPosts.length >= 10 && (
            <p className="font-body text-xs text-[#8e706c]">
              You&apos;ve reached the beginning of the rally board ✨
            </p>
          )}
        </div>
      )}

      {/* EXPANDED POLAROID POST DETAIL MODAL */}
      {selectedPost && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedPost.caption || "Student memory"}
          onClick={handleCloseDetail}
          onTransitionEnd={handleModalTransitionEnd}
          style={{
            opacity: isModalExpanded ? 1 : 0,
            transition: "opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-3.5 sm:p-6 bg-stone-950/75 backdrop-blur-xs select-none overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={getModalAnimationStyles()}
            className="relative w-full max-w-lg bg-white border border-[#e8ded5] rounded-2xl shadow-2xl p-4 sm:p-6 pb-5 flex flex-col max-h-[92dvh] overflow-hidden will-change-transform"
          >
            {/* Centered Decorative Washi Tape */}
            <div className="washi-tape-coral w-32 h-5.5 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-xs pointer-events-none z-20 opacity-90 shadow-xs" />

            {/* Top Bar: Slot / Challenge Badge + Close Button */}
            <div className="flex items-center justify-between pb-3 shrink-0">
              <div className="flex items-center gap-2 truncate pr-2">
                {selectedPost.taskTitle ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#fff8f5] text-[#8e4e14] border border-[#f4a261]/40 shrink-0 font-body flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e4d]"></span>
                    Slot #{selectedPost.slotIndex !== null ? selectedPost.slotIndex + 1 : ""} • {selectedPost.taskTitle}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#fcf9f5] text-[#5a413d] border border-[#e8ded5] shrink-0 font-body">
                    Campus Memory
                  </span>
                )}
              </div>

              <button
                onClick={handleCloseDetail}
                type="button"
                aria-label="Close modal"
                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-[#ff5e4d] focus-visible:outline-none cursor-pointer shrink-0 active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Polaroid Frame Content */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3.5 pr-0.5">
              {/* Photo Display Frame */}
              <div className="relative w-full rounded-xl overflow-hidden bg-stone-100 border border-[#e8ded5] shadow-xs flex items-center justify-center max-h-[58vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPost.imageUrl}
                  alt={selectedPost.caption || "Student memory"}
                  className="w-full h-auto max-h-[58vh] object-contain select-none"
                />
              </div>

              {/* Author & Timestamp Row */}
              <div className="flex items-center justify-between gap-3 pt-0.5 border-b border-[#e8ded5]/60 pb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#f5ece9] border border-[#e8ded5] flex items-center justify-center text-[#ff5e4d] font-display font-bold text-xs shrink-0">
                    {selectedPost.displayName ? selectedPost.displayName.charAt(0).toUpperCase() : "A"}
                  </div>
                  <div className="min-w-0">
                    <span className="font-display font-bold text-sm text-[#1e1b19] block leading-tight truncate">
                      {selectedPost.displayName}
                    </span>
                    {selectedPost.collegeDept && (
                      <span className="font-body text-[11px] text-[#8e706c] block leading-tight truncate">
                        {selectedPost.collegeDept}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-body text-xs text-[#8e706c] block">
                    {formatTimeAgo(selectedPost.createdAt)}
                  </span>
                </div>
              </div>

              {/* Caption */}
              {selectedPost.caption ? (
                <p className="font-body text-xs sm:text-sm text-[#1e1b19] leading-relaxed whitespace-pre-wrap">
                  {selectedPost.caption}
                </p>
              ) : (
                <p className="font-body text-xs text-stone-400 italic">
                  No memory note written.
                </p>
              )}

              {/* Error Alert */}
              {deleteError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs text-center font-body flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            {/* Actions Footer Bar */}
            <div className="mt-3.5 pt-3 border-t border-[#e8ded5] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <button
                onClick={() => setIsReportOpen(true)}
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-stone-500 hover:text-[#b4281e] hover:bg-red-50/70 font-display font-medium text-xs transition cursor-pointer active:scale-95"
              >
                <span>🚩</span>
                <span>Report Photo</span>
              </button>

              {/* Owner Actions Footer (Strictly for post author) */}
              {currentUserId && selectedPost.userId === currentUserId && (
                <div className="w-full sm:w-auto flex items-center justify-end">
                  {!isConfirmingDelete ? (
                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      type="button"
                      className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 font-display font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      <span>Delete Memory</span>
                    </button>
                  ) : (
                    <div className="w-full p-2.5 rounded-xl bg-red-50/80 border border-red-200/90 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        <span className="font-body text-xs text-red-800 font-medium">
                          Permanently delete?
                        </span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={handleDeletePost}
                          disabled={isDeleting}
                          type="button"
                          className="flex-1 sm:flex-initial px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-display font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          {isDeleting ? "Deleting..." : "Yes, Delete"}
                        </button>
                        <button
                          onClick={() => setIsConfirmingDelete(false)}
                          disabled={isDeleting}
                          type="button"
                          className="flex-1 sm:flex-initial px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-700 font-display font-medium text-xs border border-stone-200 transition cursor-pointer active:scale-95"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REPORT PHOTO MODAL */}
      {selectedPost && (
        <ReportPhotoModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          postId={selectedPost.id}
          onReported={() => {
            setLocallyDeletedIds((prev) => new Set([...prev, selectedPost.id]));
            handleCloseDetail();
          }}
        />
      )}
    </div>
  </RealtimePostsProvider>
);
}
