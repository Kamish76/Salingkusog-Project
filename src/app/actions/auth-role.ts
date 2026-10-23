"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

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

  // 2. Allowed assigned roles
  if (!["admin", "developer", "user"].includes(newRole)) {
    throw new Error("Invalid role specified. Only admin, developer, or user can be assigned.");
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
  revalidatePath("/");
}
