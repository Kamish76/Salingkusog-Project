"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { recordActivityLog } from "@/lib/activity-logger";
import { type BingoTaskRecord, CANONICAL_BINGO_SEED_TASKS } from "@/lib/bingo-engine";

export type { BingoTaskRecord };

export interface UpdateBingoTaskResult {
  success: boolean;
  error?: string;
  task?: BingoTaskRecord;
}

/**
 * Update a specific Bingo Challenge Task.
 * Strictly gated to moderators (admin) and superadmins.
 */
export async function updateBingoTaskAction(
  formData: FormData
): Promise<UpdateBingoTaskResult> {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller)) {
    return {
      success: false,
      error: "Unauthorized: SuperAdmin role required to edit bingo tasks.",
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
  if (!caller || !isSuperAdmin(caller)) {
    return {
      success: false,
      error: "Unauthorized: SuperAdmin role required to reset bingo tasks.",
    };
  }

  try {
    await sql.transaction(
      CANONICAL_BINGO_SEED_TASKS.map(
        (seed) => sql`
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
        `
      )
    );

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
