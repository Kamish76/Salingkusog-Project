import Link from "next/link";
import { getCurrentUser, isDevAuthorized, isSuperAdmin } from "@/lib/auth";
import { setDevRoleAction, updateUserRoleAction } from "@/app/actions/auth-role";
import { AuthButton } from "@/components/auth-button";
import { sql } from "@/lib/db";

export const instant = false;

interface DbUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  createdAt: string | Date | null;
}

export default async function DevPage() {
  const user = await getCurrentUser();
  const authorized = isDevAuthorized(user);
  const superAdmin = isSuperAdmin(user);
  const isDbConfigured = Boolean(process.env.DATABASE_URL);

  // 1. Gate: Unauthorized Visitors (Guests and Standard Users)
  if (!authorized) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-8 rounded-2xl border border-red-900/50 bg-red-950/20 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-200">
              Access Restricted to Developer / Admin Accounts
            </h1>
            <p className="text-sm text-zinc-400">
              The <code>/dev</code> route is locked for management and internal system diagnostics. Your current session does not hold the required elevated role.
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
              <span className="text-amber-300 font-bold">superadmin</span>,{" "}
              <span className="text-purple-300 font-bold">admin</span>, or{" "}
              <span className="text-blue-300 font-bold">developer</span>
            </div>
            <div>
              Status: <span className="text-red-400 font-bold">HTTP 403 Forbidden</span>
            </div>
          </div>

          {/* Direct Google Login trigger for real accounts */}
          <div className="pt-2 flex flex-col items-center gap-3">
            <p className="text-xs text-zinc-400">
              Sign in with your registered account:
            </p>
            <AuthButton user={user} />
          </div>

          {/* Dev testing role simulator */}
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
                  Simulate Admin
                </button>
              </form>

              <form action={setDevRoleAction}>
                <input type="hidden" name="role" value="developer" />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition cursor-pointer"
                >
                  Simulate Developer
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

  // 2. Authorized View: Fetch registered users for Superadmin
  let registeredUsers: DbUserRecord[] = [];
  if (superAdmin && isDbConfigured) {
    try {
      const rows = await sql`
        SELECT id, name, email, COALESCE(role, 'user') as role, "createdAt"
        FROM neon_auth."user"
        ORDER BY "createdAt" ASC
      `;
      registeredUsers = (rows as unknown as UserRow[]).map((r) => ({
        id: r.id,
        name: r.name || "Unnamed User",
        email: r.email,
        role: r.role || "user",
        createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Unknown",
      }));
    } catch (e) {
      console.error("Error fetching registered users:", e);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs uppercase tracking-wider font-mono text-emerald-400">
              Developer Authorization Confirmed
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Developer & Management Console
          </h1>
          <p className="text-sm text-zinc-400">
            System health, database configuration, and management controls for Salingkusog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form action={setDevRoleAction}>
            <input type="hidden" name="role" value="user" />
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition cursor-pointer font-mono"
            >
              Simulate User
            </button>
          </form>

          <form action={setDevRoleAction}>
            <input type="hidden" name="role" value="guest" />
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition cursor-pointer font-mono"
            >
              Simulate Guest
            </button>
          </form>
        </div>
      </div>

      {/* Grid of Diagnostics & Management Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Active Session Card */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Active Management Session
          </h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">Identity:</span>
              <span className="text-zinc-200">{user?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">Email:</span>
              <span className="text-zinc-200">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">Assigned Role:</span>
              <span
                className={`font-bold uppercase ${
                  user?.role === "superadmin"
                    ? "text-amber-400"
                    : user?.role === "admin"
                    ? "text-purple-400"
                    : "text-blue-400"
                }`}
              >
                {user?.role}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Authority:</span>
              <span className="text-indigo-400">
                {user?.role === "superadmin"
                  ? "Root SuperAdmin (Full Control)"
                  : user?.role === "admin"
                  ? "Admin (Management)"
                  : "Developer (Diagnostics)"}
              </span>
            </div>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Neon Lakebase Postgres
          </h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">Driver:</span>
              <span className="text-zinc-200">@neondatabase/serverless</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">Auth Engine:</span>
              <span className="text-emerald-400">Managed Better Auth</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">Auth Schema:</span>
              <span className="text-zinc-200">neon_auth.user / session</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">DATABASE_URL:</span>
              <span className={isDbConfigured ? "text-emerald-400" : "text-amber-400"}>
                {isDbConfigured ? "Connected" : "Unset"}
              </span>
            </div>
          </div>
        </div>

        {/* Environment & Runtime Card */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Framework & Runtime
          </h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">Framework:</span>
              <span className="text-zinc-200">Next.js 16.4.2</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">React Version:</span>
              <span className="text-zinc-200">React 19.3.0</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">Environment:</span>
              <span className="text-zinc-200">{process.env.NODE_ENV}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Styling:</span>
              <span className="text-zinc-200">Tailwind CSS v4</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Exclusive SuperAdmin User & Role Management Console */}
      {superAdmin ? (
        <div className="p-6 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-amber-400">
                  SuperAdmin Exclusive Tool
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                User & Role Assignment Management
              </h2>
              <p className="text-xs text-zinc-400">
                Directly manage access tiers in <code>neon_auth.user</code>. The root superadmin is protected and cannot be demoted.
              </p>
            </div>
            <div className="text-xs font-mono px-3 py-1 rounded bg-amber-900/40 text-amber-300 border border-amber-800 self-start sm:self-auto">
              {registeredUsers.length} Registered {registeredUsers.length === 1 ? "Account" : "Accounts"}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/80">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/70">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Assign Role Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {registeredUsers.length > 0 ? (
                  registeredUsers.map((u) => {
                    const isRootSuperAdmin = u.role === "superadmin";
                    return (
                      <tr key={u.id} className="hover:bg-zinc-900/40 transition">
                        <td className="py-3 px-4 font-semibold text-white">{u.name}</td>
                        <td className="py-3 px-4 text-zinc-400">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              u.role === "superadmin"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : u.role === "admin"
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                : u.role === "developer"
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500">{u.createdAt}</td>
                        <td className="py-3 px-4 text-right">
                          {isRootSuperAdmin ? (
                            <span className="text-[11px] text-amber-400/90 font-medium">
                              Protected Root
                            </span>
                          ) : (
                            <form action={updateUserRoleAction} className="inline-flex items-center gap-2">
                              <input type="hidden" name="targetUserId" value={u.id} />
                              <select
                                name="newRole"
                                defaultValue={u.role}
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                              >
                                <option value="user">user</option>
                                <option value="developer">developer</option>
                                <option value="admin">admin</option>
                              </select>
                              <button
                                type="submit"
                                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-medium transition cursor-pointer"
                              >
                                Update
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      No accounts found in <code>neon_auth.user</code> yet. Log in with Google to create your account!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-300">
              User & Role Management Console
            </h3>
            <p className="text-xs text-zinc-500">
              Restricted to SuperAdmin. Your current role ({user?.role}) has developer inspect privileges.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500 px-2 py-1 rounded border border-zinc-800 bg-zinc-900">
            Locked (Requires SuperAdmin)
          </span>
        </div>
      )}

      {/* Role Privilege Matrix */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
        <h2 className="text-base font-semibold text-white">
          Role-Based Access Control (RBAC) Matrix
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="pb-2">Role</th>
                <th className="pb-2">Access Level</th>
                <th className="pb-2">User Portal (/)</th>
                <th className="pb-2">Dev Console (/dev)</th>
                <th className="pb-2">Role Assignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              <tr>
                <td className="py-2.5 font-bold text-amber-400">superadmin</td>
                <td className="py-2.5">Sole System Owner</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-emerald-400">Granted (Full)</td>
                <td className="py-2.5 text-amber-400 font-bold">Exclusive (Full Control)</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-purple-400">admin</td>
                <td className="py-2.5">System Administrator</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-zinc-500">Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-blue-400">developer</td>
                <td className="py-2.5">Engineering & Diagnostics</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-zinc-500">Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-zinc-400">user</td>
                <td className="py-2.5">Standard Public User</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-red-400">Denied (403)</td>
                <td className="py-2.5 text-red-400">None</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-zinc-500">guest</td>
                <td className="py-2.5">Unauthenticated Visitor</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-red-400">Denied (403)</td>
                <td className="py-2.5 text-red-400">None</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
