import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AuthButton } from "@/components/auth-button";
import { ScrapbookLandingController } from "@/components/landing/scrapbook-landing-controller";
import type { PostRecord } from "@/components/landing/memory-board";
import type {
  BingoTaskItem,
  UserProgressItem,
  RaffleEntryItem,
} from "@/components/landing/floating-bingo-modal";

export const instant = false;

export default async function HomePage() {
  const user = await getCurrentUser();

  // 1. Fetch live event stats from Neon database
  const statsRows = await sql`
    SELECT 
      (SELECT count(*) FROM public.posts WHERE status = 'published') as total_snaps,
      (SELECT count(*) FROM public.raffle_entries WHERE status IN ('valid', 'verified')) as total_raffles,
      (SELECT count(DISTINCT college_dept) FROM public.posts WHERE college_dept IS NOT NULL AND status = 'published') as active_colleges,
      COALESCE((SELECT current_day FROM public.event_config WHERE key = 'active_event' LIMIT 1), 1) as current_day
  `;

  const totalSnaps = Number(statsRows[0]?.total_snaps || 0);
  const totalRaffles = Number(statsRows[0]?.total_raffles || 0);
  const activeColleges = Number(statsRows[0]?.active_colleges || 0);
  const currentDay = Number(statsRows[0]?.current_day || 1);

  // 2. Fetch real published posts from Neon database
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
    WHERE p.status = 'published'
    ORDER BY p.created_at DESC
    LIMIT 60
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

  // 3. Fetch real 9 Bingo challenge tasks
  const taskRows = await sql`
    SELECT id, slot_index, title, description, category, unlock_day, requires_selfie
    FROM public.bingo_tasks
    ORDER BY slot_index ASC
  `;

  const tasks: BingoTaskItem[] = taskRows.map((r) => ({
    id: r.id,
    slotIndex: Number(r.slot_index),
    title: r.title,
    description: r.description,
    category: r.category,
    unlockDay: Number(r.unlock_day),
    requiresSelfie: Boolean(r.requires_selfie),
  }));

  // 4. Fetch authenticated user's real progress and raffle entries
  let userProgress: UserProgressItem[] = [];
  let raffleEntries: RaffleEntryItem[] = [];

  if (user) {
    const progressRows = await sql`
      SELECT bt.slot_index, ubp.task_id, ubp.post_id, ubp.completed_at
      FROM public.user_bingo_progress ubp
      JOIN public.bingo_tasks bt ON ubp.task_id = bt.id
      WHERE ubp.user_id = ${user.id}::uuid
    `;

    userProgress = progressRows.map((r) => ({
      slotIndex: Number(r.slot_index),
      taskId: r.task_id,
      postId: r.post_id,
      completedAt: r.completed_at,
    }));

    const raffleRows = await sql`
      SELECT raffle_code, line_type, line_index
      FROM public.raffle_entries
      WHERE user_id = ${user.id}::uuid
      ORDER BY created_at DESC
    `;

    raffleEntries = raffleRows.map((r) => ({
      raffleCode: r.raffle_code,
      lineType: r.line_type,
      lineIndex: Number(r.line_index),
    }));
  }

  return (
    <div className="min-h-screen bg-[#fcf9f5] text-[#1e1b19] flex flex-col font-body selection:bg-[#ffdcc4] selection:text-[#6f3800] relative overflow-x-hidden">
      {/* Scrapbook Warm Ambient Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#fed7aa]/35 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-20 w-[420px] h-[420px] bg-[#fecdd3]/25 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-[#bbf7d0]/20 rounded-full blur-3xl"></div>
      </div>

      {/* FLOATING WARM SCRAPBOOK HEADER */}
      <header className="sticky top-3 sm:top-4 z-40 px-3 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="bg-white/92 backdrop-blur-md px-4 sm:px-6 py-2.5 rounded-full border border-[#e8ded5] shadow-scrapbook flex items-center justify-between gap-3">
          {/* Logo & Subtitle */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-800 flex items-center justify-center border border-stone-200/80 group-hover:scale-105 transition-transform text-base shadow-xs">
              ⚡
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[#1e1b19]">
                  Salingkusog
                </span>
                <span className="text-[10px] bg-[#f5ece9] text-[#5a413d] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase">
                  Memory Well
                </span>
              </div>
              <span className="text-[11px] font-handwriting text-[#8e706c] -mt-0.5 hidden xs:inline tracking-wide">
                curated collegiate intramural moments
              </span>
            </div>
          </Link>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Day Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff8f5] border border-[#f4a261]/40 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#ff5e4d] animate-pulse"></span>
              <span className="font-display font-bold text-[11px] text-[#8e4e14] uppercase tracking-wider">
                Day {currentDay} Live
              </span>
            </div>

            {/* Authenticated user indicator */}
            {user && (
              <span className="text-xs font-display font-semibold text-[#5a413d] hidden md:inline">
                {user.name?.split(" ")[0] ?? "Student"}
              </span>
            )}

            {/* Google Auth Button */}
            <AuthButton user={user} />
          </div>
        </div>
      </header>

      {/* MAIN CAMPUS SCRAPBOOK CANVAS */}
      <main className="relative z-10 pt-8 sm:pt-12 pb-24 max-w-6xl mx-auto px-4 sm:px-6 flex-1 w-full flex flex-col gap-8 sm:gap-10">
        {/* HERO TITLE SECTION */}
        <section className="text-center max-w-2xl mx-auto pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white border border-[#e8ded5] text-stone-600 text-xs font-medium tracking-wide shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e4d]"></span>
            <span className="font-display font-semibold text-[11px] text-[#8e4e14]">
              Intramurals 2026 • Live Photo Chute
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold text-[#1e1b19] tracking-tight leading-[1.15]">
            Toss memories into the{" "}
            <span className="font-handwriting font-normal text-[#ff5e4d] text-4xl sm:text-6xl md:text-7xl ml-1">
              infinite well
            </span>
          </h1>

          <p className="mt-3 text-[#5a413d] font-body text-sm sm:text-base max-w-lg mx-auto font-normal leading-relaxed">
            A quiet, bottomless physical memory board for Salingkusog. Snap campus selfies, cheer for your college, and unlock your 3x3 Bingo lines on the side!
          </p>

          {/* Real Live Stats Pill Bar */}
          <div className="mt-6 inline-flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-2 rounded-2xl bg-white border border-[#e8ded5] shadow-xs text-xs font-body">
            <div className="flex items-center gap-1.5 text-[#1e1b19]">
              <span className="font-display font-bold text-sm text-[#ff5e4d]">
                {totalSnaps}
              </span>
              <span className="text-[#8e706c]">
                {totalSnaps === 1 ? "Photo Snapped" : "Photos Snapped"}
              </span>
            </div>
            <span className="text-[#e8ded5]">•</span>
            <div className="flex items-center gap-1.5 text-[#1e1b19]">
              <span className="font-display font-bold text-sm text-[#8e4e14]">
                {totalRaffles}
              </span>
              <span className="text-[#8e706c]">
                {totalRaffles === 1 ? "Raffle Entry" : "Raffle Entries"}
              </span>
            </div>
            <span className="text-[#e8ded5] hidden xs:inline">•</span>
            <div className="hidden xs:flex items-center gap-1.5 text-[#1e1b19]">
              <span className="font-display font-bold text-sm text-[#588157]">
                {activeColleges > 0 ? `${activeColleges} Colleges` : "Colleges"}
              </span>
              <span className="text-[#8e706c]">Active</span>
            </div>
          </div>
        </section>

        {/* POLAROID MEMORY BOARD & CONTROLLER */}
        <section aria-label="Campus Memory Board" className="w-full">
          <ScrapbookLandingController
            posts={posts}
            tasks={tasks}
            userProgress={userProgress}
            raffleEntries={raffleEntries}
            currentDay={currentDay}
            user={
              user
                ? {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                  }
                : null
            }
          />
        </section>
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
