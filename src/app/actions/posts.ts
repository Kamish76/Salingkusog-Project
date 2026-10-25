"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  isStorageConfigured,
  validateImageMagicBytes,
  uploadImageToBucket,
} from "@/lib/storage";
import {
  evaluateBingoLines,
  generateRaffleCode,
  type ClaimedLine,
} from "@/lib/bingo-engine";
import { recordActivityLog } from "@/lib/activity-logger";

export interface SubmitPostResult {
  success: boolean;
  error?: string;
  postId?: string;
  newRaffleCode?: string;
}

/**
 * Upload student photo post, optionally linked to a 3x3 Bingo challenge slot.
 */
export async function submitStudentPostAction(
  formData: FormData
): Promise<SubmitPostResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please sign in with Google to post." };
  }

  if (!isStorageConfigured()) {
    return {
      success: false,
      error: "Storage is not configured on this environment.",
    };
  }

  try {
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { success: false, error: "No photo file provided." };
    }

    if (file.size === 0) {
      return { success: false, error: "The selected photo is empty." };
    }

    // Safety hard cap (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "Photo must be under 10 MB." };
    }

    const caption = (formData.get("caption") as string)?.trim() || "";
    const isAnonymous = formData.get("isAnonymous") === "true";
    const bingoTaskId = (formData.get("bingoTaskId") as string)?.trim() || null;

    // Validate magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const inspection = validateImageMagicBytes(buffer);

    if (!inspection.valid) {
      return {
        success: false,
        error: "Only valid image files (JPEG, PNG, WebP, GIF, AVIF) can be posted.",
      };
    }

    const contentType = inspection.detectedType || file.type || "image/webp";
    const uploadResult = await uploadImageToBucket(buffer, file.name, contentType);

    if (!uploadResult?.url || !uploadResult.url.trim()) {
      return { success: false, error: "Failed to obtain a valid photo URL from storage." };
    }

    const displayName = isAnonymous ? "Anonymous Student" : user.name;

    // Check if replacing an existing photo for this bingo task
    if (bingoTaskId) {
      const existingSlot = await sql`
        SELECT post_id FROM public.user_bingo_progress
        WHERE user_id = ${user.id}::uuid AND task_id = ${bingoTaskId}::uuid
        LIMIT 1
      `;
      if (existingSlot.length > 0 && existingSlot[0].post_id) {
        // Delete the previous post to prevent orphan duplicates
        await sql`
          DELETE FROM public.posts
          WHERE id = ${existingSlot[0].post_id}::uuid AND user_id = ${user.id}::uuid
        `;
      }
    }

    // Insert post into public.posts
    const insertedPosts = await sql`
      INSERT INTO public.posts (
        user_id,
        is_anonymous,
        display_name,
        college_dept,
        image_url,
        caption,
        is_bingo_entry,
        bingo_task_id,
        status
      )
      VALUES (
        ${user.id}::uuid,
        ${isAnonymous},
        ${displayName},
        NULL,
        ${uploadResult.url},
        ${caption},
        ${Boolean(bingoTaskId)},
        ${bingoTaskId ? bingoTaskId : null}::uuid,
        'published'
      )
      RETURNING id
    `;

    const newPostId = insertedPosts[0]?.id;
    let newRaffleCode: string | undefined = undefined;
    let slotIndex: number | null = null;
    let taskTitle: string | null = null;

    // If this post fulfills a 3x3 Bingo slot, link or update user_bingo_progress
    if (bingoTaskId && newPostId) {
      // Lookup bingo task details for audit logs
      const taskRows = await sql`
        SELECT slot_index, title FROM public.bingo_tasks
        WHERE id = ${bingoTaskId}::uuid LIMIT 1
      `;
      if (taskRows.length > 0) {
        slotIndex = Number(taskRows[0].slot_index);
        taskTitle = taskRows[0].title;
      }

      await sql`
        INSERT INTO public.user_bingo_progress (user_id, task_id, post_id)
        VALUES (${user.id}::uuid, ${bingoTaskId}::uuid, ${newPostId}::uuid)
        ON CONFLICT (user_id, task_id) DO UPDATE SET
          post_id = EXCLUDED.post_id,
          completed_at = now()
      `;

      // Check for newly completed lines
      const userProgressRows = await sql`
        SELECT bt.slot_index, ubp.task_id, ubp.post_id
        FROM public.user_bingo_progress ubp
        JOIN public.bingo_tasks bt ON ubp.task_id = bt.id
        WHERE ubp.user_id = ${user.id}::uuid
      `;

      const existingRaffles = await sql`
        SELECT line_type, line_index
        FROM public.raffle_entries
        WHERE user_id = ${user.id}::uuid
      `;

      const completedSlots = userProgressRows.map((r) => Number(r.slot_index));
      const claimedLines: ClaimedLine[] = existingRaffles.map((r) => ({
        lineType: r.line_type as ClaimedLine["lineType"],
        lineIndex: Number(r.line_index),
      }));

      const evaluation = evaluateBingoLines(completedSlots, claimedLines);

      // Check if raffle system is active before claiming raffle entries
      const configRows = await sql`
        SELECT is_raffle_active FROM public.event_config WHERE key = 'active_event' LIMIT 1
      `;
      const isRaffleActive = configRows[0]?.is_raffle_active ?? true;

      // If raffle is active and there's an unclaimed completed line, claim the first one
      if (isRaffleActive && evaluation.claimableLines.length > 0) {
        const lineToClaim = evaluation.claimableLines[0].line;
        const generatedCode = generateRaffleCode();

        // Get task and post IDs for this line
        const lineTaskIds = lineToClaim.slots.map((slot: number) => {
          const match = userProgressRows.find((r) => Number(r.slot_index) === slot);
          return match?.task_id;
        }).filter(Boolean);

        const linePostIds = lineToClaim.slots.map((slot: number) => {
          const match = userProgressRows.find((r) => Number(r.slot_index) === slot);
          return match?.post_id;
        }).filter(Boolean);

        await sql`
          INSERT INTO public.raffle_entries (
            raffle_code,
            user_id,
            line_type,
            line_index,
            task_ids,
            post_ids,
            status
          )
          VALUES (
            ${generatedCode},
            ${user.id}::uuid,
            ${lineToClaim.type},
            ${lineToClaim.index},
            ${lineTaskIds}::uuid[],
            ${linePostIds}::uuid[],
            'valid'
          )
          ON CONFLICT (user_id, line_type, line_index) DO NOTHING
        `;

        newRaffleCode = generatedCode;
      }
    }

    // Record audit log distinguishing Bingo Card vs Drop a Memory
    const uploadChannel = bingoTaskId ? "bingo_card" : "drop_a_memory";
    const description = bingoTaskId
      ? `[Bingo Card] Uploaded photo proof for Slot #${slotIndex !== null ? slotIndex + 1 : "?"} (${taskTitle || "Challenge"})${caption ? ` · "${caption.slice(0, 50)}"` : ""}`
      : `[Drop a Memory] Dropped a campus memory to the public board${caption ? ` · "${caption.slice(0, 50)}"` : ""}`;

    await recordActivityLog({
      actionType: "POST_SUBMIT",
      category: "user",
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      targetId: newPostId,
      targetType: "post",
      description,
      metadata: {
        postId: newPostId,
        uploadChannel,
        isBingoEntry: Boolean(bingoTaskId),
        bingoTaskId: bingoTaskId || null,
        slotIndex,
        taskTitle,
        isAnonymous,
        newRaffleCode: newRaffleCode || null,
      },
    });

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev");
    revalidatePath("/dev/logs");

    return {
      success: true,
      postId: newPostId,
      newRaffleCode,
    };
  } catch (err: unknown) {
    console.error("submitStudentPostAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit post",
    };
  }
}


