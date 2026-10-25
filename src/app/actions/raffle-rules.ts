"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { sql } from "@/lib/db";
import { recordActivityLog } from "@/lib/activity-logger";
import { type RaffleRuleRecord, type RaffleRuleCategory } from "@/lib/bingo-engine";

export interface UpdateRaffleRuleResult {
  success: boolean;
  error?: string;
  rule?: RaffleRuleRecord;
}

export interface UpdateRaffleGlobalConfigResult {
  success: boolean;
  error?: string;
}

const CANONICAL_RAFFLE_RULES: Omit<RaffleRuleRecord, "id">[] = [
  {
    ruleKey: "line_row",
    name: "Horizontal Row Completion",
    category: "bingo_line",
    description: "Awarded when a student completes all 3 challenges in any horizontal row.",
    ticketsAwarded: 1,
    isActive: true,
  },
  {
    ruleKey: "line_column",
    name: "Vertical Column Completion",
    category: "bingo_line",
    description: "Awarded when a student completes all 3 challenges in any vertical column.",
    ticketsAwarded: 1,
    isActive: true,
  },
  {
    ruleKey: "line_diagonal",
    name: "Diagonal Line Completion",
    category: "bingo_line",
    description: "Awarded when a student completes all 3 challenges across the main or anti-diagonal.",
    ticketsAwarded: 1,
    isActive: true,
  },
  {
    ruleKey: "line_blackout",
    name: "Full Card Blackout",
    category: "bingo_line",
    description: "Bonus raffle ticket awarded when a student completes all 9 slots on their bingo card.",
    ticketsAwarded: 2,
    isActive: true,
  },
  {
    ruleKey: "milestone_3",
    name: "Bronze Milestone (Any 3 Slots)",
    category: "milestone",
    description: "Awarded upon completing any 3 challenge slots on the bingo card, regardless of line alignment.",
    ticketsAwarded: 1,
    isActive: true,
  },
  {
    ruleKey: "milestone_6",
    name: "Silver Milestone (Any 6 Slots)",
    category: "milestone",
    description: "Awarded upon completing any 6 challenge slots across the intramurals event days.",
    ticketsAwarded: 1,
    isActive: true,
  },
  {
    ruleKey: "memory_drop",
    name: "Campus Memory Drop",
    category: "memory_drop",
    description: "Bonus ticket awarded when dropping a general campus spirit photo to the public scrapbook board.",
    ticketsAwarded: 1,
    isActive: false,
  },
];

/**
 * Update a specific Raffle Rule configuration.
 * Gated strictly to moderators (admin) and superadmins.
 */
export async function updateRaffleRuleAction(
  formData: FormData
): Promise<UpdateRaffleRuleResult> {
  const caller = await getCurrentUser();
  if (!caller || !isDevAuthorized(caller)) {
    return {
      success: false,
      error: "Unauthorized: Only moderator or superadmin accounts can edit raffle rules.",
    };
  }

  const ruleId = formData.get("ruleId")?.toString()?.trim();
  const ruleKey = formData.get("ruleKey")?.toString()?.trim();
  const name = formData.get("name")?.toString()?.trim();
  const description = formData.get("description")?.toString()?.trim() || "";
  const ticketsAwardedRaw = formData.get("ticketsAwarded")?.toString();
  const isActive = formData.get("isActive") === "true";

  if (!ruleId && !ruleKey) {
    return { success: false, error: "Rule ID or Rule Key is required." };
  }

  const ticketsAwarded = ticketsAwardedRaw ? parseInt(ticketsAwardedRaw, 10) : 1;
  if (isNaN(ticketsAwarded) || ticketsAwarded < 1 || ticketsAwarded > 10) {
    return { success: false, error: "Tickets awarded must be between 1 and 10." };
  }

  try {
    // 1. Fetch current rule state for diff
    const currentRows = ruleId
      ? await sql`
          SELECT id, rule_key, name, category, description, tickets_awarded, is_active
          FROM public.raffle_rules
          WHERE id = ${ruleId}::uuid
          LIMIT 1
        `
      : await sql`
          SELECT id, rule_key, name, category, description, tickets_awarded, is_active
          FROM public.raffle_rules
          WHERE rule_key = ${ruleKey}
          LIMIT 1
        `;

    if (currentRows.length === 0) {
      return { success: false, error: "Raffle rule not found in database." };
    }

    const previous = currentRows[0];
    const targetId = previous.id;

    // 2. Perform database update
    const updatedRows = await sql`
      UPDATE public.raffle_rules
      SET 
        name = COALESCE(${name && name.length > 0 ? name : null}, name),
        description = ${description},
        tickets_awarded = ${ticketsAwarded},
        is_active = ${isActive},
        updated_at = now()
      WHERE id = ${targetId}::uuid
      RETURNING id, rule_key, name, category, description, tickets_awarded, is_active
    `;

    const updated = updatedRows[0];
    const ruleRecord: RaffleRuleRecord = {
      id: updated.id,
      ruleKey: updated.rule_key,
      name: updated.name,
      category: updated.category as RaffleRuleCategory,
      description: updated.description,
      ticketsAwarded: Number(updated.tickets_awarded),
      isActive: Boolean(updated.is_active),
    };

    // 3. Record audit activity log
    await recordActivityLog({
      actionType: "RAFFLE_RULE_UPDATE",
      category: "admin",
      actorId: caller.id,
      actorName: caller.name,
      actorEmail: caller.email,
      actorRole: caller.role,
      targetId: updated.id,
      targetType: "raffle_rule",
      description: `Updated Raffle Rule "${ruleRecord.name}" (${isActive ? "ENABLED" : "DISABLED"}, ${ticketsAwarded} ticket(s))`,
      metadata: {
        ruleKey: ruleRecord.ruleKey,
        oldIsActive: previous.is_active,
        newIsActive: isActive,
        oldTicketsAwarded: previous.tickets_awarded,
        newTicketsAwarded: ticketsAwarded,
        oldDescription: previous.description,
        newDescription: description,
      },
    });

    // 4. Revalidate all dependent routes
    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev/tools/raffle");
    revalidatePath("/dev/tools");
    revalidatePath("/dev");

    return {
      success: true,
      rule: ruleRecord,
    };
  } catch (err: unknown) {
    console.error("Error updating raffle rule:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update raffle rule.",
    };
  }
}

