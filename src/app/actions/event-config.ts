"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { recordActivityLog } from "@/lib/activity-logger";

/**
 * Toggle the live raffle system active status.
 * Restricted strictly to SuperAdmin.
 */
export async function toggleRaffleStatusAction(formData: FormData) {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller)) {
    throw new Error("Unauthorized: Only superadmin accounts can toggle the raffle system.");
  }

  const enabled = formData.get("enabled") === "true";

  await sql`
    UPDATE public.event_config
    SET 
      is_raffle_active = ${enabled},
      updated_at = now(),
      updated_by = ${caller.id}::uuid
    WHERE key = 'active_event'
  `;

  await recordActivityLog({
    actionType: "RAFFLE_TOGGLE",
    category: "system",
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    targetId: "active_event",
    targetType: "system",
    description: `SuperAdmin ${caller.name} switched raffle drawings to ${enabled ? "ACTIVE" : "PAUSED"}`,
    metadata: { enabled },
  });

  revalidatePath("/");
  revalidatePath("/dev");
  revalidatePath("/dev/tools/raffle");
}

/**
 * Set the current active intramurals event day (1, 2, or 3).
 * Restricted strictly to SuperAdmin.
 */
export async function setCurrentDayAction(formDataOrDay: FormData | number) {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller)) {
    throw new Error("Unauthorized: Only superadmin accounts can adjust the current event day.");
  }

  let day: number;
  if (typeof formDataOrDay === "number") {
    day = formDataOrDay;
  } else {
    day = parseInt(formDataOrDay.get("day")?.toString() || "1", 10);
  }

  if (isNaN(day) || day < 1 || day > 3) {
    throw new Error("Invalid event day: must be 1, 2, or 3.");
  }

  await sql`
    UPDATE public.event_config
    SET 
      current_day = ${day},
      updated_at = now(),
      updated_by = ${caller.id}::uuid
    WHERE key = 'active_event'
  `;

  await recordActivityLog({
    actionType: "EVENT_DAY_UPDATE",
    category: "system",
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    targetId: "active_event",
    targetType: "system",
    description: `SuperAdmin ${caller.name} set active intramurals day to Day ${day}`,
    metadata: { currentDay: day },
  });

  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/dev");
  revalidatePath("/dev/tools/bingo");
  revalidatePath("/dev/tools/raffle");

  return { success: true, day };
}

/**
 * Toggle the overall event status (active vs paused/ended).
 * Restricted strictly to SuperAdmin.
 */
export async function toggleEventStatusAction(formData: FormData) {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller)) {
    throw new Error("Unauthorized: Only superadmin accounts can toggle the event status.");
  }

  const enabled = formData.get("enabled") === "true";

  await sql`
    UPDATE public.event_config
    SET 
      is_event_active = ${enabled},
      updated_at = now(),
      updated_by = ${caller.id}::uuid
    WHERE key = 'active_event'
  `;

  await recordActivityLog({
    actionType: "EVENT_STATUS_TOGGLE",
    category: "system",
    actorId: caller.id,
    actorName: caller.name,
    actorEmail: caller.email,
    actorRole: caller.role,
    targetId: "active_event",
    targetType: "system",
    description: `SuperAdmin ${caller.name} switched event status to ${enabled ? "ACTIVE" : "PAUSED"}`,
    metadata: { isEventActive: enabled },
  });

  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/dev");
  revalidatePath("/dev/tools/bingo");
  revalidatePath("/dev/tools/raffle");

  return { success: true, isEventActive: enabled };
}

