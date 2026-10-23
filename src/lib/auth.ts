import { cookies } from "next/headers";

export type UserRole = "admin" | "developer" | "user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// shortcut: reads role from dev_role cookie for instant testing; upgrade to neon_auth sessions when OAuth/SMTP is configured
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const devRole = cookieStore.get("dev_role")?.value as UserRole | undefined;

  if (!devRole) {
    return null; // Guest user
  }

  return {
    id: `usr_${devRole}_1`,
    name: devRole === "admin" ? "Lead Admin" : devRole === "developer" ? "Core Developer" : "Standard User",
    email: `${devRole}@salingkusog.internal`,
    role: devRole,
  };
}

export function isDevAuthorized(user: AuthUser | null): boolean {
  return user?.role === "admin" || user?.role === "developer";
}
