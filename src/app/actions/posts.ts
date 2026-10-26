"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  isStorageConfigured,
  validateImageMagicBytes,
  uploadImageToBucket,
  deleteBucketObject,
  extractStorageKey,
} from "@/lib/storage";
import {
  generateRaffleCode,
  evaluateRaffleRules,
  isTaskUnlocked,
  type RaffleRuleRecord,
  type RaffleRuleCategory,
  type ExistingRaffleClaim,
} from "@/lib/bingo-engine";
import { recordActivityLog } from "@/lib/activity-logger";
import { moderatePostContent } from "@/lib/moderation";
import { checkUserConsent } from "@/app/actions/consent";
import {
  type ReportReason,
  VALID_REPORT_REASONS,
} from "@/lib/consent-predicates";

export type { ReportReason };

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
  if (user.banned) {
    return { success: false, error: "Your account is suspended." };
  }

  // Verify Philippine DPA compliance & student consent layer
  if (process.env.DATABASE_URL) {
    const { hasConsented } = await checkUserConsent(user.id);
    if (!hasConsented) {
      return {
        success: false,
        error: "Consent required. Please review and agree to our Terms of Use and Privacy Notice before posting.",
      };
    }
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

    // Safety hard cap (4 MB)
    if (file.size > 4 * 1024 * 1024) {
      return {
        success: false,
        error: "Photo exceeds 4MB. Please compress or downscale your photo before uploading.",
      };
    }

    const caption = (formData.get("caption") as string)?.trim() || "";
    const isAnonymous = formData.get("isAnonymous") === "true";
    const bingoTaskId = (formData.get("bingoTaskId") as string)?.trim() || null;

    let validatedSlotIndex: number | null = null;
    let validatedTaskTitle: string | null = null;

    // Strict server-side validation for Bingo tasks BEFORE content moderation or storage upload
    if (bingoTaskId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bingoTaskId);
      if (!isUuid) {
        return { success: false, error: "Invalid bingo challenge identifier." };
      }

      // 1. Check live event status and current day from database
      const eventConfigRows = await sql`
        SELECT 
          COALESCE(current_day, 1) as current_day,
          COALESCE(is_event_active, true) as is_event_active
        FROM public.event_config 
        WHERE key = 'active_event' 
        LIMIT 1
      `;
      const isEventActive = Boolean(eventConfigRows[0]?.is_event_active ?? true);
      const currentDay = Number(eventConfigRows[0]?.current_day || 1);

      if (!isEventActive) {
        return { success: false, error: "Bingo uploads are currently paused." };
      }

      // 2. Check task record, active status, and unlock day
      const taskRows = await sql`
        SELECT id, slot_index, title, unlock_day, is_active
        FROM public.bingo_tasks
        WHERE id = ${bingoTaskId}::uuid
        LIMIT 1
      `;

      if (taskRows.length === 0) {
        return { success: false, error: "Bingo challenge not found." };
      }

      const task = taskRows[0];
      if (!task.is_active) {
        return { success: false, error: "This bingo challenge is currently inactive." };
      }

      const taskUnlockDay = Number(task.unlock_day || 1);
      if (!isTaskUnlocked(taskUnlockDay, currentDay)) {
        return {
          success: false,
          error: `This bingo challenge is locked until Day ${taskUnlockDay}.`,
        };
      }

      validatedSlotIndex = Number(task.slot_index);
      validatedTaskTitle = task.title;
    }

    // Validate magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const inspection = validateImageMagicBytes(buffer);

    if (!inspection.valid) {
      return {
        success: false,
        error: "Only valid photos (JPEG, PNG, WebP, GIF, AVIF, or iOS HEIC) can be posted.",
      };
    }

    if (inspection.isHeic) {
      return {
        success: false,
        error: "This HEIC photo could not be optimized by your browser. Please try selecting it again or use a JPEG/PNG photo.",
      };
    }

    const contentType = inspection.detectedType || file.type || "image/webp";

    // Automated Content Moderation check via OpenAI omni-moderation-latest
    const moderation = await moderatePostContent(buffer, contentType, caption);
    if (moderation.status === "rejected") {
      return {
        success: false,
        error:
          moderation.reason?.includes("4MB")
            ? moderation.reason
            : "Your photo could not be posted because it was flagged by our community safety guidelines. Please choose another photo.",
      };
    }

    const uploadResult = await uploadImageToBucket(buffer, file.name, contentType);

    if (!uploadResult?.url || !uploadResult.url.trim()) {
      return { success: false, error: "Failed to obtain a valid photo URL from storage." };
    }

    const displayName = isAnonymous ? "Anonymous Student" : user.name;

    // Check if replacing an existing photo for this bingo task
    let replacedPostId: string | null = null;
    if (bingoTaskId) {
      const existingSlot = await sql`
        SELECT post_id FROM public.user_bingo_progress
        WHERE user_id = ${user.id}::uuid AND task_id = ${bingoTaskId}::uuid
        LIMIT 1
      `;
      if (existingSlot.length > 0 && existingSlot[0].post_id) {
        replacedPostId = existingSlot[0].post_id;
        // Delete the previous post and remove storage blob to prevent orphan duplicates
        const deleted = await sql`
          DELETE FROM public.posts
          WHERE id = ${replacedPostId}::uuid AND user_id = ${user.id}::uuid
          RETURNING image_url
        `;
        if (deleted.length > 0 && deleted[0].image_url) {
          const key = extractStorageKey(deleted[0].image_url);
          if (key) {
            deleteBucketObject(key).catch((err) => console.error("Failed to delete replaced blob:", err));
          }
        }
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
    const slotIndex: number | null = validatedSlotIndex;
    const taskTitle: string | null = validatedTaskTitle;

    // If this post fulfills a 3x3 Bingo slot, link or update user_bingo_progress
    if (bingoTaskId && newPostId) {
      await sql`
        INSERT INTO public.user_bingo_progress (user_id, task_id, post_id)
        VALUES (${user.id}::uuid, ${bingoTaskId}::uuid, ${newPostId}::uuid)
        ON CONFLICT (user_id, task_id) DO UPDATE SET
          post_id = EXCLUDED.post_id,
          completed_at = now()
      `;

      if (replacedPostId) {
        await sql`
          UPDATE public.raffle_entries
          SET post_ids = array_replace(post_ids, ${replacedPostId}::uuid, ${newPostId}::uuid)
          WHERE user_id = ${user.id}::uuid AND ${replacedPostId}::uuid = ANY(post_ids)
        `;
      }
    }

    // Evaluate dynamic raffle rules (Bingo lines, Milestones, and Memory Drops)
    const userProgressRows = await sql`
      SELECT bt.slot_index, ubp.task_id, ubp.post_id
      FROM public.user_bingo_progress ubp
      JOIN public.bingo_tasks bt ON ubp.task_id = bt.id
      WHERE ubp.user_id = ${user.id}::uuid
    `;

    const memoryDropCountRows = await sql`
      SELECT count(*)::int as count
      FROM public.posts p
      WHERE p.user_id = ${user.id}::uuid
        AND p.status = 'published'
        AND p.id NOT IN (
          SELECT post_id FROM public.user_bingo_progress WHERE post_id IS NOT NULL AND user_id = ${user.id}::uuid
        )
    `;
    const memoryDropCount = Number(memoryDropCountRows[0]?.count || 0);

    const existingRaffles = await sql`
      SELECT rule_key, line_type, line_index
      FROM public.raffle_entries
      WHERE user_id = ${user.id}::uuid
        AND status != 'disqualified'
    `;

    const completedSlots = userProgressRows.map((r) => Number(r.slot_index));
    const existingClaims: ExistingRaffleClaim[] = existingRaffles.map((r) => ({
      ruleKey: r.rule_key,
      lineType: r.line_type,
      lineIndex: Number(r.line_index),
    }));

    // Check if raffle system is active and student ticket cap
    const configRows = await sql`
      SELECT is_raffle_active, max_tickets_per_user FROM public.event_config WHERE key = 'active_event' LIMIT 1
    `;
    const isRaffleActive = configRows[0]?.is_raffle_active ?? true;
    const maxTicketsPerUser = Number(configRows[0]?.max_tickets_per_user || 0);

    // Fetch active rules from database
    const ruleRows = await sql`
      SELECT id, rule_key, name, category, description, tickets_awarded, is_active
      FROM public.raffle_rules
      WHERE is_active = true
    `;
    const rules: RaffleRuleRecord[] = ruleRows.map((r) => ({
      id: r.id,
      ruleKey: r.rule_key,
      name: r.name,
      category: r.category as RaffleRuleCategory,
      description: r.description,
      ticketsAwarded: Number(r.tickets_awarded),
      isActive: Boolean(r.is_active),
    }));

    if (isRaffleActive && rules.length > 0) {
      const evaluation = evaluateRaffleRules(rules, {
        completedSlotIndexes: completedSlots,
        memoryDropCount,
        existingClaims,
        maxTicketsPerUser,
      });

      for (const reward of evaluation.eligibleRewards) {
        let taskIds: string[] = [];
        let postIds: string[] = [];

        if (reward.category === "bingo_line" && reward.taskSlotIndexes) {
          taskIds = reward.taskSlotIndexes
            .map((slot) => userProgressRows.find((r) => Number(r.slot_index) === slot)?.task_id)
            .filter(Boolean);
          postIds = reward.taskSlotIndexes
            .map((slot) => userProgressRows.find((r) => Number(r.slot_index) === slot)?.post_id)
            .filter(Boolean);
        } else if (reward.category === "milestone") {
          taskIds = userProgressRows.map((r) => r.task_id).filter(Boolean);
          postIds = userProgressRows.map((r) => r.post_id).filter(Boolean);
        } else if (reward.category === "memory_drop") {
          postIds = [newPostId];
        }

        for (let i = 0; i < reward.ticketsAwarded; i++) {
          const generatedCode = generateRaffleCode();
          const claimIndex = i === 0 ? reward.lineIndex : 100 * i + reward.lineIndex;

          await sql`
            DELETE FROM public.raffle_entries
            WHERE user_id = ${user.id}::uuid
              AND line_type = ${reward.lineType}
              AND line_index = ${claimIndex}
              AND status = 'disqualified'
          `;

          const insertRes = await sql`
            WITH user_lock AS (
              SELECT pg_advisory_xact_lock(hashtext('raffle_' || ${user.id}::text))
            ),
            user_ticket_count AS (
              SELECT count(*)::int AS total
              FROM public.raffle_entries, user_lock
              WHERE user_id = ${user.id}::uuid
                AND status != 'disqualified'
            )
            INSERT INTO public.raffle_entries (
              raffle_code,
              user_id,
              line_type,
              line_index,
              task_ids,
              post_ids,
              rule_key,
              status
            )
            SELECT
              ${generatedCode},
              ${user.id}::uuid,
              ${reward.lineType},
              ${claimIndex},
              ${taskIds}::uuid[],
              ${postIds}::uuid[],
              ${reward.ruleKey},
              'valid'
            FROM user_ticket_count
            WHERE (${maxTicketsPerUser}::int <= 0 OR user_ticket_count.total < ${maxTicketsPerUser}::int)
            ON CONFLICT (user_id, line_type, line_index) DO NOTHING
            RETURNING id
          `;

          if (insertRes.length > 0) {
            newRaffleCode = generatedCode;
          }
        }
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

    if (moderation.status === "outage_fallback" && newPostId) {
      await recordActivityLog({
        actionType: "MODERATION_OUTAGE_BYPASS",
        category: "system",
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        actorRole: user.role,
        targetId: newPostId,
        targetType: "post",
        description: `Post uploaded during OpenAI moderation service timeout or outage. Manual review recommended. (${moderation.reason || "Upstream unavailable"})`,
        metadata: {
          postId: newPostId,
          imageUrl: uploadResult.url,
          bingoTaskId,
          isAnonymous,
        },
      });
    }

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
  if (user.banned) {
    return { success: false, error: "Your account is suspended." };
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

    // Also delete the linked post, remove storage blob, and invalidate linked raffle tickets
    if (postId) {
      const deleted = await sql`
        DELETE FROM public.posts
        WHERE id = ${postId}::uuid AND user_id = ${user.id}::uuid
        RETURNING image_url
      `;
      if (deleted.length > 0 && deleted[0].image_url) {
        const key = extractStorageKey(deleted[0].image_url);
        if (key) {
          deleteBucketObject(key).catch((err) => console.error("Failed to delete removed blob:", err));
        }
      }

      await sql`
        DELETE FROM public.raffle_entries
        WHERE user_id = ${user.id}::uuid
          AND ${postId}::uuid = ANY(post_ids)
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

/**
 * Permanently delete a student post owned by the active user.
 * Cleans up linked bingo slot progress, invalidates dependent raffle tickets,
 * removes the image from storage, and writes an audit log.
 */
export async function deleteStudentPostAction(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please sign in to delete this memory." };
  }
  if (user.banned) {
    return { success: false, error: "Your account is suspended." };
  }

  try {
    // 1. Verify ownership
    const existing = await sql`
      SELECT p.id, p.user_id, p.image_url, p.caption, bt.slot_index, bt.title as task_title
      FROM public.posts p
      LEFT JOIN public.bingo_tasks bt ON p.bingo_task_id = bt.id
      WHERE p.id = ${postId}::uuid
      LIMIT 1
    `;

    if (existing.length === 0) {
      return { success: false, error: "Memory not found." };
    }

    if (existing[0].user_id !== user.id) {
      return { success: false, error: "You can only delete memories that you own." };
    }

    const post = existing[0];

    // 2. Clear any bingo progress linked to this post
    await sql`
      DELETE FROM public.user_bingo_progress
      WHERE user_id = ${user.id}::uuid AND post_id = ${postId}::uuid
    `;

    // 3. Invalidate/delete any raffle tickets earned using this post
    await sql`
      DELETE FROM public.raffle_entries
      WHERE user_id = ${user.id}::uuid
        AND ${postId}::uuid = ANY(post_ids)
    `;

    // 4. Delete the post row
    await sql`
      DELETE FROM public.posts
      WHERE id = ${postId}::uuid AND user_id = ${user.id}::uuid
    `;

    // 5. Delete storage blob if present
    if (post.image_url) {
      const key = extractStorageKey(post.image_url);
      if (key) {
        deleteBucketObject(key).catch((err) =>
          console.error("Failed to delete removed memory blob:", err)
        );
      }
    }

    // 6. Record audit log
    await recordActivityLog({
      actionType: "POST_DELETE",
      category: "user",
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      targetId: postId,
      targetType: "post",
      description: `[Memory Board] Deleted memory${post.caption ? ` · "${post.caption.slice(0, 50)}"` : ""}`,
      metadata: {
        action: "delete_memory",
        postId,
        slotIndex: post.slot_index,
        taskTitle: post.task_title,
      },
    });

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev");
    revalidatePath("/dev/logs");

    return { success: true };
  } catch (err: unknown) {
    console.error("deleteStudentPostAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete memory",
    };
  }
}

/**
 * Flag / Report a photo memory for non-consensual appearance or guideline violations.
 * Inserts a report into public.photo_reports, flags the post status to 'flagged' for review,
 * and records an activity audit trail.
 */
export async function reportPhotoAction(
  postId: string,
  reason: ReportReason,
  details?: string
): Promise<{ success: boolean; error?: string }> {
  if (!postId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
    return { success: false, error: "Invalid post ID." };
  }

  if (!VALID_REPORT_REASONS.includes(reason)) {
    return { success: false, error: "Invalid report reason provided." };
  }

  const user = await getCurrentUser();
  const sanitizedDetails = (details || "").trim().slice(0, 500);

  try {
    // 1. Verify post exists
    const postRows = await sql`
      SELECT id, status, caption, display_name FROM public.posts
      WHERE id = ${postId}::uuid
      LIMIT 1
    `;

    if (postRows.length === 0) {
      return { success: false, error: "Photo memory no longer exists." };
    }

    const post = postRows[0];

    // 2. Insert report
    const reporterId = user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
      ? user.id
      : null;

    await sql`
      INSERT INTO public.photo_reports (
        post_id,
        reporter_id,
        reason,
        details,
        status,
        created_at
      )
      VALUES (
        ${postId}::uuid,
        ${reporterId ? sql`${reporterId}::uuid` : null},
        ${reason},
        ${sanitizedDetails || null},
        'pending',
        now()
      );
    `;

    // 3. Update post status to 'flagged' for review
    await sql`
      UPDATE public.posts
      SET status = 'flagged'
      WHERE id = ${postId}::uuid;
    `;

    // 4. Record activity audit log
    await recordActivityLog({
      actionType: "PHOTO_REPORT",
      category: "user",
      actorId: user?.id || null,
      actorName: user?.name || "Guest Visitor",
      actorEmail: user?.email || null,
      actorRole: user?.role || "user",
      targetId: postId,
      targetType: "post",
      description: `[Content Report] Post flagged for "${reason}"${sanitizedDetails ? `: ${sanitizedDetails}` : ""}`,
      metadata: {
        postId,
        reason,
        details: sanitizedDetails,
        postAuthor: post.display_name,
      },
    });

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev/logs");

    return { success: true };
  } catch (err: unknown) {
    console.error("reportPhotoAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit photo report",
    };
  }
}


