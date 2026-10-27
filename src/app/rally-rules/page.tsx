import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { sql } from "@/lib/db";
import { LegalHeader, LegalAdvisoryBanner } from "@/components/legal/legal-header";

export const instant = false;

export const metadata: Metadata = {
  title: "Rally & Raffle Rules | Salingkusog Intramurals 2026",
  description:
    "Official 3x3 Bingo Photo Rally mechanics, raffle ticket eligibility, and in-person verification rules for Salingkusog Intramurals 2026.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RallyRulesPage() {
  await connection();

  let isRaffleActive = false;
  if (process.env.DATABASE_URL) {
    const configRows = await sql`
      SELECT COALESCE(is_raffle_active, false) as is_raffle_active 
      FROM public.event_config 
      WHERE key = 'active_event' 
      LIMIT 1
    `;
    isRaffleActive = Boolean(configRows[0]?.is_raffle_active);
  }

  return (
    <div className="min-h-[100dvh] bg-[#fcf9f5] text-[#1e1b19] flex flex-col font-body selection:bg-[#ffdcc4] selection:text-[#6f3800]">
      <LegalHeader currentTab="rally-rules" isRaffleActive={isRaffleActive} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        {/* Document Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-[#e8ded5] text-stone-600 text-xs font-medium shadow-2xs mb-3">
            <span className="w-2 h-2 rounded-full bg-[#588157]"></span>
            <span className="font-display font-semibold text-[#588157]">
              {isRaffleActive
                ? "Official Event Regulations & Stage Drawing"
                : "Official Event Regulations & Challenge Mechanics"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1e1b19] tracking-tight">
            {isRaffleActive
              ? "Intramurals 3×3 Bingo & Stage Raffle Rules"
              : "Intramurals 3×3 Bingo Rally Rules"}
          </h1>
          <p className="text-xs sm:text-sm text-[#8e706c] font-body mt-1">
            Active for Event Dates: <span className="font-mono bg-[#fff8f5] border border-[#ffdad5] px-1 py-0.5 rounded font-bold text-[#8e4e14] break-words">[EVENT DATES]</span>
          </p>
        </div>

        <LegalAdvisoryBanner />

        {/* Content Body */}
        <article className="prose prose-stone max-w-none text-xs sm:text-sm text-[#5a413d] leading-relaxed flex flex-col gap-6">
          {/* Section 1 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">1.</span> Eligibility &amp; Fair Play
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>One Account per Student:</strong> Each student may participate with one (1) verified Google account. Use of automated scripts, multiple accounts, or dummy accounts is strictly disqualified.
              </li>
              <li>
                <strong>Original Live Photography:</strong> Photos submitted to stamp bingo challenge slots must be captured during official Intramurals 2026 activities.
              </li>
              <li>
                <strong>No Stock or Duplicate Snaps:</strong> Re-uploading internet screenshots, stock imagery, or submitting the exact same photo into multiple challenge slots will invalidate associated {isRaffleActive ? "tickets" : "challenge stamps"}.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">2.</span> 3×3 Bingo Grid &amp; Stamp Mechanics
            </h2>
            <p>
              Your virtual card consists of 9 campus challenge squares representing athletic games, cheer squad spirit, department booths, and campus culture:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">Line Combinations</strong>
                <p className="text-[11px] text-[#5a413d] mt-1">
                  {isRaffleActive
                    ? "Completing any 3 slots in a row, column, or diagonal line earns 1 standard raffle ticket."
                    : "Completing any 3 slots in a row, column, or diagonal line completes a standard bingo line."}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">Milestone Challenges</strong>
                <p className="text-[11px] text-[#5a413d] mt-1">
                  {isRaffleActive
                    ? "Completing designated milestone slots unlocks bonus entry codes as configured by event organizers."
                    : "Completing designated milestone slots stamps your challenge board and unlocks event achievements."}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">
                  {isRaffleActive ? "Full Blackout Grand Prize" : "Full Blackout"}
                </strong>
                <p className="text-[11px] text-[#5a413d] mt-1">
                  {isRaffleActive
                    ? "Stamping all 9 slots completes a Full Blackout, qualifying you for the Grand Finale stage drawing."
                    : "Stamping all 9 slots completes a Full Blackout on your campus challenge card."}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-stone-500">
              {isRaffleActive
                ? "Note: If you delete a photo linked to a bingo slot, any raffle tickets dependent on that slot are automatically cancelled to maintain cryptographic fairness for all students."
                : "Note: If you delete a photo linked to a bingo slot, that slot returns to uncompleted status."}
            </p>
          </section>

          {/* Section 3 & 4 (Raffle-specific) */}
          {isRaffleActive && (
            <>
              {/* Section 3 */}
              <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
                <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
                  <span className="text-[#ff5e4d]">3.</span> Cryptographic Ticket Verification
                </h2>
                <p>
                  Every earned ticket is generated using high-entropy alphanumeric codes (e.g. <code className="font-mono font-bold text-[#b4281e]">SK-RFL-XXXXXX</code>) stored in our tamper-evident audit ledger:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Tickets cannot be forged, transferred, or assigned to other student accounts.</li>
                  <li>You can view all your earned ticket codes at any time inside the 3×3 Bingo Modal or in <Link href="/gallery" className="text-[#ff5e4d] underline font-semibold">My Gallery</Link>.</li>
                  <li>Tickets remain valid throughout event days unless disqualified for non-original photos.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
                <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
                  <span className="text-[#ff5e4d]">4.</span> In-Person Stage Prize Claiming Process
                </h2>
                <div className="p-3.5 rounded-xl bg-[#fff8f5] border border-[#ffdad5] text-xs font-body mb-3">
                  <strong className="font-display font-bold text-[#b4281e] block mb-1">
                    Zero Financial or Sensitive Info Collected:
                  </strong>
                  Salingkusog never asks for your bank details, credit card numbers, or mobile wallet pins. Prizes are physical awards distributed live in person on campus.
                </div>
                <p className="mb-2">
                  When winning numbers are drawn live at the main stage:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>
                    <strong>Physical Appearance:</strong> The student winner must be physically present at the live drawing or arrive at{" "}
                    <span className="font-mono bg-[#fff8f5] border border-[#ffdad5] px-1 py-0.5 rounded font-bold text-[#8e4e14] break-words">[PRIZE CLAIM BOOTH LOCATION]</span>{" "}
                    within the designated grace period announced by stage emcees.
                  </li>
                  <li>
                    <strong>Live Device Verification:</strong> Winner must present their active mobile device showing the signed-in Salingkusog account with the matching ticket code.
                  </li>
                  <li>
                    <strong>Student Identification:</strong> Present your valid school ID matching the Google account display name for final stage redemption.
                  </li>
                </ol>
              </section>
            </>
          )}
        </article>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#e8ded5] bg-[#fff8f5] py-8 px-4 text-center text-xs text-[#8e706c] font-body mt-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-display font-bold text-stone-700">
            Salingkusog 2026 · Collegiate Memory Board &amp; 3x3 Bingo
          </p>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:text-[#1e1b19] underline">Privacy Notice</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#1e1b19] underline">Terms of Use</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
