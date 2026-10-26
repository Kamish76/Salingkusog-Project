import type { Metadata } from "next";
import Link from "next/link";
import { LegalHeader, LegalAdvisoryBanner } from "@/components/legal/legal-header";

export const metadata: Metadata = {
  title: "Privacy Notice | Salingkusog Intramurals 2026",
  description:
    "Student-friendly Data Privacy Notice under Philippine Republic Act 10173 (Data Privacy Act of 2012) for Salingkusog Intramurals 2026.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PrivacyNoticePage() {
  return (
    <div className="min-h-[100dvh] bg-[#fcf9f5] text-[#1e1b19] flex flex-col font-body selection:bg-[#ffdcc4] selection:text-[#6f3800]">
      <LegalHeader currentTab="privacy" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        {/* Document Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-[#e8ded5] text-stone-600 text-xs font-medium shadow-2xs mb-3">
            <span className="w-2 h-2 rounded-full bg-[#ff5e4d]"></span>
            <span className="font-display font-semibold text-[#8e4e14]">
              Republic Act No. 10173 (Philippine DPA 2012)
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1e1b19] tracking-tight">
            Privacy Notice &amp; Data Care Policy
          </h1>
          <p className="text-xs sm:text-sm text-[#8e706c] font-body mt-1">
            Effective Version: <span className="font-mono font-bold">v1.0</span> · Last updated for Intramurals 2026
          </p>
        </div>

        <LegalAdvisoryBanner />

        {/* Content Body */}
        <article className="prose prose-stone max-w-none text-xs sm:text-sm text-[#5a413d] leading-relaxed flex flex-col gap-6">
          {/* Section 1 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">1.</span> Personal Information Controller &amp; Scope
            </h2>
            <p>
              This Privacy Notice explains how the student technology team behind <strong>Salingkusog Intramurals 2026</strong> (
              <span className="font-mono bg-[#fff8f5] border border-[#ffdad5] px-1.5 py-0.5 rounded font-semibold text-[#8e4e14]">[STUDENT DEV TEAM NAME]</span>
              ) in official coordination with{" "}
              <span className="font-mono bg-[#fff8f5] border border-[#ffdad5] px-1.5 py-0.5 rounded font-semibold text-[#8e4e14]">[CAMPUS / UNIVERSITY NAME]</span>
              , collects, processes, and cares for your personal data when you participate in the collegiate photo rally, 3×3 bingo challenge, and stage raffle draws.
            </p>
            <p className="mt-2">
              Participation is <strong>100% voluntary</strong>. No grades, attendance points, or academic requirements are linked to participating in this platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">2.</span> Data We Collect &amp; Why
            </h2>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left border-collapse border border-[#e8ded5] text-xs">
                <thead>
                  <tr className="bg-[#fcf9f5] text-[#1e1b19] font-display font-bold">
                    <th className="p-2.5 border border-[#e8ded5]">Data Category</th>
                    <th className="p-2.5 border border-[#e8ded5]">Exact Data Points</th>
                    <th className="p-2.5 border border-[#e8ded5]">Purpose &amp; Legal Basis (RA 10173 § 12)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2.5 border border-[#e8ded5] font-semibold text-[#1e1b19]">Account Identity</td>
                    <td className="p-2.5 border border-[#e8ded5]">Full name, Google email address, profile avatar</td>
                    <td className="p-2.5 border border-[#e8ded5]">Authentication via Google OAuth and linking your bingo progress and raffle entries to your verified account.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border border-[#e8ded5] font-semibold text-[#1e1b19]">Memory Posts</td>
                    <td className="p-2.5 border border-[#e8ded5]">Uploaded photos, custom memory captions, optional college/department tag, display name or anonymous toggle</td>
                    <td className="p-2.5 border border-[#e8ded5]">Displaying event memories on the shared campus board and verifying bingo challenge completions.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border border-[#e8ded5] font-semibold text-[#1e1b19]">Game &amp; Raffle Records</td>
                    <td className="p-2.5 border border-[#e8ded5]">3×3 Bingo completed slots, timestamps, unique cryptographic raffle ticket codes (e.g. <code className="font-mono text-[#b4281e]">SK-RFL-XXXXXX</code>)</td>
                    <td className="p-2.5 border border-[#e8ded5]">Verifying line/blackout completions and validating ticket eligibility during live in-person stage draws.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border border-[#e8ded5] font-semibold text-[#1e1b19]">Consent &amp; Audit Logs</td>
                    <td className="p-2.5 border border-[#e8ded5]">Terms &amp; privacy version consented (<code className="font-mono">v1.0</code>), consent timestamp, user-agent string, administrative action logs</td>
                    <td className="p-2.5 border border-[#e8ded5]">Compliance with National Privacy Commission (NPC) accountability and proof of consent requirements.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">3.</span> Automatic EXIF &amp; GPS Location Stripping
            </h2>
            <p>
              Your physical safety and privacy are paramount. When you select a photo in the <em>Drop a Memory</em> modal:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Your device redraws the photo onto an in-memory client-side HTML5 Canvas element before uploading.
              </li>
              <li>
                <strong>All EXIF metadata is permanently stripped:</strong> GPS latitude/longitude coordinates, camera device serial numbers, and original capture timestamps are discarded on your device.
              </li>
              <li>
                The photo is converted to an optimized, lightweight WebP image before sending to our storage bucket.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">4.</span> Third-Party Data Processors
            </h2>
            <p className="mb-2">
              We do not sell, rent, or monetize your personal data. We rely on the following secure infrastructure providers to run Salingkusog:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-[#e8ded5] text-xs">
                <thead>
                  <tr className="bg-[#fcf9f5] text-[#1e1b19] font-display font-bold">
                    <th className="p-2.5 border border-[#e8ded5]">Processor</th>
                    <th className="p-2.5 border border-[#e8ded5]">Role &amp; Data Handled</th>
                    <th className="p-2.5 border border-[#e8ded5]">Security Standards</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2.5 border border-[#e8ded5] font-semibold text-[#1e1b19]">Google LLC</td>
                    <td className="p-2.5 border border-[#e8ded5]">Single Sign-On (Google OAuth) for identity authentication.</td>
                    <td className="p-2.5 border border-[#e8ded5]">SOC 2/3, ISO 27001, industry standard OAuth 2.0.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border border-[#e8ded5] font-semibold text-[#1e1b19]">Neon Inc.</td>
                    <td className="p-2.5 border border-[#e8ded5]">Serverless PostgreSQL database and S3-compatible cloud object storage for photos and bingo rows.</td>
                    <td className="p-2.5 border border-[#e8ded5]">Encrypted at rest (AES-256) and in transit (TLS 1.3).</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border border-[#e8ded5] font-semibold text-[#1e1b19]">OpenAI LLC</td>
                    <td className="p-2.5 border border-[#e8ded5]">Automated community safety moderation (<code className="font-mono">omni-moderation-latest</code>) to block illicit or explicit uploads.</td>
                    <td className="p-2.5 border border-[#e8ded5]">Zero data retention for API moderation requests; data is not used for model training.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">5.</span> Retention &amp; Self-Service Erasure
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Event Keepsake:</strong> Photos remain visible on the commemorative campus scrapbook for the duration of Intramurals 2026 and subsequent archive viewing, unless deleted by the owner or requested for takedown.
              </li>
              <li>
                <strong>Individual Memory Deletion:</strong> You may permanently delete any photo memory you posted at any time, directly from the polaroid modal or in <Link href="/gallery" className="text-[#ff5e4d] underline font-semibold">My Gallery</Link>.
              </li>
              <li>
                <strong>Complete Account Wipeout (Right to Erasure):</strong> You can execute a 1-click full data wipeout in <em>My Gallery &gt; Privacy &amp; Permissions</em>. This immediately purges all of your uploaded photos from cloud storage, deletes your database rows, clears your bingo progress, invalidates your raffle codes, and revokes your consent record.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">6.</span> Your 8 Rights as a Data Subject Under RA 10173
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">1. Right to be Informed</strong>
                <p className="text-[11px] text-[#5a413d] mt-0.5">You are informed via this notice and onboarding modal before any personal data is gathered.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">2. Right to Access</strong>
                <p className="text-[11px] text-[#5a413d] mt-0.5">You can view all photos, bingo slots, and raffle codes you created inside <em>My Gallery</em>.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">3. Right to Object</strong>
                <p className="text-[11px] text-[#5a413d] mt-0.5">You can refuse consent, decline promotional recap features, or sign out without penalty.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">4. Right to Erasure / Blocking</strong>
                <p className="text-[11px] text-[#5a413d] mt-0.5">You can delete individual photos or trigger complete self-service account wipeout at any moment.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">5. Right to Rectification</strong>
                <p className="text-[11px] text-[#5a413d] mt-0.5">You can replace bingo photos or update your profile display preferences dynamically.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">6. Right to Data Portability</strong>
                <p className="text-[11px] text-[#5a413d] mt-0.5">You can export your complete 3×3 bingo memory collage card as a high-resolution PNG at any time.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">7. Right to File a Complaint</strong>
                <p className="text-[11px] text-[#5a413d] mt-0.5">You have the right to file a complaint before the National Privacy Commission (NPC) if your rights are violated.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <strong className="font-display font-bold text-xs text-[#1e1b19] block">8. Right to Damages</strong>
                <p className="text-[11px] text-[#5a413d] mt-0.5">You are entitled to indemnification for damages sustained due to inaccurate, incomplete, or unlawful data processing.</p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e8ded5] shadow-xs">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#1e1b19] mb-2 flex items-center gap-2">
              <span className="text-[#ff5e4d]">7.</span> Contact &amp; Takedown Requests
            </h2>
            <p>
              If your photo appears on the campus memory board without your consent, click the <strong>🚩 Report Photo</strong> button directly on the polaroid card for rapid automated flagging, or contact our support desks directly:
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 p-3.5 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e706c] block">
                  Quick Photo Takedown Desk
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[#b4281e] select-all block mt-0.5">
                  [TAKEDOWN EMAIL]
                </span>
                <span className="text-[11px] text-[#8e706c] block mt-1">
                  Monitored continuously during live Intramurals event days.
                </span>
              </div>

              <div className="flex-1 p-3.5 rounded-xl bg-[#fcf9f5] border border-[#e8ded5]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e706c] block">
                  Data Protection Officer (DPO) Inquiries
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[#1e1b19] select-all block mt-0.5">
                  [DPO / CONTACT EMAIL]
                </span>
                <span className="text-[11px] text-[#8e706c] block mt-1">
                  For formal compliance and regulatory communications.
                </span>
              </div>
            </div>
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
            <Link href="/terms" className="hover:text-[#1e1b19] underline">Terms of Use</Link>
            <span>•</span>
            <Link href="/rally-rules" className="hover:text-[#1e1b19] underline">Rally Rules</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
