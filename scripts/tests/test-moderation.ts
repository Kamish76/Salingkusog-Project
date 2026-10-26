/**
 * Salingkusog Production Integration Test: OpenAI Content Moderation Service
 *
 * Verifies:
 * 1. Approved content returns status: "approved"
 * 2. Flagged content returns status: "rejected" with detected category list
 * 3. Upstream 5xx or server error falls back to status: "outage_fallback"
 * 4. Network timeout (AbortError) falls back to status: "outage_fallback"
 * 5. Missing API key safely returns "outage_fallback" without uncaught exception
 */

import assert from "node:assert";
import { moderatePostContent } from "../../src/lib/moderation.ts";

export async function runModerationTest() {
  console.log("▶ [Test Suite] OpenAI Content Moderation Service");

  const dummyImage = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // Test 1: Approved content
  const mockApprovedFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        results: [{ flagged: false, categories: { sexual: false, violence: false } }],
      }),
      { status: 200 }
    );

  const res1 = await moderatePostContent(
    dummyImage,
    "image/png",
    "Safe caption",
    5000,
    "sk-test",
    mockApprovedFetch
  );
  assert.strictEqual(res1.status, "approved");
  console.log("  ✔ Approved content returns status: approved");

  // Test 2: Flagged content
  const mockRejectedFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        results: [
          {
            flagged: true,
            categories: { sexual: true, violence: false, hate: false },
          },
        ],
      }),
      { status: 200 }
    );

  const res2 = await moderatePostContent(
    dummyImage,
    "image/png",
    "Unsafe photo",
    5000,
    "sk-test",
    mockRejectedFetch
  );
  assert.strictEqual(res2.status, "rejected");
  assert.ok(res2.flaggedCategories?.includes("sexual"));
  console.log("  ✔ Flagged content returns status: rejected with categories");

  // Test 3: Upstream 5xx outage fallback
  const mockOutageFetch: typeof fetch = async () =>
    new Response("Internal Server Error", { status: 500 });
  const res3 = await moderatePostContent(
    dummyImage,
    "image/png",
    "Caption",
    5000,
    "sk-test",
    mockOutageFetch
  );
  assert.strictEqual(res3.status, "outage_fallback");
  console.log("  ✔ Upstream 5xx triggers outage_fallback");

  // Test 4: Timeout outage fallback
  const mockTimeoutFetch: typeof fetch = async () => {
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    throw error;
  };
  const res4 = await moderatePostContent(
    dummyImage,
    "image/png",
    "Caption",
    5000,
    "sk-test",
    mockTimeoutFetch
  );
  assert.strictEqual(res4.status, "outage_fallback");
  console.log("  ✔ Timeout triggers outage_fallback");

  // Test 5: Missing API key fallback
  const res5 = await moderatePostContent(dummyImage, "image/png", "Caption", 5000, "");
  assert.strictEqual(res5.status, "outage_fallback");
  console.log("  ✔ Missing API key safely triggers outage_fallback");

  // Test 6: Buffer exceeding 4MB rejected
  const oversizedBuffer = new Uint8Array(5 * 1024 * 1024);
  const res6 = await moderatePostContent(oversizedBuffer, "image/png", "Oversized", 5000, "sk-test", mockApprovedFetch);
  assert.strictEqual(res6.status, "rejected");
  assert.strictEqual(res6.reason, "Photo exceeds 4MB. Please compress or downscale your photo before uploading.");
  console.log("  ✔ Oversized buffer (>4MB) safely rejected before network request");

  console.log("✔ Moderation service suite passed cleanly\n");
}

if (process.argv[1]?.endsWith("test-moderation.ts")) {
  runModerationTest().catch((err) => {
    console.error("❌ Moderation test failed:", err);
    process.exit(1);
  });
}
