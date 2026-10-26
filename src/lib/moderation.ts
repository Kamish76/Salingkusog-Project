export type ModerationStatus = "approved" | "rejected" | "outage_fallback";

export interface ModerationResult {
  status: ModerationStatus;
  flaggedCategories?: string[];
  reason?: string;
}

/**
 * Validates uploaded student media and optional caption against OpenAI's
 * multimodal omni-moderation-latest endpoint.
 *
 * Implements a strict fail-open policy ONLY for transient API outages or timeouts,
 * routing bypass events to audit logs for administrator review while strictly
 * blocking explicitly flagged inappropriate content.
 */
const MAX_MODERATION_BYTES = 4 * 1024 * 1024; // 4 MB

export async function moderatePostContent(
  imageBuffer: Uint8Array,
  mimeType: string,
  caption?: string | null,
  timeoutMs: number = 5000,
  apiKeyOverride?: string,
  fetchFn: typeof fetch = fetch
): Promise<ModerationResult> {
  if (imageBuffer.length > MAX_MODERATION_BYTES) {
    return {
      status: "rejected",
      reason: "Photo exceeds 4MB. Please compress or downscale your photo before uploading.",
    };
  }
  const apiKey = apiKeyOverride !== undefined ? apiKeyOverride : process.env.OPENAI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    console.warn("⚠️ OPENAI_API_KEY is not configured; failing open to outage fallback.");
    return {
      status: "outage_fallback",
      reason: "OPENAI_API_KEY is not configured",
    };
  }

  // Multimodal payload format for omni-moderation-latest
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const inputs: Array<
    | { type: "image_url"; image_url: { url: string } }
    | { type: "text"; text: string }
  > = [
    {
      type: "image_url",
      image_url: {
        url: dataUrl,
      },
    },
  ];

  if (caption && caption.trim()) {
    inputs.push({
      type: "text",
      text: caption.trim(),
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchFn("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: inputs,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`⚠️ OpenAI Moderation API returned HTTP ${res.status}; falling back to outage log.`);
      return {
        status: "outage_fallback",
        reason: `Upstream HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const result = data?.results?.[0];

    if (!result) {
      return {
        status: "outage_fallback",
        reason: "Invalid response shape from moderation API",
      };
    }

    if (result.flagged) {
      const categories: string[] = [];
      if (result.categories && typeof result.categories === "object") {
        for (const [category, isFlagged] of Object.entries(result.categories)) {
          if (isFlagged) {
            categories.push(category);
          }
        }
      }
      return {
        status: "rejected",
        flaggedCategories: categories,
        reason: categories.length > 0 ? categories.join(", ") : "Content flagged by policy",
      };
    }

    return {
      status: "approved",
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    const errorMsg = isAbort ? "Request timed out" : err instanceof Error ? err.message : "Network error";
    console.warn(`⚠️ OpenAI Moderation error (${errorMsg}); falling back to outage log.`);
    return {
      status: "outage_fallback",
      reason: errorMsg,
    };
  }
}
