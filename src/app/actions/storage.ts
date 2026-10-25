"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { sql } from "@/lib/db";
import { recordActivityLog } from "@/lib/activity-logger";
import {
  isStorageConfigured,
  validateImageMagicBytes,
  uploadImageToBucket,
  deleteBucketObject,
} from "@/lib/storage";

export interface StorageActionResult {
  success: boolean;
  error?: string;
  data?: {
    key: string;
    url: string;
    size: number;
  };
}

/**
 * Upload an image with strict server-side magic byte inspection
 * and admin authorization enforcement.
 */
export async function uploadStorageImageAction(
  formData: FormData
): Promise<StorageActionResult> {
  const user = await getCurrentUser();
  if (!user || !isDevAuthorized(user)) {
    return {
      success: false,
      error: "Unauthorized: Elevated Admin credentials are required to upload.",
    };
  }

  if (!isStorageConfigured()) {
    return {
      success: false,
      error:
        "Neon Object Storage is not configured. Missing AWS S3 endpoint or credentials in environment.",
    };
  }

  try {
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { success: false, error: "No valid file uploaded." };
    }

    if (file.size === 0) {
      return { success: false, error: "Uploaded file is empty (0 bytes)." };
    }

    // Safety hard cap (e.g. 10 MB) to prevent denial of service or filling up the 5 GB quota
    const MAX_ALLOWED_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_ALLOWED_BYTES) {
      return {
        success: false,
        error: "File is too large. Images must be under 10 MB.",
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Strict Magic Byte Inspection: rejects disguised scripts, PDFs, executables
    const inspection = validateImageMagicBytes(buffer);
    if (!inspection.valid) {
      return {
        success: false,
        error:
          "Storage Locked: File rejected. Only verified image formats (JPEG, PNG, WebP, GIF, AVIF) can be uploaded.",
      };
    }

    const contentType = inspection.detectedType || file.type || "image/webp";

    const result = await uploadImageToBucket(buffer, file.name, contentType);

    revalidatePath("/dev/tools/storage");

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload image";
    return { success: false, error: message };
  }
}

/**
 * Delete an object from the bucket
 */
export async function deleteStorageObjectAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !isDevAuthorized(user)) {
    return {
      success: false,
      error: "Unauthorized: Elevated Admin credentials are required to delete files.",
    };
  }

  if (!isStorageConfigured()) {
    return { success: false, error: "Storage not configured." };
  }

  try {
    const key = formData.get("key") as string;
    if (!key) {
      return { success: false, error: "Object key is required." };
    }

    await deleteBucketObject(key);

    // Cascade deletion to public.posts & public.user_bingo_progress so posts are never orphaned without photos
    const matchingPosts = await sql`
      SELECT id, user_id, bingo_task_id FROM public.posts
      WHERE image_url LIKE ${"%" + key}
    `;

    if (matchingPosts.length > 0) {
      const postIds = matchingPosts.map((p) => p.id);

      // Remove bingo progress linking to these posts
      await sql`
        DELETE FROM public.user_bingo_progress
        WHERE post_id = ANY(${postIds}::uuid[])
      `;

      // Hide posts so they never appear on the memory board without photos
      await sql`
        UPDATE public.posts
        SET status = 'hidden', updated_at = NOW()
        WHERE id = ANY(${postIds}::uuid[])
      `;

      await recordActivityLog({
        actionType: "POST_MODERATE",
        category: "admin",
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        actorRole: user.role,
        targetId: postIds.join(","),
        targetType: "post",
        description: `Storage object "${key}" deleted by Admin ${user.name}; cascaded ${postIds.length} linked post(s) to hidden.`,
        metadata: { key, cascadedPostIds: postIds },
      });
    }

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev");
    revalidatePath("/dev/logs");
    revalidatePath("/dev/tools/storage");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete object";
    return { success: false, error: message };
  }
}
