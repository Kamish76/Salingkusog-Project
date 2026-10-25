"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { sql } from "@/lib/db";
import { recordActivityLog } from "@/lib/activity-logger";

export interface BingoTaskRecord {
  id: string;
  slotIndex: number;
  title: string;
  description: string;
  category: string;
  unlockDay: number;
  requiresSelfie: boolean;
  isActive: boolean;
}

export interface UpdateBingoTaskResult {
  success: boolean;
  error?: string;
  task?: BingoTaskRecord;
}

export const CANONICAL_BINGO_SEED_TASKS: Omit<BingoTaskRecord, "id">[] = [
  {
    slotIndex: 0,
    title: "Opening Ceremony Cheer",
    description: "Snap a selfie cheering at the intramurals parade or opening ceremony.",
    category: "spirit",
    unlockDay: 1,
    requiresSelfie: true,
    isActive: true,
  },
  {
    slotIndex: 1,
    title: "College Booth Selfie",
    description: "Visit your college or department booth and take a selfie with the booth crew.",
    category: "booth",
    unlockDay: 1,
    requiresSelfie: true,
    isActive: true,
  },
  {
    slotIndex: 2,
    title: "Team Mascot High-Five",
    description: "Find the university or college mascot and snap a selfie or photo high-fiving them.",
    category: "spirit",
    unlockDay: 1,
    requiresSelfie: true,
    isActive: true,
  },
  {
    slotIndex: 3,
    title: "Ball Games Sideline Cheer",
    description: "Watch any basketball, volleyball, or soccer match and snap a courtside selfie.",
    category: "sports",
    unlockDay: 2,
    requiresSelfie: true,
    isActive: true,
  },
  {
    slotIndex: 4,
    title: "University Color Swag",
    description: "Wear your college department colors or university shirt and snap a selfie.",
    category: "culture",
    unlockDay: 2,
    requiresSelfie: true,
    isActive: true,
  },
  {
    slotIndex: 5,
    title: "Campus Snack Break",
    description: "Buy a snack or drink from a student-run booth and snap a foodie selfie.",
    category: "booth",
    unlockDay: 2,
    requiresSelfie: true,
    isActive: true,
  },
  {
    slotIndex: 6,
    title: "Athletic Action Moment",
    description: "Catch a live sports action moment or cheer on your department athletes.",
    category: "sports",
    unlockDay: 3,
    requiresSelfie: true,
    isActive: true,
  },
  {
    slotIndex: 7,
    title: "Friendship / Squad Photo",
    description: "Take a selfie with at least two friends or teammates at the sports complex.",
    category: "spirit",
    unlockDay: 3,
    requiresSelfie: true,
    isActive: true,
  },
  {
    slotIndex: 8,
    title: "Championship Trophy / Stage",
    description: "Snap a selfie in front of the main stage, awards podium, or trophy table.",
    category: "culture",
    unlockDay: 3,
    requiresSelfie: true,
    isActive: true,
  },
];

/**
 * Update a specific Bingo Challenge Task.
 * Strictly gated to moderators (admin) and superadmins.
 */
