import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AuthButton } from "@/components/auth-button";
import { PersonalGalleryView } from "@/components/gallery/personal-gallery-view";
import type { PostRecord } from "@/components/landing/memory-board";
import type { BingoTaskOption } from "@/components/landing/upload-memory-modal";

export const instant = false;

export default async function PersonalGalleryPage() {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    redirect("/?auth=required");
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
  if (!isUuid) {
    redirect("/?auth=invalid");
  }

  // 1. Fetch event config
  const configRows = await sql`
    SELECT COALESCE(current_day, 1) as current_day
    FROM public.event_config
    WHERE key = 'active_event'
    LIMIT 1
  `;
  const currentDay = Number(configRows[0]?.current_day || 1);

  // 2. Fetch all published posts by this authenticated student
  const postRows = await sql`
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
      bt.slot_index,
      COALESCE((SELECT count(*) FROM public.post_reactions pr WHERE pr.post_id = p.id AND pr.reaction_type = 'heart'), 0) as heart_count,
      COALESCE((SELECT count(*) FROM public.post_reactions pr WHERE pr.post_id = p.id AND pr.reaction_type = 'fire'), 0) as fire_count,
      COALESCE((SELECT count(*) FROM public.post_reactions pr WHERE pr.post_id = p.id AND pr.reaction_type = 'trophy'), 0) as trophy_count
    FROM public.posts p
    LEFT JOIN public.bingo_tasks bt ON p.bingo_task_id = bt.id
    WHERE p.user_id = ${user.id}::uuid AND p.status = 'published'
    ORDER BY p.created_at DESC
  `;

  const posts: PostRecord[] = postRows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    displayName: r.display_name,
    collegeDept: r.college_dept,
    imageUrl: r.image_url,
    caption: r.caption,
    isBingoEntry: Boolean(r.is_bingo_entry),
    taskTitle: r.task_title,
    slotIndex: r.slot_index !== null ? Number(r.slot_index) : null,
    createdAt: r.created_at,
    heartCount: Number(r.heart_count),
    fireCount: Number(r.fire_count),
    trophyCount: Number(r.trophy_count),
  }));

  // 3. Fetch Bingo tasks for upload options
  const taskRows = await sql`
    SELECT id, slot_index, title, description, unlock_day
    FROM public.bingo_tasks
    ORDER BY slot_index ASC
  `;

  const bingoTasks: BingoTaskOption[] = taskRows.map((r) => ({
    id: r.id,
    slotIndex: Number(r.slot_index),
    title: r.title,
    description: r.description,
    unlockDay: Number(r.unlock_day),
  }));

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#ffdad5] selection:text-[#b4281e]">
      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-[#fcf9f5]/90 border-b border-[#e8ded5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#f5ece9] text-[#1e1b19] border border-[#e8ded5] text-xs font-display font-bold transition shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              <span>Campus Board</span>
            </Link>

            <span className="text-xs text-[#8e706c] font-body border-l border-[#e8ded5] pl-3 hidden sm:inline">
              Salingkusog 2026
            </span>
          </div>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-xs font-body text-[#5a413d]">
              <span className="w-2 h-2 rounded-full bg-[#ff5e4d]"></span>
              <span className="font-display font-bold text-[#8e4e14]">Day {currentDay}</span>
            </div>

            <span className="text-xs font-display font-semibold text-[#5a413d] hidden md:inline">
              {user.name?.split(" ")[0] ?? "Student"}
            </span>

            <AuthButton user={user} />
          </div>
        </div>
      </header>

      {/* MAIN GALLERY VIEW */}
      <main className="relative z-10 pt-6 sm:pt-8 pb-20 max-w-6xl mx-auto px-4 sm:px-6 flex-1 w-full">
        <PersonalGalleryView
          posts={posts}
          user={{
            id: user.id,
            name: user.name ?? "Student",
            email: user.email ?? "",
          }}
          currentDay={currentDay}
          bingoTasks={bingoTasks}
        />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#e8ded5] bg-[#fff8f5] py-8 px-4 text-center text-xs text-[#8e706c] font-body">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-display font-bold text-stone-700">
            Salingkusog 2026 · Collegiate Memory Board & 3x3 Bingo
          </p>
          <p className="font-handwriting text-sm text-[#b4281e]">
            made with warm paper & student spirit
          </p>
        </div>
      </footer>
    </div>
  );
}
