export type UserRole = "superadmin" | "admin" | "user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned?: boolean;
  banReason?: string | null;
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
