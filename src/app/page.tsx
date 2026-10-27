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
import { checkUserConsent } from "@/app/actions/consent";
import { ConsentModal } from "@/components/legal/consent-modal";
import { realtimeServer, livePostsQuery } from "@/lib/realtime";
import type { SealedLiveQuery } from "@neon/realtime/client";


interface HomePageProps {
  searchParams?: Promise<{
    auth?: string;
  }>;
}

export const instant = false;

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getCurrentUser();
  const resolvedParams = searchParams ? await searchParams : {};
  const isAuthRequired = resolvedParams.auth === "required";

  const isUuid = Boolean(
    user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
  );

  // Fetch all initial homepage data concurrently to eliminate waterfall round-trip latency
  const statsPromise = sql`
    SELECT 
      (SELECT count(*) FROM public.posts WHERE status = 'published' AND image_url IS NOT NULL AND TRIM(image_url) != '') as total_snaps,
      (SELECT count(*) FROM public.raffle_entries WHERE status IN ('valid', 'verified')) as total_raffles,
      COALESCE((SELECT current_day FROM public.event_config WHERE key = 'active_event' LIMIT 1), 1) as current_day,
      COALESCE((SELECT is_event_active FROM public.event_config WHERE key = 'active_event' LIMIT 1), true) as is_event_active,
      COALESCE((SELECT is_raffle_active FROM public.event_config WHERE key = 'active_event' LIMIT 1), false) as is_raffle_active
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
    WHERE p.status = 'published'
      AND p.image_url IS NOT NULL
      AND TRIM(p.image_url) != ''
    ORDER BY p.created_at DESC
    LIMIT 10
  `;

  const sealedPromise: Promise<SealedLiveQuery<PostRecord> | null> = realtimeServer
    ? realtimeServer.seal({ query: livePostsQuery }).catch((err) => {
        console.warn("Could not seal live posts query:", err);
        return null;
      })
    : Promise.resolve(null);

  const taskRowsPromise = sql`
    SELECT id, slot_index, title, description, category, unlock_day, requires_selfie, is_active
    FROM public.bingo_tasks
    ORDER BY slot_index ASC
  `;

  const progressRowsPromise =
    user && isUuid
      ? sql`
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
        `
      : Promise.resolve([]);

  const raffleRowsPromise =
    user && isUuid
      ? sql`
          SELECT raffle_code, line_type, line_index
          FROM public.raffle_entries
          WHERE user_id = ${user.id}::uuid
            AND status != 'disqualified'
          ORDER BY created_at DESC
        `
      : Promise.resolve([]);

  const consentPromise =
    user && isUuid
      ? checkUserConsent(user.id)
      : Promise.resolve({ hasConsented: true, consent: null });

  const [statsRows, postRows, taskRows, progressRows, raffleRows, consentResult, sealedPostsQuery] = await Promise.all([
    statsPromise,
    postRowsPromise,
    taskRowsPromise,
    progressRowsPromise,
    raffleRowsPromise,
    consentPromise,
    sealedPromise,
  ]);

  const hasUserConsented = Boolean(consentResult.hasConsented);

  const totalSnaps = Number(statsRows[0]?.total_snaps || 0);
  const totalRaffles = Number(statsRows[0]?.total_raffles || 0);
  const currentDay = Number(statsRows[0]?.current_day || 1);
  const isEventActive = Boolean(statsRows[0]?.is_event_active ?? true);
  const isRaffleActive = Boolean(statsRows[0]?.is_raffle_active);

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

  const userProgress: UserProgressItem[] = (progressRows as Record<string, unknown>[]).map((r) => ({
    slotIndex: Number(r.slot_index),
    taskId: String(r.task_id),
    postId: String(r.post_id),
    completedAt: r.completed_at as string | Date,
    imageUrl: (r.image_url as string) || null,
    caption: (r.caption as string) || null,
  }));

  const raffleEntries: RaffleEntryItem[] = (raffleRows as Record<string, unknown>[]).map((r) => ({
    raffleCode: String(r.raffle_code),
    lineType: String(r.line_type),
    lineIndex: Number(r.line_index),
  }));

  return (
    <div className="min-h-[100dvh] bg-[#fcf9f5] text-[#1e1b19] flex flex-col font-body selection:bg-[#ffdcc4] selection:text-[#6f3800] relative overflow-x-hidden">
      {/* ANCHORED SCRAPBOOK HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e8ded5] bg-[#fcf9f5]/95 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Subtitle & Day Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5">
              <span className="font-display font-extrabold text-base sm:text-xl tracking-tight text-[#1e1b19]">
                Salingkusog
              </span>
              <span className="text-xs text-[#8e706c] font-body border-l border-[#e8ded5] pl-2 hidden sm:inline">
                Intramurals 2026
              </span>
            </Link>

            {/* Subtle Day Indicator grouped with event brand */}
            <div className="inline-flex items-center gap-1.5 text-xs font-body text-[#5a413d] bg-white px-2.5 py-1 rounded-full border border-[#e8ded5] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#ff5e4d]"></span>
              <span className="font-display font-bold text-[#8e4e14] whitespace-nowrap">Day {currentDay}</span>
            </div>
          </div>

          {/* Right User & Account Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Authenticated user indicator & My Gallery link */}
            {user && (
              <>
                <Link
                  href="/gallery"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full bg-[#f5ece9] hover:bg-[#ebdcd3] text-[#1e1b19] border border-[#e8ded5] text-xs font-display font-bold transition focus-visible:ring-2 focus-visible:ring-[#1e1b19] focus-visible:outline-none shrink-0"
                >
                  <svg className="w-3.5 h-3.5 text-[#ff5e4d] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  <span className="hidden sm:inline">My Gallery</span>
                  <span className="sm:hidden">Gallery</span>
                </Link>
                <span className="text-xs font-display font-semibold text-[#5a413d] hidden md:inline truncate max-w-[100px]">
                  {user.name?.split(" ")[0] ?? "Student"}
                </span>
              </>
            )}

            {/* Google Auth Button */}
            <AuthButton user={user} />
          </div>
        </div>
      </header>

      {/* MAIN CAMPUS SCRAPBOOK CANVAS */}
      <main className="relative z-10 pt-4 sm:pt-8 pb-28 sm:pb-24 max-w-6xl mx-auto px-3.5 sm:px-6 flex-1 w-full flex flex-col gap-6 sm:gap-10">
        {/* SCRAPBOOK AUTH REQUIRED BANNER */}
        {isAuthRequired && !user && (
          <div className="relative mx-auto max-w-xl w-full p-4 sm:p-5 rounded-2xl bg-[#fff8f5] border-2 border-dashed border-[#ffdad5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#ffdad5] text-[#b4281e] flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <div>
                <h2 className="font-display font-bold text-sm text-[#1e1b19]">
                  Personal Gallery Access
                </h2>
                <p className="text-xs text-[#5a413d] font-body mt-0.5">
                  Sign in with your Google account to view and manage your uploaded memories.
                </p>
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto flex justify-end">
              <AuthButton user={null} callbackURL="/gallery" />
            </div>
          </div>
        )}

        {/* HERO TITLE SECTION */}
        <section className="text-center max-w-3xl mx-auto pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-2 mb-3 sm:mb-4 px-3 py-1 rounded-md bg-white border border-[#e8ded5] text-stone-600 text-xs font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#ff5e4d] animate-pulse"></span>
            <span className="font-display font-semibold text-xs text-[#8e4e14]">
              Intramurals 2026 • Live Photo Rally
            </span>
          </div>

          <h1 className="text-2xl sm:text-5xl md:text-6xl font-display font-extrabold text-[#1e1b19] tracking-tight leading-[1.18]">
            Capture the spirit of Intramurals 2026 —{" "}
            <span className="font-handwriting font-normal text-[#ff5e4d] text-4xl sm:text-6xl md:text-7xl block sm:inline mt-1 sm:mt-0">
              one stamp at a time
            </span>
          </h1>

          <p className="mt-3 sm:mt-4 text-[#5a413d] font-body text-xs sm:text-base max-w-xl mx-auto font-normal leading-relaxed px-2">
            {isRaffleActive
              ? "Join the 3×3 live photo rally: snap student moments, stamp your card, and earn your ticket into the stage raffle draw."
              : "Join the 3×3 live photo rally: snap student moments, stamp your card, and share memories on the campus board."}
          </p>

          {/* Real Live Stats Bar */}
          <div className="mt-5 sm:mt-6 inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white border border-[#e8ded5] text-xs font-body shadow-2xs">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[#1e1b19]">
              <span className="font-display font-bold text-xs sm:text-sm text-[#ff5e4d]">
                {totalSnaps}
              </span>
              <span className="text-[#8e706c] text-[11px] sm:text-xs">
                {totalSnaps === 1 ? "Photo Snapped" : "Photos Snapped"}
              </span>
            </div>
            {isRaffleActive && (
              <>
                <span className="text-[#e8ded5]">•</span>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[#1e1b19]">
                  <span className="font-display font-bold text-xs sm:text-sm text-[#8e4e14]">
                    {totalRaffles}
                  </span>
                  <span className="text-[#8e706c] text-[11px] sm:text-xs">
                    {totalRaffles === 1 ? "Stage Raffle Entry" : "Stage Raffle Entries"}
                  </span>
                </div>
              </>
            )}
            <span className="text-[#e8ded5] hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-2 text-[#1e1b19]">
              <span className="w-2 h-2 rounded-full bg-[#588157]"></span>
              <span className="font-display font-bold text-sm text-[#588157]">
                Day {currentDay}
              </span>
              <span className="text-[#8e706c]">Rally Active</span>
            </div>
          </div>
        </section>

        {/* POLAROID MEMORY BOARD & CONTROLLER */}
        <section aria-label="Campus Memory Board" className="w-full">
          <ScrapbookLandingController
            posts={posts}
            sealedPostsQuery={sealedPostsQuery}
            tasks={tasks}
            userProgress={userProgress}
            raffleEntries={raffleEntries}
            currentDay={currentDay}
            isEventActive={isEventActive}
            isRaffleActive={isRaffleActive}
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

      {/* POST-OAUTH DPA CONSENT GATE MODAL */}
      {user && !hasUserConsented && (
        <ConsentModal isOpen={true} userName={user.name} />
      )}

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
