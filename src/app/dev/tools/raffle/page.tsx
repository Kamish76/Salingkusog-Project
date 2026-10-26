import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { type RaffleRuleRecord, type RaffleRuleCategory } from "@/lib/bingo-engine";
import { RaffleManagerClient } from "./raffle-manager-client";


export const instant = false;

export default async function DevRaffleManagerPage() {
  const user = await getCurrentUser();

  // 1. Fetch live Raffle Rules from database
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
      userRole={user?.role || "admin"}
    />
  );
}
