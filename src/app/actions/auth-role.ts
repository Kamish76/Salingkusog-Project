"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getCurrentUser, isSuperAdmin, isDevAuthorized, isModerator } from "@/lib/auth";

export async function setDevRole(role: string) {
  const cookieStore = await cookies();
  if (!role || role === "guest") {
    cookieStore.delete("dev_role");
  } else {
    cookieStore.set("dev_role", role, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  revalidatePath("/");
  revalidatePath("/dev");
}

export async function setDevRoleAction(formData: FormData) {
  const role = formData.get("role")?.toString() || "guest";
  await setDevRole(role);
}

export async function updateUserRoleAction(formData: FormData) {
  const targetUserId = formData.get("targetUserId")?.toString();
  const newRole = formData.get("newRole")?.toString();

  if (!targetUserId || !newRole) {
    throw new Error("Missing target user ID or new role.");
  }

  // 1. Authorize caller: strictly superadmin
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller)) {
    throw new Error("Unauthorized: Only superadmin accounts can assign roles.");
  }

  // 2. Allowed assigned roles: superadmin can promote/demote between admin (moderator) and user
  if (!["admin", "user"].includes(newRole)) {
    throw new Error("Invalid role specified. Only admin or user can be assigned.");
  }

  // 3. Guardrail: Protect root superadmin from alteration or demotion
  const targetUsers = await sql`
    SELECT id, email, role FROM neon_auth."user" WHERE id = ${targetUserId} LIMIT 1
  `;

  if (targetUsers.length === 0) {
    throw new Error("Target user does not exist.");
  }

  if (targetUsers[0].role === "superadmin") {
    throw new Error("Forbidden: Root superadmin cannot be modified or demoted.");
  }

  // 4. Update role in neon_auth.user
  await sql`
    UPDATE neon_auth."user"
    SET role = ${newRole}, "updatedAt" = NOW()
    WHERE id = ${targetUserId}
  `;

  revalidatePath("/dev");
  revalidatePath("/dev/users");
  revalidatePath("/");
}

export async function elevateToSuperAdminAction() {
  const caller = await getCurrentUser();
  if (!caller) {
    throw new Error("Unauthorized: Unauthenticated.");
  }

  // Only accounts with Admin role (or root account) can elevate to SuperAdmin
  if (caller.role !== "admin") {
    throw new Error("Forbidden: Only accounts with Admin role can elevate to SuperAdmin.");
  }

  await sql`
    UPDATE neon_auth."user"
    SET role = 'superadmin', "updatedAt" = NOW()
    WHERE email = ${caller.email}
  `;

  revalidatePath("/dev");
  revalidatePath("/dev/users");
  revalidatePath("/");
}

export interface FetchUsersParams {
  search?: string;
  role?: string;
  status?: string; // "all" | "active" | "banned"
  offset?: number;
  limit?: number;
}

export interface ManagedUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason?: string | null;
  submissionCount: number;
  createdAt: string;
}

export interface FetchUsersResult {
  users: ManagedUserRecord[];
  totalCount: number;
  hasMore: boolean;
}

