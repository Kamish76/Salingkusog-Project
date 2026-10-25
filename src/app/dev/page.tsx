import Link from "next/link";
import { getCurrentUser, isDevAuthorized, isSuperAdmin } from "@/lib/auth";
import {
  setDevRoleAction,
  updateUserRoleAction,
} from "@/app/actions/auth-role";
import { toggleRaffleStatusAction } from "@/app/actions/event-config";
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
      <div className="max-w-2xl mx-auto py-6 sm:py-12">
        <div className="p-4 sm:p-8 rounded-2xl border border-red-900/50 bg-red-950/20 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-red-200">
              Access Restricted to Moderator / Admin Accounts
            </h1>
            <p className="text-sm text-zinc-400">
              The <code>/dev</code> route is locked for management and internal system diagnostics. Your current session does not hold the required elevated role.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-left space-y-1 overflow-x-auto">
            <div className="text-zinc-500">{"// Authorization Check"}</div>
            <div>
              Detected Identity:{" "}
              <span className="text-zinc-200 font-bold break-all">
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
                  className="px-3 py-2 min-h-[38px] rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition cursor-pointer active:scale-95"
                >
                  Simulate SuperAdmin
                </button>
              </form>

              <form action={setDevRoleAction}>
                <input type="hidden" name="role" value="admin" />
                <button
                  type="submit"
                  className="px-3 py-2 min-h-[38px] rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition cursor-pointer active:scale-95"
                >
                  Simulate Admin (Moderator)
                </button>
              </form>

              <Link
                href="/"
                className="px-3 py-2 min-h-[38px] inline-flex items-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition active:scale-95"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authorized View: Fetch registered users for Superadmin (max 5, pinned own credential, newest first)
  let registeredUsers: DbUserRecord[] = [];
  let totalRegisteredCount = 0;

  if (superAdmin) {
    if (isDbConfigured) {
      try {
        const countRows = await sql`SELECT COUNT(*) as count FROM neon_auth."user"`;
        totalRegisteredCount = Number(countRows[0]?.count || 0);

        const callerEmail = user?.email || null;
        const rows = await sql`
          SELECT id, name, email, COALESCE(role, 'user') as role, "createdAt"
          FROM neon_auth."user"
          ORDER BY 
            CASE WHEN email = ${callerEmail} THEN 0 ELSE 1 END,
            "createdAt" DESC
          LIMIT 5
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
    } else {
      const mockUsers: DbUserRecord[] = [
        { id: "00000000-0000-4000-a000-000000000001", name: "Root SuperAdmin", email: "superadmin@salingkusog.internal", role: "superadmin", createdAt: "10/23/2026" },
        { id: "00000000-0000-4000-a000-000000000002", name: "Admin (Moderator)", email: "admin@salingkusog.internal", role: "admin", createdAt: "10/23/2026" },
        { id: "00000000-0000-4000-a000-000000000003", name: "Standard User", email: "user@salingkusog.internal", role: "user", createdAt: "10/23/2026" },
      ];
      totalRegisteredCount = mockUsers.length;
      registeredUsers = mockUsers.slice(0, 5);
    }
  }

  // 3. Fetch Event Configuration & Raffle System Status
  let isRaffleActive = true;
  let eventDay = 1;
  let configUpdatedAt: string | null = null;

  if (isDbConfigured) {
    try {
      const configRows = await sql`
        SELECT is_raffle_active, current_day, updated_at
        FROM public.event_config
        WHERE key = 'active_event'
        LIMIT 1
      `;
      if (configRows.length > 0) {
        isRaffleActive = Boolean(configRows[0].is_raffle_active ?? true);
        eventDay = Number(configRows[0].current_day || 1);
        configUpdatedAt = configRows[0].updated_at
          ? new Date(configRows[0].updated_at).toLocaleTimeString()
          : null;
      }
    } catch (e) {
      console.error("Error fetching event configuration:", e);
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
              Moderator Authorization Confirmed
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Management & Moderation Console
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            System health, database configuration, and management controls for Salingkusog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form action={setDevRoleAction}>
            <input type="hidden" name="role" value="user" />
            <button
              type="submit"
              className="px-3 py-2 min-h-[38px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition cursor-pointer font-mono active:scale-95"
            >
              Simulate User
            </button>
          </form>

          <form action={setDevRoleAction}>
            <input type="hidden" name="role" value="guest" />
            <button
              type="submit"
              className="px-3 py-2 min-h-[38px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition cursor-pointer font-mono active:scale-95"
            >
              Simulate Guest
            </button>
          </form>
        </div>
      </div>

      {/* Event & Raffle System Control Panel */}
      <div
        className={`p-4 sm:p-6 rounded-2xl border transition shadow-lg ${
          isRaffleActive
            ? "border-emerald-500/30 bg-emerald-950/10"
            : "border-amber-500/30 bg-amber-950/10"
        } flex flex-col md:flex-row md:items-center justify-between gap-5`}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-wide uppercase border ${
                isRaffleActive
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRaffleActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              ></span>
              {isRaffleActive ? "Raffle System Active / Live" : "Raffle System Paused / Offline"}
            </span>

            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
              Day {eventDay} Active
            </span>

            {configUpdatedAt && (
              <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
                Last updated: {configUpdatedAt}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>🎟️</span>
              <span>Campus Raffle Drawings & Claim Engine</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Controls stage raffle ticket generation upon completed 3x3 bingo lines and client-side raffle UI. When paused, student photo uploads still complete bingo slots, but ticket generation and raffle displays enter standby mode.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto self-start md:self-center">
          {superAdmin ? (
            <form action={toggleRaffleStatusAction} className="w-full sm:w-auto">
              <input
                type="hidden"
                name="enabled"
                value={isRaffleActive ? "false" : "true"}
              />
              <button
                type="submit"
                className={`w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl font-mono text-xs font-bold tracking-wide shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                  isRaffleActive
                    ? "bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/50"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50"
                }`}
              >
                <span>{isRaffleActive ? "⏸ Pause Raffle System" : "▶ Activate Raffle System"}</span>
              </button>
            </form>
          ) : (
            <div className="text-xs font-mono px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center gap-1.5 w-full sm:w-auto justify-center">
              <span>🔒</span>
              <span>Switch Locked (SuperAdmin Required)</span>
            </div>
          )}
        </div>
      </div>

      {/* Audit & Activity Logs Quick Banner */}
      <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              AUDIT TRAIL
            </span>
            <span className="text-xs text-zinc-400 font-mono">Live Activity Monitoring</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>📋</span>
            <span>SuperAdmin Activity & System Logs</span>
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            Track new users, photo submissions, user bans, and admin actions across the entire platform in real time.
          </p>
        </div>

        <Link
          href="/dev/logs"
          className="self-start sm:self-center px-4 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wide bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <span>Open Activity Logs Console</span>
          <span>→</span>
        </Link>
      </div>

      {/* Grid of Diagnostics & Management Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Active Session Card */}
        <div className="p-4 sm:p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
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
                    : "text-zinc-400"
                }`}
              >
                {user?.role === "admin" ? "admin (moderator)" : user?.role}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Authority:</span>
              <span className="text-indigo-400">
                {user?.role === "superadmin"
                  ? "Root SuperAdmin (Moderator + Role Management)"
                  : user?.role === "admin"
                  ? "Admin (Moderator)"
                  : "Standard User"}
              </span>
            </div>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="p-4 sm:p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
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
        <div className="p-4 sm:p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
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
        <div className="p-4 sm:p-6 rounded-2xl border border-amber-500/20 bg-zinc-900/60 shadow-xl space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-[11px] uppercase font-mono font-bold tracking-wider text-amber-400">
                  SuperAdmin Exclusive Tool
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                User & Role Assignment Management
              </h2>
              <p className="text-xs text-zinc-400">
                Directly manage access tiers in <code className="text-zinc-300">neon_auth.user</code>. Pinned own credential with newest registered accounts (max 5).
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-zinc-950/80 text-zinc-300 border border-zinc-800">
                <span className="text-zinc-500">Total:</span>{" "}
                <span className="text-amber-400 font-bold">{totalRegisteredCount}</span>{" "}
                {totalRegisteredCount === 1 ? "Account" : "Accounts"}
              </div>

              <Link
                href="/dev/users"
                className="group text-xs font-mono px-3.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 transition flex items-center gap-1.5 font-medium shadow-sm whitespace-nowrap"
              >
                <span>Full Directory & Filter</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/90 shadow-inner">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/80">
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
                      const isCallerAccount = u.email === user?.email;

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-zinc-900/50 transition ${
                            isCallerAccount ? "bg-amber-500/[0.04]" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                            <span>{u.name}</span>
                            {isCallerAccount && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                YOU
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400 font-mono">{u.email}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border inline-block ${
                                u.role === "superadmin"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : u.role === "admin"
                                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
                              }`}
                            >
                              {u.role === "admin" ? "admin (moderator)" : u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-500 font-mono">{u.createdAt}</td>
                          <td className="py-3.5 px-4 text-right">
                            {isRootSuperAdmin ? (
                              <span className="text-[11px] text-amber-400/90 font-medium">
                                Protected Root
                              </span>
                            ) : (
                              <form
                                action={updateUserRoleAction}
                                className="inline-flex items-center gap-2"
                              >
                                <input type="hidden" name="targetUserId" value={u.id} />
                                <select
                                  name="newRole"
                                  defaultValue={u.role}
                                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-base sm:text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer min-h-[36px]"
                                >
                                  <option value="user">user</option>
                                  <option value="admin">admin (moderator)</option>
                                </select>
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer min-h-[36px] active:scale-95"
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

            {/* Table Footer */}
            <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-zinc-400">
              <div>
                Showing <span className="text-zinc-200 font-bold">{registeredUsers.length}</span> of{" "}
                <span className="text-zinc-200 font-bold">{totalRegisteredCount}</span> accounts (Your credential pinned at top + newest accounts, max 5)
              </div>
              <Link
                href="/dev/users"
                className="text-amber-400/90 hover:text-amber-300 transition flex items-center gap-1 hover:underline"
              >
                <span>Open Full Directory with Search & Filter</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      ) : user?.role === "admin" ? (
        <div className="p-4 sm:p-6 rounded-xl border border-purple-500/40 bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <h3 className="text-sm font-semibold text-purple-200">
                Admin (Moderator) Privileges Detected
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              You are assigned as an Admin (Moderator) in Neon Better Auth. Elevate your session to the sole SuperAdmin to unlock the full User & Role Assignment console.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
            <Link
              href="/dev/users"
              className="px-3 py-2 min-h-[38px] rounded-lg border border-purple-500/50 bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 text-xs font-medium transition cursor-pointer whitespace-nowrap active:scale-95 flex items-center justify-center flex-1 sm:flex-initial"
            >
              View User Directory →
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-300">
              User & Role Management Console
            </h3>
            <p className="text-xs text-zinc-500">
              Restricted to SuperAdmin. Your current role ({user?.role}) does not have role assignment privileges.
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
                <td className="py-2.5">Sole System Owner (Moderator + Role Management)</td>
                <td className="py-2.5 text-emerald-400">Granted</td>
                <td className="py-2.5 text-emerald-400">Granted (Full)</td>
                <td className="py-2.5 text-amber-400 font-bold">Exclusive (Promote/Demote)</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-purple-400">admin</td>
                <td className="py-2.5">Moderator (Management & Diagnostics)</td>
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
