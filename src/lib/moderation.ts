import OpenAI from "openai";

export interface ModerationResult {
  approved: boolean;
  flagged?: boolean;
  bypassed?: boolean;
  error?: string;
  flaggedCategories?: string[];
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Checks if a valid OpenAI API key is configured in the environment.
 */
export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && key !== "your_openai_api_key");
}

/**
 * Evaluates an image against OpenAI's omni-moderation-latest model.
 * 
 * Enforces a strict 10-second timeout and logs detailed flagged category
 * breakdown on the server while returning clean, user-safe error flags.
 */
export async function moderateImageBuffer(
  buffer: Uint8Array,
  mimeType: string
): Promise<ModerationResult> {
  const isConfigured = isOpenAIConfigured();
  const isDev = process.env.NODE_ENV !== "production";

  if (!isConfigured) {
    if (isDev) {
      console.warn(
        "[Moderation] Warning: OPENAI_API_KEY is missing or using placeholder. Bypassing moderation in development."
      );
      return { approved: true, bypassed: true };
    }

    console.error("[Moderation] Error: OPENAI_API_KEY is not configured in production.");
    return {
      approved: false,
      error: "Content moderation service is unconfigured.",
    };
  }

  try {
    const openai = getOpenAIClient();
    const base64Data = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Enforce 10-second timeout to prevent server action hangs
    const response = await openai.moderations.create(
      {
        model: "omni-moderation-latest",
        input: [
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    const result = response.results?.[0];
    if (!result) {
      console.error("[Moderation] Empty response received from OpenAI Moderation API.");
      return { approved: false, error: "Empty moderation response." };
    }

    if (result.flagged) {
      const flaggedCategories = Object.entries(result.categories || {})
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);

      console.warn("[Moderation] Image FLAGGED by OpenAI policy:", {
        flaggedCategories,
        categoryScores: result.category_scores,
      });

      return {
        approved: false,
        flagged: true,
        flaggedCategories,
      };
    }

    return { approved: true, flagged: false };
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError" || err.message.includes("timeout"));

    console.error("[Moderation] Failed to verify image safety:", err);

    return {
      approved: false,
      error: isTimeout
        ? "Safety review timed out. Please try again."
        : "Safety review failed. Please try again.",
    };
  }
}
