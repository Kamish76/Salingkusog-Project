import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AuthButton } from "@/components/auth-button";
import { PersonalGalleryView } from "@/components/gallery/personal-gallery-view";
import type { PostRecord } from "@/components/landing/memory-board";
import type { BingoTaskItem, UserProgressItem } from "@/components/landing/floating-bingo-modal";


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

  // Fetch initial gallery data concurrently to eliminate sequential waterfall latency
  const configPromise = sql`
    SELECT 
      COALESCE(current_day, 1) as current_day,
      COALESCE(is_event_active, true) as is_event_active
    FROM public.event_config
    WHERE key = 'active_event'
    LIMIT 1
  `;

  const postRowsPromise = sql`
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
    WHERE p.user_id = ${user.id}::uuid 
      AND p.status = 'published'
      AND p.image_url IS NOT NULL 
      AND TRIM(p.image_url) != ''
    ORDER BY p.created_at DESC
    LIMIT 50
  `;

  const taskRowsPromise = sql`
    SELECT id, slot_index, title, description, category, unlock_day, requires_selfie, is_active
    FROM public.bingo_tasks
    ORDER BY slot_index ASC
  `;

  const progressRowsPromise = sql`
    SELECT 
      bt.slot_index, 
      ubp.task_id, 
      ubp.post_id, 
      ubp.completed_at,
      p.image_url,
      p.caption
    FROM public.user_bingo_progress ubp
    JOIN public.bingo_tasks bt ON ubp.task_id = bt.id
    LEFT JOIN public.posts p ON ubp.post_id = p.id
    WHERE ubp.user_id = ${user.id}::uuid
  `;

  const consentPromise = sql`
    SELECT agreed_promotional_use
    FROM public.user_consents
    WHERE user_id = ${user.id}::uuid
    LIMIT 1
  `;

  const [configRows, postRows, taskRows, progressRows, consentRows] = await Promise.all([
    configPromise,
    postRowsPromise,
    taskRowsPromise,
    progressRowsPromise,
    consentPromise,
  ]);

  const currentDay = Number(configRows[0]?.current_day || 1);
  const isEventActive = Boolean(configRows[0]?.is_event_active ?? true);
  const agreedPromotionalUse = Boolean(consentRows[0]?.agreed_promotional_use);

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
  }));

  const tasks: BingoTaskItem[] = taskRows.map((r) => ({
    id: r.id,
    slotIndex: Number(r.slot_index),
    title: r.title,
    description: r.description,
    category: r.category,
    unlockDay: Number(r.unlock_day),
    requiresSelfie: Boolean(r.requires_selfie),
    isActive: Boolean(r.is_active ?? true),
  }));

  const userProgress: UserProgressItem[] = progressRows.map((r) => ({
    slotIndex: Number(r.slot_index),
    taskId: r.task_id,
    postId: r.post_id,
    completedAt: r.completed_at,
    imageUrl: r.image_url || null,
    caption: r.caption || null,
  }));

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between selection:bg-[#ffdad5] selection:text-[#b4281e] overflow-x-hidden">
      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-[#fcf9f5]/90 border-b border-[#e8ded5]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full bg-white hover:bg-[#f5ece9] text-[#1e1b19] border border-[#e8ded5] text-xs font-display font-bold transition shadow-2xs active:scale-95 shrink-0"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              <span className="hidden sm:inline">Campus Board</span>
              <span className="sm:hidden">Board</span>
            </Link>

            <span className="text-xs text-[#8e706c] font-body border-l border-[#e8ded5] pl-2.5 hidden sm:inline">
              Salingkusog 2026
            </span>
          </div>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-body text-[#5a413d] bg-white sm:bg-transparent px-2 py-1 sm:px-0 sm:py-0 rounded-full border border-[#e8ded5] sm:border-none">
              <span className="w-2 h-2 rounded-full bg-[#ff5e4d]"></span>
              <span className="font-display font-bold text-[#8e4e14] whitespace-nowrap">Day {currentDay}</span>
            </div>

            <span className="text-xs font-display font-semibold text-[#5a413d] hidden md:inline truncate max-w-[100px]">
              {user.name?.split(" ")[0] ?? "Student"}
            </span>

            <AuthButton user={user} callbackURL="/gallery" />
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
          isEventActive={isEventActive}
          tasks={tasks}
          userProgress={userProgress}
          agreedPromotionalUse={agreedPromotionalUse}
        />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#e8ded5] bg-[#fff8f5] py-8 px-4 text-center text-xs text-[#8e706c] font-body">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <p className="font-display font-bold text-stone-700">
              Salingkusog 2026 · Collegiate Memory Board &amp; 3x3 Bingo
            </p>
            <span className="hidden sm:inline text-[#e8ded5]">•</span>
            <p className="font-handwriting text-sm text-[#b4281e]">
              made with warm paper &amp; student spirit
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#8e706c]">
            <Link href="/privacy" className="hover:text-[#1e1b19] underline decoration-[#e8ded5] hover:decoration-[#ff5e4d] transition-colors">
              Privacy Notice
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#1e1b19] underline decoration-[#e8ded5] hover:decoration-[#ff5e4d] transition-colors">
              Terms of Use
            </Link>
            <span>•</span>
            <Link href="/rally-rules" className="hover:text-[#1e1b19] underline decoration-[#e8ded5] hover:decoration-[#ff5e4d] transition-colors">
              Rally Rules
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
