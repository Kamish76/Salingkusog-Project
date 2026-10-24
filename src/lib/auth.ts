import { sql } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { recordActivityLog } from "@/lib/activity-logger";

export type UserRole = "superadmin" | "admin" | "user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned?: boolean;
  banReason?: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCurrentUser(): Promise<AuthUser | null> {
  // Live Neon Managed Better Auth session resolution (Google OAuth)
  try {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      let userRole: UserRole = "user";
      let isBanned = false;
      let banReason: string | null = null;

      if (process.env.DATABASE_URL) {
        const isIdUuid = session.user.id && UUID_REGEX.test(session.user.id);
        const rows = isIdUuid
          ? await sql`
              SELECT role, COALESCE(banned, false) as banned, "banReason", "createdAt" FROM neon_auth."user" 
              WHERE id = ${session.user.id}::uuid OR email = ${session.user.email} 
              LIMIT 1
            `
          : await sql`
              SELECT role, COALESCE(banned, false) as banned, "banReason", "createdAt" FROM neon_auth."user" 
              WHERE email = ${session.user.email} 
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

          // Track new user registration if created within the last 15 minutes
          const userCreatedAt = rows[0].createdAt ? new Date(rows[0].createdAt as string | Date) : null;
          const isRecentUser = userCreatedAt && Date.now() - userCreatedAt.getTime() < 15 * 60 * 1000;
          if (isRecentUser) {
            const existingLog = await sql`
              SELECT 1 FROM public.activity_logs
              WHERE action_type = 'USER_REGISTER' AND target_id = ${session.user.id}
              LIMIT 1
            `;
            if (existingLog.length === 0) {
              await recordActivityLog({
                actionType: "USER_REGISTER",
                category: "user",
                actorId: session.user.id,
                actorName: session.user.name,
                actorEmail: session.user.email,
                actorRole: userRole,
                targetId: session.user.id,
                targetType: "user",
                description: `New user joined via Google OAuth: ${session.user.name || "Student"} (${session.user.email})`,
                metadata: { provider: "google", email: session.user.email },
              });
            }
          }
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

  return null;
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
