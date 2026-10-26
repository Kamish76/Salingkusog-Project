"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveUserConsentAction } from "@/app/actions/consent";
import { authClient } from "@/lib/auth/client";

interface ConsentModalProps {
  isOpen: boolean;
  userName?: string | null;
}

export function ConsentModal({ isOpen, userName }: ConsentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPublicBoard, setAgreedPublicBoard] = useState(false);
  const [agreedPromo, setAgreedPromo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const canProceed = agreedTerms && agreedPublicBoard && !isPending && !isSigningOut;

  const handleAgree = () => {
    if (!canProceed) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await saveUserConsentAction(agreedPromo);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMessage(res.error || "Unable to save your agreement. Please try again.");
      }
    });
  };

  const handleDeclineAndSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      window.location.href = "/";
    } catch (err) {
      console.error("Sign out error:", err);
      window.location.href = "/";
    }
  };

  const firstName = userName ? userName.split(" ")[0] : "Student";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3.5 sm:p-6 bg-stone-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-[#fff8f5] border-2 border-[#ffdad5] shadow-2xl p-5 sm:p-7 flex flex-col gap-4 text-[#1e1b19] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Washi Tape accent */}
        <div className="washi-tape-coral w-32 h-5 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-xs opacity-90 pointer-events-none shadow-xs" />

        {/* Modal Header */}
        <div className="text-center pt-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#ffdad5] text-[#b4281e] flex items-center justify-center mb-2.5 shadow-2xs">
            <span className="text-2xl" role="img" aria-label="Camera Stamp">📸</span>
          </div>
          <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#8e4e14]">
            Intramurals 2026 • Campus Memory Board
          </span>
          <h2 id="consent-modal-title" className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-[#1e1b19] mt-0.5">
            Welcome, {firstName}!
          </h2>
          <p className="text-xs sm:text-[13px] text-[#5a413d] font-body mt-1 leading-relaxed max-w-md mx-auto">
            Before you start sharing snaps and earning stage raffle tickets, please review how we care for your privacy under the Philippine Data Privacy Act (RA 10173).
          </p>
        </div>

        {/* Unbundled Checkboxes Card */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#e8ded5] shadow-2xs flex flex-col gap-3.5 text-xs font-body">
          {/* Checkbox 1 (Required) */}
          <label className="flex items-start gap-3 cursor-pointer select-none group min-h-[44px]">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 h-4.5 w-4.5 rounded border-[#e8ded5] text-[#ff5e4d] focus:ring-[#ff5e4d] accent-[#ff5e4d] cursor-pointer shrink-0"
            />
            <div className="flex-1 leading-snug text-[#5a413d]">
              <span className="font-display font-bold text-[#1e1b19] block mb-0.5">
                <span className="text-[#b4281e]">[Required]</span> Terms &amp; Privacy Agreement
              </span>
              <span>
                I have read and agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-bold text-[#b4281e] hover:underline"
                >
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-bold text-[#b4281e] hover:underline"
                >
                  Privacy Notice
                </Link>
                . I understand this event is intended for college attendees and participants aged 18+.
              </span>
            </div>
          </label>

          <div className="border-t border-[#f5ece9]" />

          {/* Checkbox 2 (Required) */}
          <label className="flex items-start gap-3 cursor-pointer select-none group min-h-[44px]">
            <input
              type="checkbox"
              checked={agreedPublicBoard}
              onChange={(e) => setAgreedPublicBoard(e.target.checked)}
              className="mt-0.5 h-4.5 w-4.5 rounded border-[#e8ded5] text-[#ff5e4d] focus:ring-[#ff5e4d] accent-[#ff5e4d] cursor-pointer shrink-0"
            />
            <div className="flex-1 leading-snug text-[#5a413d]">
              <span className="font-display font-bold text-[#1e1b19] block mb-0.5">
                <span className="text-[#b4281e]">[Required]</span> Shared Campus Board Notice
              </span>
              <span>
                I understand that memories I post will appear in the shared campus memory board visible to other attendees. (GPS location and device EXIF are automatically stripped).
              </span>
            </div>
          </label>

          <div className="border-t border-[#f5ece9]" />

          {/* Checkbox 3 (Optional) */}
          <label className="flex items-start gap-3 cursor-pointer select-none group min-h-[44px]">
            <input
              type="checkbox"
              checked={agreedPromo}
              onChange={(e) => setAgreedPromo(e.target.checked)}
              className="mt-0.5 h-4.5 w-4.5 rounded border-[#e8ded5] text-[#ff5e4d] focus:ring-[#ff5e4d] accent-[#ff5e4d] cursor-pointer shrink-0"
            />
            <div className="flex-1 leading-snug text-[#5a413d]">
              <span className="font-display font-semibold text-[#1e1b19] block mb-0.5">
                <span className="text-[#588157] font-bold">[Optional]</span> Event Recap &amp; Promo Feature
              </span>
              <span>
                I allow student organizers to feature my photos in official Intramurals wrap-up recaps and campus highlights. (You can toggle this off anytime in My Gallery).
              </span>
            </div>
          </label>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs text-center font-body flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-1">
          <button
            onClick={handleDeclineAndSignOut}
            disabled={isSigningOut || isPending}
            type="button"
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-display font-medium text-xs border border-stone-200 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSigningOut ? "Signing out..." : "Decline & Sign Out"}
          </button>

          <button
            onClick={handleAgree}
            disabled={!canProceed}
            type="button"
            className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] rounded-xl bg-[#ff5e4d] hover:bg-[#b4281e] disabled:opacity-40 disabled:hover:bg-[#ff5e4d] text-white font-display font-bold text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isPending ? "Entering Salingkusog..." : "Agree & Enter Salingkusog"}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