export async function fetchUsersAction(
  params: FetchUsersParams = {}
): Promise<FetchUsersResult> {
  const caller = await getCurrentUser();
  if (!caller || !isDevAuthorized(caller)) {
    throw new Error("Unauthorized: Dev or Moderator access required.");
  }

  const search = params.search?.trim() || "";
  const role = params.role?.trim() || "";
  const status = params.status?.trim() || "all";
  const offset = Math.max(0, Number(params.offset) || 0);
  const limit = Math.max(1, Math.min(50, Number(params.limit) || 5));
  const callerEmail = caller?.email || null;

  if (!process.env.DATABASE_URL) {
    const mockUsers: ManagedUserRecord[] = [
      { id: "usr_superadmin_1", name: "Root SuperAdmin", email: "superadmin@salingkusog.internal", role: "superadmin", banned: false, banReason: null, submissionCount: 0, createdAt: "10/23/2026" },
      { id: "usr_admin_1", name: "Admin (Moderator)", email: "admin@salingkusog.internal", role: "admin", banned: false, banReason: null, submissionCount: 2, createdAt: "10/23/2026" },
      { id: "usr_user_1", name: "Standard User", email: "user@salingkusog.internal", role: "user", banned: false, banReason: null, submissionCount: 4, createdAt: "10/23/2026" },
      { id: "usr_user_banned", name: "Troublemaker Account", email: "spammer@salingkusog.internal", role: "user", banned: true, banReason: "Inappropriate photo uploaded on Bingo Slot #2", submissionCount: 1, createdAt: "10/23/2026" },
    ];
    const filtered = mockUsers.filter((u) => {
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = !role || role === "all" || u.role === role;
      const matchesStatus =
        !status ||
        status === "all" ||
        (status === "banned" && u.banned) ||
        (status === "active" && !u.banned);
      return matchesSearch && matchesRole && matchesStatus;
    });
    // Order own credential first, then newest
    filtered.sort((a, b) => {
      if (a.email === callerEmail) return -1;
      if (b.email === callerEmail) return 1;
      return 0;
    });
    const paged = filtered.slice(offset, offset + limit);
    return {
      users: paged,
      totalCount: filtered.length,
      hasMore: offset + paged.length < filtered.length,
    };
  }

  const searchPattern = search ? `%${search}%` : null;
  const filterRole = role && role !== "all" ? role : null;
  const filterStatus = status && status !== "all" ? status : null;

  try {
    const countRows = await sql`
      SELECT COUNT(*) as count
      FROM neon_auth."user" u
      WHERE (${searchPattern}::text IS NULL OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
        AND (${filterRole}::text IS NULL OR COALESCE(u.role, 'user') = ${filterRole})
        AND (
          ${filterStatus}::text IS NULL 
          OR (${filterStatus} = 'banned' AND u.banned = true) 
          OR (${filterStatus} = 'active' AND (u.banned IS NULL OR u.banned = false))
        )
    `;
    const totalCount = Number(countRows[0]?.count || 0);

    const rows = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        COALESCE(u.role, 'user') as role, 
        COALESCE(u.banned, false) as banned,
        u."banReason" as "banReason",
        u."createdAt",
        COALESCE((
          SELECT COUNT(*) 
          FROM public.posts p 
          WHERE p.user_id = u.id AND p.is_bingo_entry = true
        ), 0) as "submissionCount"
      FROM neon_auth."user" u
      WHERE (${searchPattern}::text IS NULL OR u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
        AND (${filterRole}::text IS NULL OR COALESCE(u.role, 'user') = ${filterRole})
        AND (
          ${filterStatus}::text IS NULL 
          OR (${filterStatus} = 'banned' AND u.banned = true) 
          OR (${filterStatus} = 'active' AND (u.banned IS NULL OR u.banned = false))
        )
      ORDER BY 
        CASE WHEN u.email = ${callerEmail} THEN 0 ELSE 1 END,
        u."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    interface RawRow {
      id: string;
      name: string | null;
      email: string;
      role: string | null;
      banned: boolean | null;
      banReason: string | null;
      createdAt: string | Date | null;
      submissionCount: string | number | null;
    }

    const users: ManagedUserRecord[] = (rows as unknown as RawRow[]).map((r) => ({
      id: r.id,
      name: r.name || "Unnamed User",
      email: r.email,
      role: r.role || "user",
      banned: Boolean(r.banned),
      banReason: r.banReason || null,
      submissionCount: Number(r.submissionCount || 0),
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Unknown",
    }));

    return {
      users,
      totalCount,
      hasMore: offset + users.length < totalCount,
    };
  } catch (error) {
    console.error("fetchUsersAction error:", error);
    throw new Error("Failed to fetch user accounts.");
  }
}

export async function banUserAction(formData: FormData) {
  const targetUserId = formData.get("targetUserId")?.toString();
  const reason = formData.get("reason")?.toString()?.trim();

  if (!targetUserId || !reason) {
    throw new Error("Missing target user ID or ban reason.");
  }

  // 1. Authorize caller: Admins and SuperAdmins can moderate
  const caller = await getCurrentUser();
  if (!caller || !isModerator(caller)) {
    throw new Error("Unauthorized: Only Admins or SuperAdmins can ban users.");
  }

  // 2. Prevent self-ban
  if (caller.id === targetUserId || caller.email === targetUserId) {
    throw new Error("Forbidden: You cannot ban your own account.");
  }

  // 3. Prevent banning root superadmin or active admin accounts
  if (process.env.DATABASE_URL) {
    const targetUsers = await sql`
      SELECT id, email, role FROM neon_auth."user" WHERE id = ${targetUserId}::uuid LIMIT 1
    `;
    if (targetUsers.length === 0) {
      throw new Error("Target user does not exist.");
    }
    const targetRole = targetUsers[0].role;
    if (targetRole === "superadmin" || targetRole === "admin") {
      throw new Error("Forbidden: SuperAdmin and Admin accounts cannot be banned.");
    }

    // 4. Update user to banned and record ban reason
    await sql`
      UPDATE neon_auth."user"
      SET banned = true, "banReason" = ${reason}, "updatedAt" = NOW()
      WHERE id = ${targetUserId}::uuid
    `;

    // 5. Invalidate active sessions for immediate logout
    await sql`
      DELETE FROM neon_auth."session"
      WHERE "userId" = ${targetUserId}::uuid
    `;
  }

  revalidatePath("/dev/users");
  revalidatePath("/dev");
  revalidatePath("/");
}

