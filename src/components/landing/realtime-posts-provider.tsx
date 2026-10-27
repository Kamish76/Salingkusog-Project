"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore, type ReactNode } from "react";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { RealtimeProvider, useLiveQuery } from "@neon/realtime-react";
import type { PostRecord } from "./memory-board";

const emptySubscribe = () => () => {};

interface RealtimePostsProviderProps {
  children: ReactNode;
  sealedQuery?: SealedLiveQuery<PostRecord> | null;
  onLivePosts?: (posts: readonly PostRecord[]) => void;
}

function LiveQueryListener({
  sealedQuery,
  onLivePosts,
}: {
  sealedQuery: SealedLiveQuery<PostRecord>;
  onLivePosts: (posts: readonly PostRecord[]) => void;
}) {
  const refreshQuery = useCallback(async () => {
    const res = await fetch("/api/realtime/posts", { method: "POST" });
    if (!res.ok) throw new Error("Failed to renew live posts query");
    return (await res.json()) as SealedLiveQuery<PostRecord>;
  }, []);

  const { data, error } = useLiveQuery(sealedQuery, { refreshQuery });
  const onLivePostsRef = useRef(onLivePosts);

  useEffect(() => {
    onLivePostsRef.current = onLivePosts;
  }, [onLivePosts]);

  useEffect(() => {
    if (data) {
      onLivePostsRef.current?.(data);
    }
  }, [data]);

  if (error) {
    console.warn("Neon Realtime notice:", error);
  }

  return null;
}

export function RealtimePostsProvider({
  children,
  sealedQuery,
  onLivePosts,
}: RealtimePostsProviderProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [client] = useState(() => {
    const url = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
    if (!url) return null;
    try {
      return createRealtimeClient({ url });
    } catch (err) {
      console.warn("Could not initialize Realtime client:", err);
      return null;
    }
  });

  if (!client || !sealedQuery || !onLivePosts) {
    return <>{children}</>;
  }

  return (
    <RealtimeProvider client={client}>
      {isMounted && (
        <LiveQueryListener sealedQuery={sealedQuery} onLivePosts={onLivePosts} />
      )}
      {children}
    </RealtimeProvider>
  );
}
