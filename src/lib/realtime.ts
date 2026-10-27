import { createRealtime, rawSql } from "@neon/realtime/server";
import type { PostRecord } from "@/components/landing/memory-board";

const secret = process.env.NEON_REALTIME_SECRET;
const dbUrl = process.env.DATABASE_URL;

function getDbName(url?: string): string {
  if (!url) return "neondb";
  try {
    const parsed = new URL(url);
    return parsed.pathname.slice(1) || "neondb";
  } catch {
    return "neondb";
  }
}

export const realtimeServer = secret
  ? createRealtime({
      secret,
      db: getDbName(dbUrl),
    })
  : null;

export const livePostsQuery = rawSql<PostRecord>(`
  SELECT 
    p.id,
    p.user_id,
    COALESCE(p.display_name, 'Student') as display_name,
    p.college_dept,
    p.image_url,
    p.caption,
    p.is_bingo_entry,
    p.created_at,
    bt.title as task_title,
    bt.slot_index
  FROM public.posts p
  LEFT JOIN public.bingo_tasks bt ON p.bingo_task_id = bt.id
  WHERE p.status = 'published'
    AND p.image_url IS NOT NULL 
    AND TRIM(p.image_url) != ''
  ORDER BY p.created_at DESC
  LIMIT 20
`);
