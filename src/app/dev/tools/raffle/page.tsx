import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { setDevRoleAction } from "@/app/actions/auth-role";
import { AuthButton } from "@/components/auth-button";
import { sql } from "@/lib/db";
import { type RaffleRuleRecord, type RaffleRuleCategory } from "@/lib/bingo-engine";
import { RaffleManagerClient } from "./raffle-manager-client";

export const instant = false;

export default async function DevRaffleManagerPage() {
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
              The <code>/dev/tools/raffle</code> manager is locked for administrative use. Your current session does not hold the required elevated role.
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fetch live Raffle Rules from database
  const ruleRows = await sql`
    SELECT id, rule_key, name, category, description, tickets_awarded, is_active
    FROM public.raffle_rules
    ORDER BY category ASC, rule_key ASC
  `;

  const rules: RaffleRuleRecord[] = ruleRows.map((r) => ({
    id: r.id,
    ruleKey: r.rule_key,
    name: r.name,
    category: r.category as RaffleRuleCategory,
    description: r.description,
    ticketsAwarded: Number(r.tickets_awarded),
    isActive: Boolean(r.is_active),
  }));

  // 3. Fetch global event config (active status + max tickets per user)
  const eventConfigRows = await sql`
    SELECT is_raffle_active, max_tickets_per_user
    FROM public.event_config
    WHERE key = 'active_event'
    LIMIT 1
  `;
  const isRaffleActive = Boolean(eventConfigRows[0]?.is_raffle_active ?? true);
  const maxTicketsPerUser = Number(eventConfigRows[0]?.max_tickets_per_user || 0);

  // 4. Fetch live ticket issuance statistics
  const statsRows = await sql`
    SELECT 
      COUNT(*)::int AS total_tickets,
      COUNT(DISTINCT user_id)::int AS total_students,
      COUNT(*) FILTER (WHERE status = 'valid')::int AS total_valid,
      COUNT(*) FILTER (WHERE status = 'verified')::int AS total_verified,
      COUNT(*) FILTER (WHERE status = 'disqualified')::int AS total_disqualified
    FROM public.raffle_entries
  `;

  const stats = {
    totalTickets: Number(statsRows[0]?.total_tickets || 0),
    totalStudents: Number(statsRows[0]?.total_students || 0),
    totalValid: Number(statsRows[0]?.total_valid || 0),
    totalVerified: Number(statsRows[0]?.total_verified || 0),
    totalDisqualified: Number(statsRows[0]?.total_disqualified || 0),
  };

  return (
    <RaffleManagerClient
      initialRules={rules}
      initialIsRaffleActive={isRaffleActive}
      initialMaxTicketsPerUser={maxTicketsPerUser}
      stats={stats}
      userRole={user.role}
    />
  );
}
