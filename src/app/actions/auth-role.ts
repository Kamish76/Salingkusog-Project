"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getCurrentUser, isSuperAdmin, isDevAuthorized } from "@/lib/auth";

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
  offset?: number;
  limit?: number;
}

export interface ManagedUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
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
  const offset = Math.max(0, Number(params.offset) || 0);
  const limit = Math.max(1, Math.min(50, Number(params.limit) || 10));

  if (!process.env.DATABASE_URL) {
    const mockUsers: ManagedUserRecord[] = [
      { id: "usr_superadmin_1", name: "Root SuperAdmin", email: "superadmin@salingkusog.internal", role: "superadmin", createdAt: "10/23/2026" },
      { id: "usr_admin_1", name: "Admin (Moderator)", email: "admin@salingkusog.internal", role: "admin", createdAt: "10/23/2026" },
      { id: "usr_user_1", name: "Standard User", email: "user@salingkusog.internal", role: "user", createdAt: "10/23/2026" },
    ];
    const filtered = mockUsers.filter((u) => {
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = !role || role === "all" || u.role === role;
      return matchesSearch && matchesRole;
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

  try {
    const countRows = await sql`
      SELECT COUNT(*) as count
      FROM neon_auth."user"
      WHERE (${searchPattern}::text IS NULL OR name ILIKE ${searchPattern} OR email ILIKE ${searchPattern})
        AND (${filterRole}::text IS NULL OR COALESCE(role, 'user') = ${filterRole})
    `;
    const totalCount = Number(countRows[0]?.count || 0);

    const rows = await sql`
      SELECT id, name, email, COALESCE(role, 'user') as role, "createdAt"
      FROM neon_auth."user"
      WHERE (${searchPattern}::text IS NULL OR name ILIKE ${searchPattern} OR email ILIKE ${searchPattern})
        AND (${filterRole}::text IS NULL OR COALESCE(role, 'user') = ${filterRole})
      ORDER BY "createdAt" ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    interface RawRow {
      id: string;
      name: string | null;
      email: string;
      role: string | null;
      createdAt: string | Date | null;
    }

    const users: ManagedUserRecord[] = (rows as unknown as RawRow[]).map((r) => ({
      id: r.id,
      name: r.name || "Unnamed User",
      email: r.email,
      role: r.role || "user",
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