/**
 * Update global raffle system configuration:
 * Active state toggle and max ticket cap per student.
 */
export async function updateRaffleGlobalConfigAction(
  formData: FormData
): Promise<UpdateRaffleGlobalConfigResult> {
  const caller = await getCurrentUser();
  if (!caller || !isDevAuthorized(caller)) {
    return {
      success: false,
      error: "Unauthorized: Only moderator or superadmin accounts can edit global raffle settings.",
    };
  }

  const isRaffleActive = formData.get("isRaffleActive") === "true";
  const maxTicketsRaw = formData.get("maxTicketsPerUser")?.toString();
  const maxTicketsPerUser = maxTicketsRaw ? parseInt(maxTicketsRaw, 10) : 0;

  if (isNaN(maxTicketsPerUser) || maxTicketsPerUser < 0) {
    return { success: false, error: "Max tickets per student must be 0 (unlimited) or a positive number." };
  }

  try {
    const currentRows = await sql`
      SELECT is_raffle_active, max_tickets_per_user
      FROM public.event_config
      WHERE key = 'active_event'
      LIMIT 1
    `;

    const previous = currentRows[0];

    await sql`
      UPDATE public.event_config
      SET 
        is_raffle_active = ${isRaffleActive},
        max_tickets_per_user = ${maxTicketsPerUser},
        updated_at = now(),
        updated_by = ${caller.id}::uuid
      WHERE key = 'active_event'
    `;

    await recordActivityLog({
      actionType: "RAFFLE_GLOBAL_CONFIG_UPDATE",
      category: "admin",
      actorId: caller.id,
      actorName: caller.name,
      actorEmail: caller.email,
      actorRole: caller.role,
      targetId: "active_event",
      targetType: "event_config",
      description: `Updated global raffle config: System is ${isRaffleActive ? "ACTIVE" : "STANDBY"}, Student Cap: ${maxTicketsPerUser === 0 ? "Unlimited" : maxTicketsPerUser}`,
      metadata: {
        oldIsRaffleActive: previous?.is_raffle_active,
        newIsRaffleActive: isRaffleActive,
        oldMaxTicketsPerUser: previous?.max_tickets_per_user,
        newMaxTicketsPerUser: maxTicketsPerUser,
      },
    });

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev/tools/raffle");
    revalidatePath("/dev/tools");
    revalidatePath("/dev");

    return { success: true };
  } catch (err: unknown) {
    console.error("Error updating global raffle config:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update global raffle settings.",
    };
  }
}

/**
 * Reset all 7 Raffle Rules to the canonical intramurals defaults.
 */
export async function resetRaffleRulesToDefaultsAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const caller = await getCurrentUser();
  if (!caller || !isDevAuthorized(caller)) {
    return {
      success: false,
      error: "Unauthorized: Only moderator or superadmin accounts can reset raffle rules.",
    };
  }

  try {
    await sql.transaction([
      ...CANONICAL_RAFFLE_RULES.map(
        (seed) => sql`
          INSERT INTO public.raffle_rules (
            rule_key, name, category, description, tickets_awarded, is_active, updated_at
          )
          VALUES (
            ${seed.ruleKey},
            ${seed.name},
            ${seed.category},
            ${seed.description},
            ${seed.ticketsAwarded},
            ${seed.isActive},
            now()
          )
          ON CONFLICT (rule_key) DO UPDATE
          SET 
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            description = EXCLUDED.description,
            tickets_awarded = EXCLUDED.tickets_awarded,
            is_active = EXCLUDED.is_active,
            updated_at = now()
        `
      ),
      sql`
        UPDATE public.event_config
        SET max_tickets_per_user = 0, updated_at = now(), updated_by = ${caller.id}::uuid
        WHERE key = 'active_event'
      `,
    ]);

    await recordActivityLog({
      actionType: "RAFFLE_RULES_RESET",
      category: "admin",
      actorId: caller.id,
      actorName: caller.name,
      actorEmail: caller.email,
      actorRole: caller.role,
      targetId: "raffle_rules_all",
      targetType: "raffle_rule",
      description: `Reset all Raffle Rules to canonical intramurals defaults (7 rules reset, cap set to unlimited)`,
      metadata: { totalRulesReset: CANONICAL_RAFFLE_RULES.length },
    });

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev/tools/raffle");
    revalidatePath("/dev/tools");
    revalidatePath("/dev");

    return { success: true };
  } catch (err: unknown) {
    console.error("Error resetting raffle rules:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reset raffle rules.",
    };
  }
}