export async function updateBingoTaskAction(
  formData: FormData
): Promise<UpdateBingoTaskResult> {
  const caller = await getCurrentUser();
  if (!caller || !isDevAuthorized(caller)) {
    return {
      success: false,
      error: "Unauthorized: Only moderator or superadmin accounts can edit bingo tasks.",
    };
  }

  const taskId = formData.get("taskId")?.toString()?.trim();
  const slotIndexRaw = formData.get("slotIndex")?.toString();
  const title = formData.get("title")?.toString()?.trim();
  const description = formData.get("description")?.toString()?.trim() || "";
  const category = formData.get("category")?.toString()?.trim() || "spirit";
  const unlockDayRaw = formData.get("unlockDay")?.toString();
  const requiresSelfie = formData.get("requiresSelfie") === "true";
  const isActive = formData.get("isActive") !== "false";

  if (!taskId) {
    return { success: false, error: "Task ID is required." };
  }

  const slotIndex = slotIndexRaw ? parseInt(slotIndexRaw, 10) : NaN;
  if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 8) {
    return { success: false, error: "Slot index must be between 0 and 8." };
  }

  if (!title || title.length === 0) {
    return { success: false, error: "Task title cannot be empty." };
  }

  if (title.length > 120) {
    return { success: false, error: "Task title cannot exceed 120 characters." };
  }

  const unlockDay = unlockDayRaw ? parseInt(unlockDayRaw, 10) : 1;
  if (isNaN(unlockDay) || unlockDay < 1) {
    return { success: false, error: "Unlock day must be at least 1." };
  }

  try {
    // 1. Fetch current task for audit log difference
    const currentRows = await sql`
      SELECT id, slot_index, title, description, category, unlock_day, requires_selfie, is_active
      FROM public.bingo_tasks
      WHERE id = ${taskId}::uuid
      LIMIT 1
    `;

    if (currentRows.length === 0) {
      return { success: false, error: "Bingo task not found in database." };
    }

    const previous = currentRows[0];

    // 2. Perform database update
    const updatedRows = await sql`
      UPDATE public.bingo_tasks
      SET 
        title = ${title},
        description = ${description},
        category = ${category},
        unlock_day = ${unlockDay},
        requires_selfie = ${requiresSelfie},
        is_active = ${isActive}
      WHERE id = ${taskId}::uuid
      RETURNING id, slot_index, title, description, category, unlock_day, requires_selfie, is_active
    `;

    const updated = updatedRows[0];
    const taskRecord: BingoTaskRecord = {
      id: updated.id,
      slotIndex: Number(updated.slot_index),
      title: updated.title,
      description: updated.description,
      category: updated.category,
      unlockDay: Number(updated.unlock_day),
      requiresSelfie: Boolean(updated.requires_selfie),
      isActive: Boolean(updated.is_active),
    };

    // 3. Record audit activity
    await recordActivityLog({
      actionType: "BINGO_TASK_UPDATE",
      category: "admin",
      actorId: caller.id,
      actorName: caller.name,
      actorEmail: caller.email,
      actorRole: caller.role,
      targetId: updated.id,
      targetType: "bingo_task",
      description: `Updated Bingo Task Slot #${slotIndex + 1} ("${title}")`,
      metadata: {
        slotIndex,
        oldTitle: previous.title,
        newTitle: title,
        oldCategory: previous.category,
        newCategory: category,
        oldUnlockDay: previous.unlock_day,
        newUnlockDay: unlockDay,
        requiresSelfie,
        isActive,
      },
    });

    // 4. Revalidate all dependent routes
    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev/tools/bingo");
    revalidatePath("/dev/tools");
    revalidatePath("/dev");

    return {
      success: true,
      task: taskRecord,
    };
  } catch (err: unknown) {
    console.error("Error updating bingo task:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update bingo task.",
    };
  }
}

/**
 * Reset all 9 Bingo challenge slots to the canonical intramurals seed challenges.
 */
export async function resetBingoTasksToDefaultsAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const caller = await getCurrentUser();
  if (!caller || !isDevAuthorized(caller)) {
    return {
      success: false,
      error: "Unauthorized: Only moderator or superadmin accounts can reset bingo tasks.",
    };
  }

  try {
    for (const seed of CANONICAL_BINGO_SEED_TASKS) {
      await sql`
        INSERT INTO public.bingo_tasks (slot_index, title, description, category, unlock_day, requires_selfie, is_active)
        VALUES (
          ${seed.slotIndex},
          ${seed.title},
          ${seed.description},
          ${seed.category},
          ${seed.unlockDay},
          ${seed.requiresSelfie},
          ${seed.isActive}
        )
        ON CONFLICT (slot_index) DO UPDATE
        SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          unlock_day = EXCLUDED.unlock_day,
          requires_selfie = EXCLUDED.requires_selfie,
          is_active = EXCLUDED.is_active
      `;
    }

    await recordActivityLog({
      actionType: "BINGO_TASKS_RESET",
      category: "admin",
      actorId: caller.id,
      actorName: caller.name,
      actorEmail: caller.email,
      actorRole: caller.role,
      targetId: "bingo_tasks_all",
      targetType: "bingo_task",
      description: `Reset all 9 Bingo challenge tasks to default canonical intramurals seed challenges`,
      metadata: { totalSlotsReset: CANONICAL_BINGO_SEED_TASKS.length },
    });

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev/tools/bingo");
    revalidatePath("/dev/tools");
    revalidatePath("/dev");

    return { success: true };
  } catch (err: unknown) {
    console.error("Error resetting bingo tasks:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reset bingo tasks.",
    };
  }
}
