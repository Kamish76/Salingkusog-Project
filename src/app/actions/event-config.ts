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
}
