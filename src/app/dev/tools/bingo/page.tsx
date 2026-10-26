import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { type BingoTaskRecord } from "@/app/actions/bingo-tasks";
import { BingoManagerClient } from "./bingo-manager-client";


export const instant = false;

export default async function DevBingoManagerPage() {
  const user = await getCurrentUser();

  // 1. Fetch live Bingo Challenge tasks from database
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
      userRole={user?.role || "admin"}
    />
  );
}
