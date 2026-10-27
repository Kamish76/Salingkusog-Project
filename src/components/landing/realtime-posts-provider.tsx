"use client";

import { useState, type ReactNode } from "react";
import { createRealtimeClient } from "@neon/realtime/client";
import { RealtimeProvider } from "@neon/realtime-react";

interface RealtimePostsProviderProps {
  children: ReactNode;
}

export function RealtimePostsProvider({ children }: RealtimePostsProviderProps) {
  const [client] = useState(() => {
    if (typeof window === "undefined") return null;
    const url = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
    if (!url) return null;
    try {
      return createRealtimeClient({ url });
    } catch (err) {
      console.warn("Could not initialize Realtime client:", err);
      return null;
    }
  });

  if (!client) {
    return <>{children}</>;
  }

  return <RealtimeProvider client={client}>{children}</RealtimeProvider>;
}
