import { NextRequest, NextResponse } from "next/server";
import { STORAGE_BUCKET } from "@/lib/storage";
import { validateProxyTarget } from "@/lib/image-proxy-validator";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url") || "";

  const validation = validateProxyTarget(targetUrl, process.env.AWS_ENDPOINT_URL_S3, STORAGE_BUCKET);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      cache: "force-cache",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${res.status}` },
        { status: res.status }
      );
    }

    // Content-Type validation
    const contentType = res.headers.get("content-type") || "";
    if (!ALLOWED_CONTENT_TYPES.some((t) => contentType.toLowerCase().startsWith(t))) {
      return NextResponse.json(
        { error: "Upstream content is not a supported image" },
        { status: 415 }
      );
    }

    // Header Content-Length validation
    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds maximum allowed size (10 MB)" },
        { status: 413 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds maximum allowed size (10 MB)" },
        { status: 413 }
      );
    }

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: isTimeout ? "Upstream request timed out" : "Failed to proxy image" },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
