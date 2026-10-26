import { sql } from "@/lib/db";

export type ActivityCategory = "user" | "admin" | "system";

export type ActivityActionType =
  | "USER_REGISTER"
  | "POST_SUBMIT"
  | "POST_DELETE"
  | "USER_BAN"
  | "USER_UNBAN"
  | "ROLE_UPDATE"
  | "POST_MODERATE"
  | "MODERATION_OUTAGE_BYPASS"
  | "RAFFLE_TOGGLE"
  | "EVENT_DAY_UPDATE"
  | "EVENT_STATUS_TOGGLE"
  | "BINGO_TASK_UPDATE"
  | "BINGO_TASKS_RESET"
  | "RAFFLE_RULE_UPDATE"
  | "RAFFLE_GLOBAL_CONFIG_UPDATE"
  | "RAFFLE_RULES_RESET"
  | "CONSENT_AGREE"
  | "CONSENT_UPDATE"
  | "ACCOUNT_WIPEOUT"
  | "PHOTO_REPORT";

export interface LogActivityParams {
  actionType: ActivityActionType;
  category: ActivityCategory;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetId?: string | null;
  targetType?: "user" | "post" | "system" | string | null;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityLogRecord {
  id: string;
  actionType: ActivityActionType;
  category: ActivityCategory;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetId: string | null;
  targetType: string | null;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Record an activity or audit log.
 * Resilient & non-blocking: Never throws, ensuring core operations remain stable.
 */
export async function recordActivityLog(params: LogActivityParams): Promise<void> {
  try {
    const actorIdValid = params.actorId && UUID_REGEX.test(params.actorId) ? params.actorId : null;
    const metadataJson = JSON.stringify(params.metadata || {});

    if (process.env.DATABASE_URL) {
      if (actorIdValid) {
        await sql`
          INSERT INTO public.activity_logs (
            action_type,
            category,
            actor_id,
            actor_name,
            actor_email,
            actor_role,
            target_id,
            target_type,
            description,
            metadata
          ) VALUES (
            ${params.actionType},
            ${params.category},
            ${actorIdValid}::uuid,
            ${params.actorName || null},
            ${params.actorEmail || null},
            ${params.actorRole || null},
            ${params.targetId || null},
            ${params.targetType || null},
            ${params.description},
            ${metadataJson}::jsonb
          )
        `;
      } else {
        await sql`
          INSERT INTO public.activity_logs (
            action_type,
            category,
            actor_name,
            actor_email,
            actor_role,
            target_id,
            target_type,
            description,
            metadata
          ) VALUES (
            ${params.actionType},
            ${params.category},
            ${params.actorName || null},
            ${params.actorEmail || null},
            ${params.actorRole || null},
            ${params.targetId || null},
            ${params.targetType || null},
            ${params.description},
            ${metadataJson}::jsonb
          )
        `;
      }
    } else {
      console.log("[ActivityLog Offline]", params.actionType, params.description);
    }
  } catch (err) {
    // Non-blocking error handling
    console.error("activity-logger: Failed to record activity log:", err);
  }
}
