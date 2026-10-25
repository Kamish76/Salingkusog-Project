import { sql } from "@/lib/db";

export type ActivityCategory = "user" | "admin" | "system";

export type ActivityActionType =
  | "USER_REGISTER"
  | "POST_SUBMIT"
  | "USER_BAN"
  | "USER_UNBAN"
  | "ROLE_UPDATE"
  | "POST_MODERATE"
  | "RAFFLE_TOGGLE"
  | "BINGO_TASK_UPDATE"
  | "BINGO_TASKS_RESET";

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

// In-memory fallback buffer for mock/offline testing
const mockLogsStore: ActivityLogRecord[] = [
  {
    id: "mock_log_1",
    actionType: "USER_REGISTER",
    category: "user",
    actorId: "00000000-0000-4000-a000-000000000003",
    actorName: "Standard User",
    actorEmail: "user@salingkusog.internal",
    actorRole: "user",
    targetId: "00000000-0000-4000-a000-000000000003",
    targetType: "user",
    description: "New user registered via Google OAuth: Standard User (user@salingkusog.internal)",
    metadata: { provider: "google" },
    createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  },
  {
    id: "mock_log_2",
    actionType: "POST_SUBMIT",
    category: "user",
    actorId: "00000000-0000-4000-a000-000000000003",
    actorName: "Standard User",
    actorEmail: "user@salingkusog.internal",
    actorRole: "user",
    targetId: "mock_post_1",
    targetType: "post",
    description: "Uploaded photo submission for Bingo Slot #0 (Opening Ceremony Cheer)",
    metadata: { slotIndex: 0, taskTitle: "Opening Ceremony Cheer" },
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: "mock_log_3",
    actionType: "USER_BAN",
    category: "admin",
    actorId: "00000000-0000-4000-a000-000000000001",
    actorName: "Root SuperAdmin",
    actorEmail: "superadmin@salingkusog.internal",
    actorRole: "superadmin",
    targetId: "00000000-0000-4000-a000-000000000004",
    targetType: "user",
    description: "Banned user: spammer@salingkusog.internal. Reason: Inappropriate photo uploaded on Bingo Slot #2",
    metadata: { reason: "Inappropriate photo uploaded on Bingo Slot #2", targetEmail: "spammer@salingkusog.internal" },
    createdAt: new Date(Date.now() - 1800 * 1000).toISOString(),
  },
];

export function getMockLogsStore(): ActivityLogRecord[] {
  return mockLogsStore;
}

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
      mockLogsStore.unshift({
        id: `mock_log_${Date.now()}`,
        actionType: params.actionType,
        category: params.category,
        actorId: actorIdValid,
        actorName: params.actorName || null,
        actorEmail: params.actorEmail || null,
        actorRole: params.actorRole || null,
        targetId: params.targetId || null,
        targetType: params.targetType || null,
        description: params.description,
        metadata: params.metadata || {},
        createdAt: new Date().toISOString(),
      });
      if (mockLogsStore.length > 100) {
        mockLogsStore.pop();
      }
    }
  } catch (err) {
    // Non-blocking error handling
    console.error("activity-logger: Failed to record activity log:", err);
  }
}
