"use server";

import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ActivityLogRecord } from "@/lib/activity-logger";

export interface FetchActivityLogsParams {
  category?: string;
  actionType?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface ActivityLogsSummary {
  totalCount: number;
  userCount: number;
  adminCount: number;
  banCount: number;
}

export interface FetchActivityLogsResult {
  logs: ActivityLogRecord[];
  totalCount: number;
  hasMore: boolean;
  summary: ActivityLogsSummary;
}

export async function fetchActivityLogsAction(
  params: FetchActivityLogsParams = {}
): Promise<FetchActivityLogsResult> {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller)) {
    throw new Error("Unauthorized: SuperAdmin credentials required to access activity logs.");
  }

  const category = params.category?.trim() || "all";
  const actionType = params.actionType?.trim() || "";
  const search = params.search?.trim() || "";
  const offset = Math.max(0, Number(params.offset) || 0);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));

  if (!process.env.DATABASE_URL) {
    return {
      logs: [],
      totalCount: 0,
      hasMore: false,
      summary: {
        totalCount: 0,
        userCount: 0,
        adminCount: 0,
        banCount: 0,
      },
    };
  }

  const filterCategory = category && category !== "all" ? category : null;
  const filterActionType = actionType && actionType !== "all" ? actionType : null;
  const searchPattern = search ? `%${search}%` : null;

  try {
    // 1. Fetch counts / summary
    const summaryRows = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE category = 'user') as user_count,
        COUNT(*) FILTER (WHERE category = 'admin') as admin_count,
        COUNT(*) FILTER (WHERE action_type = 'USER_BAN') as ban_count
      FROM public.activity_logs
    `;

    const summary: ActivityLogsSummary = {
      totalCount: Number(summaryRows[0]?.total || 0),
      userCount: Number(summaryRows[0]?.user_count || 0),
      adminCount: Number(summaryRows[0]?.admin_count || 0),
      banCount: Number(summaryRows[0]?.ban_count || 0),
    };

    // 2. Fetch filtered total count
    const countRows = await sql`
      SELECT COUNT(*) as filtered_count
      FROM public.activity_logs
      WHERE (${filterCategory}::text IS NULL OR category = ${filterCategory})
        AND (${filterActionType}::text IS NULL OR action_type = ${filterActionType})
        AND (
          ${searchPattern}::text IS NULL
          OR actor_name ILIKE ${searchPattern}
          OR actor_email ILIKE ${searchPattern}
          OR description ILIKE ${searchPattern}
          OR target_id ILIKE ${searchPattern}
        )
    `;
    const filteredTotal = Number(countRows[0]?.filtered_count || 0);

    // 3. Fetch paginated records
    const rows = await sql`
      SELECT 
        id,
        action_type,
        category,
        actor_id,
        actor_name,
        actor_email,
        actor_role,
        target_id,
        target_type,
        description,
        metadata,
        created_at
      FROM public.activity_logs
      WHERE (${filterCategory}::text IS NULL OR category = ${filterCategory})
        AND (${filterActionType}::text IS NULL OR action_type = ${filterActionType})
        AND (
          ${searchPattern}::text IS NULL
          OR actor_name ILIKE ${searchPattern}
          OR actor_email ILIKE ${searchPattern}
          OR description ILIKE ${searchPattern}
          OR target_id ILIKE ${searchPattern}
        )
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    interface RawLogRow {
      id: string;
      action_type: string;
      category: string;
      actor_id: string | null;
      actor_name: string | null;
      actor_email: string | null;
      actor_role: string | null;
      target_id: string | null;
      target_type: string | null;
      description: string;
      metadata: Record<string, unknown> | null;
      created_at: string | Date;
    }

    const logs: ActivityLogRecord[] = (rows as unknown as RawLogRow[]).map((r) => ({
      id: r.id,
      actionType: r.action_type as ActivityLogRecord["actionType"],
      category: r.category as ActivityLogRecord["category"],
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorEmail: r.actor_email,
      actorRole: r.actor_role,
      targetId: r.target_id,
      targetType: r.target_type,
      description: r.description,
      metadata: (r.metadata && typeof r.metadata === "object") ? r.metadata : {},
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));

    return {
      logs,
      totalCount: filteredTotal,
      hasMore: offset + logs.length < filteredTotal,
      summary,
    };
  } catch (error) {
    console.error("fetchActivityLogsAction error:", error);
    throw new Error("Failed to load activity logs.");
  }
}
