import Link from "next/link";
import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { setDevRoleAction } from "@/app/actions/auth-role";

export const instant = false;

export default async function DevPage() {
  const user = await getCurrentUser();
  const authorized = isDevAuthorized(user);

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
              Detected Role:{" "}
              <span className="text-amber-400 font-bold">
                {user ? user.role : "none (guest)"}
              </span>
            </div>
            <div>
              Required Role:{" "}
              <span className="text-emerald-400 font-bold">developer</span> or{" "}
              <span className="text-emerald-400 font-bold">admin</span>
            </div>
            <div>Status: <span className="text-red-400 font-bold">HTTP 403 Forbidden</span></div>
          </div>

          {/* Quick simulation switcher for dev testing */}
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <p className="text-xs text-zinc-400">
              Need to test this route? Elevate role below:
            </p>
            <div className="flex justify-center gap-3">
              <form action={setDevRoleAction}>
                <input type="hidden" name="role" value="developer" />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                >
                  Switch to Developer Role
                </button>
              </form>

              <form action={setDevRoleAction}>
                <input type="hidden" name="role" value="admin" />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition"
                >
                  Switch to Admin Role
                </button>
              </form>

              <Link
                href="/"
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authorized View (Developer or Admin)
  const isDbConfigured = Boolean(process.env.DATABASE_URL);

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

        <div className="flex items-center gap-3">
          <form action={setDevRoleAction}>
            <input type="hidden" name="role" value="user" />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition"
            >
              Simulate Normal User (Lock Out)
            </button>
          </form>

          <form action={setDevRoleAction}>
            <input type="hidden" name="role" value="guest" />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition"
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
              <span className="text-emerald-400 font-bold uppercase">{user?.role}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Permissions:</span>
              <span className="text-indigo-400">
                {user?.role === "admin" ? "SuperAdmin (All)" : "Developer (Read/Debug)"}
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
              <span className="text-zinc-500">Config:</span>
              <span className="text-zinc-200">neon.ts (auth: true)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800">
              <span className="text-zinc-500">Auth Schema:</span>
              <span className="text-emerald-400">neon_auth.user</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">DATABASE_URL:</span>
              <span className={isDbConfigured ? "text-emerald-400" : "text-amber-400"}>
                {isDbConfigured ? "Connected" : "Set in .env.local"}
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
              <span className="text-zinc-500">Architecture:</span>
              <span className="text-zinc-200">App Router (RSC)</span>
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
                <th className="pb-2">Database & Config</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              <tr>
                <td className="py-2.5 font-bold text-purple-400">admin</td>
                <td className="py-2.5">Full System Owner</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-emerald-400">Granted (Full)</td>
                <td className="py-2.5 text-emerald-400">Read / Write</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-blue-400">developer</td>
                <td className="py-2.5">Engineering & Diagnostics</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-zinc-400">Read / Inspect</td>
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