/**
 * Remove an uploaded photo from a 3x3 Bingo slot.
 */
export async function removeBingoTaskPhotoAction(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please sign in to modify your bingo card." };
  }

  try {
    const existing = await sql`
      SELECT post_id FROM public.user_bingo_progress
      WHERE user_id = ${user.id}::uuid AND task_id = ${taskId}::uuid
      LIMIT 1
    `;

    if (existing.length === 0) {
      return { success: false, error: "No photo found for this task slot." };
    }

    const postId = existing[0].post_id;

    // Delete progress entry
    await sql`
      DELETE FROM public.user_bingo_progress
      WHERE user_id = ${user.id}::uuid AND task_id = ${taskId}::uuid
    `;

    // Also delete the linked post
    if (postId) {
      await sql`
        DELETE FROM public.posts
        WHERE id = ${postId}::uuid AND user_id = ${user.id}::uuid
      `;
    }

    // Lookup task title for audit logs
    let slotIndex: number | null = null;
    let taskTitle: string | null = null;
    if (taskId) {
      const taskRows = await sql`
        SELECT slot_index, title FROM public.bingo_tasks
        WHERE id = ${taskId}::uuid LIMIT 1
      `;
      if (taskRows.length > 0) {
        slotIndex = Number(taskRows[0].slot_index);
        taskTitle = taskRows[0].title;
      }
    }

    await recordActivityLog({
      actionType: "POST_SUBMIT",
      category: "user",
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      targetId: postId || null,
      targetType: "post",
      description: `[Bingo Card] Removed photo proof from Slot #${slotIndex !== null ? slotIndex + 1 : "?"} (${taskTitle || "Challenge"})`,
      metadata: {
        action: "remove_bingo_photo",
        taskId,
        postId,
        slotIndex,
        taskTitle,
      },
    });

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev");
    revalidatePath("/dev/logs");
    return { success: true };
  } catch (err: unknown) {
    console.error("removeBingoTaskPhotoAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove photo",
    };
  }
}
