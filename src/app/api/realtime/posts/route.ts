import { NextResponse } from "next/server";
import { realtimeServer, livePostsQuery } from "@/lib/realtime";

export async function POST() {
  if (!realtimeServer) {
    return NextResponse.json({ error: "Realtime not configured" }, { status: 503 });
  }

  try {
    const sealedQuery = await realtimeServer.seal({ query: livePostsQuery });
    return NextResponse.json(sealedQuery, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to renew live posts query:", error);
    return NextResponse.json({ error: "Failed to seal query" }, { status: 500 });
  }
}
