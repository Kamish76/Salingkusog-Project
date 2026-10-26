import type { Metadata } from "next";
import Link from "next/link";
import { LegalHeader, LegalAdvisoryBanner } from "@/components/legal/legal-header";

export const metadata: Metadata = {
  title: "Terms of Use & Community Guidelines | Salingkusog Intramurals 2026",
  description:
    "Terms of Use, Community Guidelines, and Photo Licensing for Salingkusog Intramurals 2026.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TermsOfUsePage() {
  return (
    <div className="min-h-[100dvh] bg-[#fcf9f5] text-[#1e1b19] flex flex-col font-body selection:bg-[#ffdcc4] selection:text-[#6f3800]">
      <LegalHeader currentTab="terms" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        {/* Document Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-[#e8ded5] text-stone-600 text-xs font-medium shadow-2xs mb-3">
            <span className="w-2 h-2 rounded-full bg-[#ff5e4d]"></span>
            <span className="font-display font-semibold text-[#8e4e14]">
              Campus Community Standards &amp; Licensing
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1e1b19] tracking-tight">
            Terms of Use &amp; Community Guidelines
          </h1>
          <p className="text-xs sm:text-sm text-[#8e706c] font-body mt-1">
            Effective Version: <span className="font-mono font-bold">v1.0</span> · Intramurals 2026
          </p>
        </div>

        <LegalAdvisoryBanner />

        {/* Content Body */}
        <article className="prose prose-stone max-w-none text-xs sm:text-sm text-[#5a413d] leading-relaxed flex flex-col gap-6">
          {/* Section 1 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">1.</span> Wholesome Campus Spirit &amp; Voluntary Participation
            </h2>
            <p>
              Salingkusog is a collegiate scrapbook and photo rally application created to celebrate student spirit, athletics, cheering, and camaraderie during <strong>Intramurals 2026</strong>.
            </p>
            <p className="mt-2">
              Participation is strictly <strong>voluntary</strong> and open to college attendees, faculty, and official guests aged 18 and older. No academic grade, credit, or attendance penalty is connected with choosing not to register or participate.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">2.</span> Respecting Others: Consent Before Posting
            </h2>
            <div className="p-3.5 rounded-xl bg-[#fff8f5] border border-[#ffdad5] text-xs font-body mb-3">
              <strong className="font-display font-bold text-[#b4281e] block mb-1">
                The Golden Rule of Campus Snaps:
              </strong>
              Always confirm that classmates, teammates, professors, and friends recognizable in your photograph are happy and comfortable with having their photo shared on the live campus board.
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Do not post surreptitious, embarrassing, or non-consensual candid photos of peers in private campus areas (restrooms, locker rooms, dormitories, or medical tents).</li>
              <li>If any classmate asks you to remove a photo they appear in, you are expected to promptly comply by deleting it from <Link href="/gallery" className="text-[#ff5e4d] underline font-semibold">My Gallery</Link>.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">3.</span> Content Rules &amp; Automated Safety
            </h2>
            <p className="mb-2">
              All uploads pass through automated multimodal safety screening (<code className="font-mono">omni-moderation-latest</code>) and community peer review. The following content is strictly prohibited:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Explicit, sexually suggestive, or nude imagery.</li>
              <li>Hate speech, discrimination, harassment, bullying, or defamation targeting individuals or collegiate departments.</li>
              <li>Depictions of alcohol consumption, illicit drugs, dangerous hazing, or physical violence.</li>
              <li>Commercial advertisements, spam, unauthorized external promotional links, or irrelevant web memes.</li>
            </ul>
            <p className="mt-2 text-stone-500 italic">
              Violations will result in immediate removal of the photo, forfeiture of linked raffle codes, and account suspension under our moderation lifecycle policies.
            </p>
          </section>

          {/* Section 4 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">4.</span> Photo Copyright &amp; Display License
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>You retain 100% of your copyright:</strong> You own the photos you snap and upload. Salingkusog does not claim ownership of your intellectual property.
              </li>
              <li>
                <strong>Non-Exclusive Display License:</strong> By posting a memory to Salingkusog, you grant the organizers a limited, non-exclusive, royalty-free license to display your photo on the digital memory board and in the 3×3 bingo rally verification feed.
              </li>
              <li>
                <strong>Optional Promotional Recap Feature:</strong> If and only if you opted into the promotional recap toggle during onboarding (or enabled it in <em>My Gallery</em>), the student organizers may feature your photo in official Intramurals wrap-up highlights, commemorative slideshows, or official campus recap posts. You can turn this permission off anytime with zero hassle.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">5.</span> Takedowns &amp; Notice Procedures
            </h2>
            <p>
              We honor all takedown requests without question. If you appear in a photo posted by another student and wish to have it removed:
            </p>
            <ol className="list-decimal pl-5 mt-2 space-y-1.5">
              <li>
                <strong>In-App Flagging (Fastest):</strong> Click the photo on the campus board, select <strong>🚩 Report Photo</strong>, choose <em>&quot;I appear without my consent&quot;</em>, and submit. The photo is immediately quarantined and submitted to administrators for review.
              </li>
              <li>
                <strong>Email Takedown Desk:</strong> Send a quick email to{" "}
                <span className="font-mono bg-[#fff8f5] border border-[#ffdad5] px-1 py-0.5 rounded font-semibold text-[#b4281e]">[TAKEDOWN EMAIL]</span>{" "}
                with the memory caption or link. Takedown requests are honored promptly by the student developer committee.
              </li>
            </ol>
          </section>
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
            <Link href="/rally-rules" className="hover:text-[#1e1b19] underline">Rally Rules</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
