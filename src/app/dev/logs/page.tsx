import Link from "next/link";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { ActivityLogsClient } from "./activity-logs-client";

export const instant = false;

export default async function DevLogsPage() {
  const user = await getCurrentUser();
  const superAdmin = isSuperAdmin(user);

  // 1. SuperAdmin Exclusivity Gate: Admins (moderators) see locked notice
  if (!superAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-6">
        <div className="p-8 rounded-2xl border border-amber-500/30 bg-amber-950/10 text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-2xl font-mono">
            🔒
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Audit Logs Restricted to SuperAdmin
            </h1>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto">
              System-wide audit traces, user registrations, photo uploads, and administrative moderation events are restricted exclusively to root SuperAdmin accounts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-left max-w-md mx-auto space-y-1.5">
            <div className="text-zinc-500">{"// Credential Hierarchy"}</div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Current Role:</span>
              <span className="text-purple-400 font-bold uppercase">{user?.role} (moderator)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Required Role:</span>
              <span className="text-amber-400 font-bold uppercase">superadmin</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Privilege:</span>
              <span className="text-zinc-400">Audit & Log Inspector</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/dev"
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition"
            >
              ← Back to System Overview
            </Link>
            <Link
              href="/dev/users"
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition"
            >
              Go to User Management →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized View: SuperAdmin Audit Console
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span className="text-xs uppercase tracking-wider font-mono text-indigo-400">
              Audit & Activity Log Console
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            System Activity Logs
          </h1>
          <p className="text-sm text-zinc-400">
            Real-time audit trail of new users, photo submissions, user bans, and administrative moderation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dev"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition font-mono"
          >
            ← System Overview
          </Link>
          <Link
            href="/dev/users"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition font-mono"
          >
            User Management →
          </Link>
        </div>
      </div>

      {/* Interactive Logs Client */}
      <ActivityLogsClient />
    </div>
  );
}
