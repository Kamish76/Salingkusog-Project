"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isModerator } from "@/lib/auth";
import { sql } from "@/lib/db";
import { deleteBucketObject, extractStorageKey } from "@/lib/storage";
import { recordActivityLog } from "@/lib/activity-logger";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ModerationPostItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userBanned: boolean;
  imageUrl: string;
  caption: string | null;
  isAnonymous: boolean;
  displayName: string | null;
  collegeDept: string | null;
  bingoTaskId: string | null;
  bingoTaskTitle: string | null;
  status: "published" | "flagged" | "hidden";
  createdAt: string;
}

export interface ModerationActionResult {
  success: boolean;
  error?: string;
}

/**
 * Fetch posts for moderation review. Restricted to moderators and superadmins.
 */
export async function getModerationPostsAction(params: {
  status?: "published" | "flagged" | "hidden" | "all";
  search?: string;
  limit?: number;
}): Promise<ModerationPostItem[]> {
  const user = await getCurrentUser();
  if (!isModerator(user)) {
    throw new Error("Unauthorized: Moderator or SuperAdmin role required.");
  }

  if (!process.env.DATABASE_URL) {
    return [];
  }

  const statusFilter = params.status || "all";
  const limit = Math.min(params.limit || 50, 100);
  const searchPattern = params.search ? `%${params.search.trim().toLowerCase()}%` : null;

  try {
    const rows = await sql`
      SELECT 
        p.id,
        p.user_id,
        COALESCE(u.name, 'Unknown User') as user_name,
        COALESCE(u.email, 'unknown@internal') as user_email,
        COALESCE(u.role, 'user') as user_role,
        COALESCE(u.banned, false) as user_banned,
        p.image_url,
        p.caption,
        p.is_anonymous,
        p.display_name,
        p.college_dept,
        p.bingo_task_id,
        t.title as bingo_task_title,
        p.status,
        p.created_at
      FROM public.posts p
      LEFT JOIN neon_auth."user" u ON p.user_id = u.id
      LEFT JOIN public.bingo_tasks t ON p.bingo_task_id = t.id
      WHERE 
        (${statusFilter}::text = 'all' OR p.status = ${statusFilter})
        AND (
          ${searchPattern}::text IS NULL 
          OR LOWER(COALESCE(u.name, '')) LIKE ${searchPattern}
          OR LOWER(COALESCE(u.email, '')) LIKE ${searchPattern}
          OR LOWER(COALESCE(p.caption, '')) LIKE ${searchPattern}
        )
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      userName: r.user_name as string,
      userEmail: r.user_email as string,
      userRole: r.user_role as string,
      userBanned: Boolean(r.user_banned),
      imageUrl: r.image_url as string,
      caption: (r.caption as string) || null,
      isAnonymous: Boolean(r.is_anonymous),
      displayName: (r.display_name as string) || null,
      collegeDept: (r.college_dept as string) || null,
      bingoTaskId: (r.bingo_task_id as string) || null,
      bingoTaskTitle: (r.bingo_task_title as string) || null,
      status: r.status as "published" | "flagged" | "hidden",
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  } catch (err: unknown) {
    console.error("Error fetching moderation posts:", err);
    return [];
  }
}

/**
 * Hide an inappropriate post. Cascades to disqualify any linked raffle tickets
 * and removes slot completion from user bingo progress.
 */
export async function hidePostAction(
  postId: string,
  reason = "Inappropriate photo content"
): Promise<ModerationActionResult> {
  const user = await getCurrentUser();
  if (!isModerator(user)) {
    return { success: false, error: "Unauthorized: Moderator or SuperAdmin role required." };
  }

  if (!postId || !UUID_REGEX.test(postId)) {
    return { success: false, error: "Invalid post ID format." };
  }

  try {
    // 1. Mark post as hidden
    await sql`
      UPDATE public.posts
      SET status = 'hidden', updated_at = now()
      WHERE id = ${postId}::uuid
    `;

    // 2. Disqualify any valid raffle entries referencing this post
    await sql`
      UPDATE public.raffle_entries
      SET 
        status = 'disqualified',
        disqualification_reason = ${reason}
      WHERE 
        ${postId}::uuid = ANY(post_ids)
        AND status = 'valid'
    `;

    // 3. Clear from bingo grid progress
    await sql`
      DELETE FROM public.user_bingo_progress
      WHERE post_id = ${postId}::uuid
    `;

    // 4. Audit log
    await recordActivityLog({
      actionType: "POST_MODERATE",
      category: "admin",
      actorId: user?.id,
      actorName: user?.name,
      actorEmail: user?.email,
      actorRole: user?.role,
      targetId: postId,
      targetType: "post",
      description: `Moderator hid post: ${reason}`,
      metadata: { postId, action: "hide", reason },
    });

    revalidatePath("/dev/moderation");
    revalidatePath("/gallery");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to hide post:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to hide post." };
  }
}

/**
 * Restore a post back to published status.
 */
export async function restorePostAction(postId: string): Promise<ModerationActionResult> {
  const user = await getCurrentUser();
  if (!isModerator(user)) {
    return { success: false, error: "Unauthorized: Moderator or SuperAdmin role required." };
  }

  if (!postId || !UUID_REGEX.test(postId)) {
    return { success: false, error: "Invalid post ID format." };
  }

  try {
    await sql`
      UPDATE public.posts
      SET status = 'published', updated_at = now()
      WHERE id = ${postId}::uuid
    `;

    await recordActivityLog({
      actionType: "POST_MODERATE",
      category: "admin",
      actorId: user?.id,
      actorName: user?.name,
      actorEmail: user?.email,
      actorRole: user?.role,
      targetId: postId,
      targetType: "post",
      description: "Moderator restored post to published feed",
      metadata: { postId, action: "restore" },
    });

    revalidatePath("/dev/moderation");
    revalidatePath("/gallery");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to restore post:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to restore post." };
  }
}

/**
 * Permanently delete a post, purge its S3 object, and delete linked tickets.
 */
export async function deletePostPermanentlyAction(postId: string): Promise<ModerationActionResult> {
  const user = await getCurrentUser();
  if (!isModerator(user)) {
    return { success: false, error: "Unauthorized: Moderator or SuperAdmin role required." };
  }

  if (!postId || !UUID_REGEX.test(postId)) {
    return { success: false, error: "Invalid post ID format." };
  }

  try {
    // 1. Fetch image URL before deletion
    const existing = await sql`
      SELECT image_url, user_id FROM public.posts
      WHERE id = ${postId}::uuid
      LIMIT 1
    `;

    if (existing.length === 0) {
      return { success: false, error: "Post not found." };
    }

    const imageUrl = existing[0].image_url as string;

    // 2. Delete S3 object if key exists
    if (imageUrl) {
      const storageKey = extractStorageKey(imageUrl);
      if (storageKey) {
        deleteBucketObject(storageKey).catch((err) =>
          console.error("Failed to delete S3 blob during permanent post deletion:", err)
        );
      }
    }

    // 3. Delete database records (DB foreign keys cascade to user_bingo_progress)
    await sql`
      DELETE FROM public.posts
      WHERE id = ${postId}::uuid
    `;

    await sql`
      DELETE FROM public.raffle_entries
      WHERE ${postId}::uuid = ANY(post_ids)
    `;

    // 4. Audit log
    await recordActivityLog({
      actionType: "POST_DELETE",
      category: "admin",
      actorId: user?.id,
      actorName: user?.name,
      actorEmail: user?.email,
      actorRole: user?.role,
      targetId: postId,
      targetType: "post",
      description: "Moderator permanently purged post and storage object",
      metadata: { postId, imageUrl },
    });

    revalidatePath("/dev/moderation");
    revalidatePath("/gallery");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to delete post permanently:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete post." };
  }
}

/**
 * Ban a user directly from the moderation queue.
 * Cascades to hide all user's posts and disqualify all active raffle entries.
 * Administrative safety lock: Cannot ban admin or superadmin accounts.
 */
export async function banUserFromModerationAction(
  targetUserId: string,
  reason: string
): Promise<ModerationActionResult> {
  const user = await getCurrentUser();
  if (!isModerator(user)) {
    return { success: false, error: "Unauthorized: Moderator or SuperAdmin role required." };
  }

  if (!targetUserId || !UUID_REGEX.test(targetUserId)) {
    return { success: false, error: "Invalid target user ID format." };
  }

  try {
    // 1. Safety check: Protect administrative accounts
    const targetRows = await sql`
      SELECT id, role, email FROM neon_auth."user"
      WHERE id = ${targetUserId}::uuid
      LIMIT 1
    `;

    if (targetRows.length > 0) {
      const targetRole = targetRows[0].role as string;
      if (targetRole === "admin" || targetRole === "superadmin") {
        return { success: false, error: "Safety Violation: Administrative accounts cannot be banned." };
      }
    }

    // 2. Set user banned in neon_auth.user
    await sql`
      UPDATE neon_auth."user"
      SET banned = true, "banReason" = ${reason}
      WHERE id = ${targetUserId}::uuid
    `;

    // 3. Cascade hide all user's posts
    await sql`
      UPDATE public.posts
      SET status = 'hidden', updated_at = now()
      WHERE user_id = ${targetUserId}::uuid
    `;

    // 4. Disqualify all active raffle tickets
    await sql`
      UPDATE public.raffle_entries
      SET 
        status = 'disqualified',
        disqualification_reason = ${reason}
      WHERE 
        user_id = ${targetUserId}::uuid
        AND status = 'valid'
    `;

    // 5. Audit log
    await recordActivityLog({
      actionType: "USER_BAN",
      category: "admin",
      actorId: user?.id,
      actorName: user?.name,
      actorEmail: user?.email,
      actorRole: user?.role,
      targetId: targetUserId,
      targetType: "user",
      description: `Moderator suspended user account: ${reason}`,
      metadata: { targetUserId, reason },
    });

    revalidatePath("/dev/moderation");
    revalidatePath("/dev/users");
    revalidatePath("/gallery");
    revalidatePath("/");

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to ban user from moderation:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to suspend account." };
  }
}
