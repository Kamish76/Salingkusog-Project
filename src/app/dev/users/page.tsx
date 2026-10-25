import Link from "next/link";
import { getCurrentUser, isDevAuthorized, isSuperAdmin } from "@/lib/auth";
import { setDevRoleAction } from "@/app/actions/auth-role";
import { AuthButton } from "@/components/auth-button";
import { UserManagementClient } from "./user-management-client";

export const instant = false;

export default async function DevUsersPage() {
  const user = await getCurrentUser();
  const authorized = isDevAuthorized(user);
  const superAdmin = isSuperAdmin(user);

  // 1. Access Gate: Deny guests and non-moderator accounts
  if (!authorized) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-8 rounded-2xl border border-red-900/50 bg-red-950/20 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-200">
              Access Restricted to Moderator / Admin Accounts
            </h1>
            <p className="text-sm text-zinc-400">
              The <code>/dev/users</code> management portal is locked for administrative use. Your current session does not hold the required elevated role.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-left space-y-1">
            <div className="text-zinc-500">{"// Authorization Check"}</div>
            <div>
              Detected Identity:{" "}
              <span className="text-zinc-200 font-bold">
                {user ? user.email : "Unauthenticated"}
              </span>
            </div>
            <div>
              Detected Role:{" "}
              <span className="text-amber-400 font-bold">
                {user ? user.role : "none (guest)"}
              </span>
            </div>
            <div>
              Required Role:{" "}
              <span className="text-amber-300 font-bold">superadmin</span> or{" "}
              <span className="text-purple-300 font-bold">admin (moderator)</span>
            </div>
            <div>
              Status: <span className="text-red-400 font-bold">HTTP 403 Forbidden</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col items-center gap-3">
            <p className="text-xs text-zinc-400">
              Sign in with your registered account:
            </p>
            <AuthButton user={user} />
          </div>

          {/* Dev simulator controls */}
          <div className="pt-4 border-t border-zinc-800/80 space-y-3">
            <p className="text-xs text-zinc-500 font-mono">
              [Dev Simulator] Test authorization states:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <form action={setDevRoleAction}>
                <input type="hidden" name="role" value="superadmin" />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition cursor-pointer"
                >
                  Simulate SuperAdmin
                </button>
              </form>

              <form action={setDevRoleAction}>
                <input type="hidden" name="role" value="admin" />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition cursor-pointer"
                >
                  Simulate Admin (Moderator)
                </button>
              </form>

              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authorized View: User & Role Management Console
  return (
    <div className="space-y-8">
      {/* Page Title & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono text-zinc-400">
            <Link href="/dev" className="hover:text-amber-400 transition">
              ← Dev Console
            </Link>
            <span>/</span>
            <span className="text-zinc-200">User Moderation & Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            User Moderation & Account Directory
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Oversee registered accounts, ban or unban bad actors, and inspect 3x3 Bingo Card photo proofs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {superAdmin ? (
            <span className="px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
              ★ SuperAdmin Mode (Full Role & Moderation)
            </span>
          ) : (
            <span className="px-3 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium">
              Admin Mode (Active Moderator)
            </span>
          )}
        </div>
      </div>

      {/* Scope & Implementation Notice Banner */}
      <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs font-mono space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Platform Status · Base Moderation System Active</span>
          </div>
          <span className="text-zinc-500 text-[11px]">Phase 1 Milestone</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-zinc-400">
          <div className="space-y-1">
            <span className="text-emerald-400 font-semibold">● ACTIVE BASE FEATURES:</span>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-300">
              <li>Admin user moderation & immediate account banning with reason</li>
              <li>Active session revocation on ban in <code>neon_auth.session</code></li>
              <li>3x3 Bingo Card photo proof inspector & inappropriate photo hiding</li>
            </ul>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-400 font-semibold">○ UPCOMING (NOT IMPLEMENTED YET):</span>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
              <li>Student 3x3 Bingo Card interactive gameplay & camera upload UI</li>
              <li>Live Event Stage Raffle verification station (<code>/dev/raffle</code>)</li>
              <li>Public photo stream preview & celebration ticker</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Interactive Table */}
      <UserManagementClient
        canManageRoles={superAdmin}
        canModerate={authorized}
        currentUserId={user?.id}
      />
    </div>
  );
}
