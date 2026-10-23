import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { auth } from "@/lib/auth/server";

export type UserRole = "superadmin" | "admin" | "user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned?: boolean;
  banReason?: string | null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  // 1. Live Neon Managed Better Auth session resolution
  try {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      let userRole: UserRole = "user";
      let isBanned = false;
      let banReason: string | null = null;

      if (process.env.DATABASE_URL) {
        const rows = await sql`
          SELECT role, COALESCE(banned, false) as banned, "banReason" FROM neon_auth."user" 
          WHERE id = ${session.user.id}::uuid OR email = ${session.user.email} 
          LIMIT 1
        `;
        if (rows.length > 0) {
          if (rows[0].role) {
            const dbRole = rows[0].role as string;
            if (dbRole === "superadmin" || dbRole === "admin" || dbRole === "user") {
              userRole = dbRole;
            }
          }
          isBanned = Boolean(rows[0].banned);
          banReason = (rows[0].banReason as string) || null;
        }
      }

      return {
        id: session.user.id,
        name: session.user.name || "Authenticated User",
        email: session.user.email,
        role: userRole,
        banned: isBanned,
        banReason,
      };
    }
  } catch (err: unknown) {
    // If Next.js signals dynamic render bailout, rethrow to allow Next.js runtime to switch properly
    const errorObj = err as { digest?: string };
    if (
      typeof errorObj?.digest === "string" &&
      (errorObj.digest.startsWith("DYNAMIC_SERVER_USAGE") ||
        errorObj.digest === "HANGING_PROMISE_REJECTION")
    ) {
      throw err;
    }
  }

  // 2. Dev role simulator fallback for offline/local testing
  const cookieStore = await cookies();
  const devRole = cookieStore.get("dev_role")?.value as UserRole | undefined;

  if (!devRole) {
    return null; // Guest / Unauthenticated
  }

  return {
    id: `usr_${devRole}_1`,
    name:
      devRole === "superadmin"
        ? "Root SuperAdmin"
        : devRole === "admin"
        ? "Admin (Moderator)"
        : "Standard User",
    email: `${devRole}@salingkusog.internal`,
    role: devRole,
  };
}

export function isModerator(user: AuthUser | null): boolean {
  return user?.role === "superadmin" || user?.role === "admin";
}

export function isDevAuthorized(user: AuthUser | null): boolean {
  return isModerator(user);
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.role === "superadmin";
}

export function isUserBanned(user: AuthUser | null): boolean {
  return Boolean(user?.banned);
}
