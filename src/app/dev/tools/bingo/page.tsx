import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { AuthButton } from "@/components/auth-button";
import { sql } from "@/lib/db";
import { type BingoTaskRecord } from "@/app/actions/bingo-tasks";
import { BingoManagerClient } from "./bingo-manager-client";

export const instant = false;

export default async function DevBingoManagerPage() {
  const user = await getCurrentUser();
  const authorized = isDevAuthorized(user);

  // 1. Access Gate: Strictly protect developer tools with admin-only credentials
  if (!authorized || !user) {
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
              The <code>/dev/tools/bingo</code> manager is locked for administrative use. Your current session does not hold the required elevated role.
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
        </div>
      </div>
    );
  }

  // 2. Fetch live Bingo Challenge tasks from database
  const taskRows = await sql`
    SELECT id, slot_index, title, description, category, unlock_day, requires_selfie, is_active
    FROM public.bingo_tasks
    ORDER BY slot_index ASC
  `;

  const tasks: BingoTaskRecord[] = taskRows.map((r) => ({
    id: r.id,
    slotIndex: Number(r.slot_index),
    title: r.title,
    description: r.description,
    category: r.category,
    unlockDay: Number(r.unlock_day),
    requiresSelfie: Boolean(r.requires_selfie),
    isActive: Boolean(r.is_active),
  }));

  // 3. Fetch current event active day
  const eventConfigRows = await sql`
    SELECT current_day FROM public.event_config WHERE key = 'active_event' LIMIT 1
  `;
  const currentDay = Number(eventConfigRows[0]?.current_day || 1);

  return (
    <BingoManagerClient
      initialTasks={tasks}
      currentDay={currentDay}
      userRole={user.role}
    />
  );
}