export async function unbanUserAction(formData: FormData) {
  const targetUserId = formData.get("targetUserId")?.toString();

  if (!targetUserId) {
    throw new Error("Missing target user ID.");
  }

  const caller = await getCurrentUser();
  if (!caller || !isModerator(caller)) {
    throw new Error("Unauthorized: Only Admins or SuperAdmins can unban users.");
  }

  if (process.env.DATABASE_URL) {
    await sql`
      UPDATE neon_auth."user"
      SET banned = false, "banReason" = NULL, "updatedAt" = NOW()
      WHERE id = ${targetUserId}::uuid
    `;
  }

  revalidatePath("/dev/users");
  revalidatePath("/dev");
  revalidatePath("/");
}

export interface UserBingoSubmission {
  postId: string;
  imageUrl: string;
  caption: string | null;
  status: string; // 'published' | 'flagged' | 'hidden'
  createdAt: string;
  slotIndex: number | null;
  taskTitle: string | null;
  taskDescription: string | null;
}

export async function fetchUserSubmissionsAction(
  targetUserId: string
): Promise<UserBingoSubmission[]> {
  const caller = await getCurrentUser();
  if (!caller || !isModerator(caller)) {
    throw new Error("Unauthorized: Moderator access required to view submissions.");
  }

  if (!process.env.DATABASE_URL) {
    return [
      {
        postId: "mock_post_1",
        imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=80",
        caption: "Cheering for my college team at opening ceremony! #Salingkusog",
        status: "published",
        createdAt: "10/23/2026, 10:15 AM",
        slotIndex: 0,
        taskTitle: "Opening Ceremony Cheer",
        taskDescription: "Snap a selfie cheering at the intramurals parade or opening ceremony.",
      },
      {
        postId: "mock_post_2",
        imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80",
        caption: "Courtside watching volleyball qualifiers!",
        status: "published",
        createdAt: "10/23/2026, 11:30 AM",
        slotIndex: 3,
        taskTitle: "Ball Games Sideline Cheer",
        taskDescription: "Watch any basketball, volleyball, or soccer match and snap a courtside selfie.",
      },
    ];
  }

  try {
    const rows = await sql`
      SELECT 
        p.id as post_id,
        p.image_url,
        p.caption,
        p.status,
        p.created_at,
        t.slot_index,
        t.title as task_title,
        t.description as task_description
      FROM public.posts p
      LEFT JOIN public.bingo_tasks t ON p.bingo_task_id = t.id
      WHERE p.user_id = ${targetUserId}::uuid AND p.is_bingo_entry = true
      ORDER BY p.created_at DESC
    `;

    interface SubmissionRow {
      post_id: string;
      image_url: string;
      caption: string | null;
      status: string;
      created_at: string | Date;
      slot_index: number | null;
      task_title: string | null;
      task_description: string | null;
    }

    return (rows as unknown as SubmissionRow[]).map((r) => ({
      postId: r.post_id,
      imageUrl: r.image_url,
      caption: r.caption,
      status: r.status,
      createdAt: r.created_at ? new Date(r.created_at).toLocaleString() : "Unknown",
      slotIndex: r.slot_index,
      taskTitle: r.task_title || "Bingo Challenge",
      taskDescription: r.task_description || "",
    }));
  } catch (error) {
    console.error("fetchUserSubmissionsAction error:", error);
    throw new Error("Failed to load user submissions.");
  }
}

export async function moderateSubmissionAction(
  postId: string,
  newStatus: "published" | "hidden"
) {
  const caller = await getCurrentUser();
  if (!caller || !isModerator(caller)) {
    throw new Error("Unauthorized: Only moderators can update submission status.");
  }

  if (process.env.DATABASE_URL) {
    await sql`
      UPDATE public.posts
      SET status = ${newStatus}, updated_at = NOW()
      WHERE id = ${postId}::uuid
    `;
  }

  revalidatePath("/dev/users");
}
