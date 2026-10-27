import { cookies } from "next/headers";
import { connection } from "next/server";
import { sql } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { pushDiagnosticLog } from "@/lib/server-log-buffer";
import {
  type UserRole,
  type AuthUser,
  isModerator,
  isDevAuthorized,
  isSuperAdmin,
  isUserBanned,
} from "./auth-predicates";

export {
  type UserRole,
  type AuthUser,
  isModerator,
  isDevAuthorized,
  isSuperAdmin,
  isUserBanned,
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCurrentUser(): Promise<AuthUser | null> {
  // Live Neon Managed Better Auth session resolution (Google OAuth)
  try {
    // Await connection() before cookies() and auth.getSession() so both build-time
    // ('prerender') and runtime ('prerender-runtime') prerenders suspend here instead
    // of resolving cookies() in 'prerender-runtime' and rejecting on fetch() inside @neondatabase/auth.
    await connection();
    const cookieStore = await cookies();
    if (!cookieStore.getAll().some((c) => c.name.includes("neon-auth"))) {
      return null;
    }

    const { data: session } = await auth.getSession();
    if (session?.user) {
      let userRole: UserRole = "user";
      let isBanned = false;
      let banReason: string | null = null;

      if (process.env.DATABASE_URL) {
        try {
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
        }
      } catch (dbErr: unknown) {
        pushDiagnosticLog({
          subsystem: "database",
          level: "error",
          message: `DB error during session role resolution: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`,
        });
      }
    }

    // Emergency admin authorization fallback during database outage
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (userRole === "user" && session.user.email && adminEmails.includes(session.user.email.toLowerCase())) {
      userRole = "admin";
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
