"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

interface FloatingAuthModalProps {
  initialOpen?: boolean;
}

export function FloatingAuthModal({ initialOpen = true }: FloatingAuthModalProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err) {
      console.error("Sign in failed:", err);
      setLoading(false);
    }
  };

  // When modal is minimized (peek mode), show persistent bottom tactile floating pill
  if (!isOpen) {
    return (
      <div className="fixed bottom-5 inset-x-0 z-40 px-4 flex justify-center animate-bounce-subtle pointer-events-auto">
        <div className="flex items-center gap-2 p-1.5 pl-4 pr-2 rounded-full bg-[#00232b]/95 border-2 border-[#e09f3e] shadow-2xl backdrop-blur-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e09f3e] animate-ping"></span>
            <span className="font-display font-bold text-xs sm:text-sm text-[#fff3b0]">
              Ready to snap & win?
            </span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className="btn-tactile-primary px-4 py-2 rounded-full font-display font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <GoogleIcon />
            <span>{loading ? "Connecting..." : "Sign in with Google"}</span>
          </button>

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Expand Login Prompt"
            type="button"
            className="p-1.5 rounded-full hover:bg-[#335c67]/40 text-[#d5c4b1] transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-[#001115]/65 backdrop-blur-md transition-all duration-300">
      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-lg rounded-3xl sm:rounded-4xl bg-[#00232b]/95 border-2 border-[#e09f3e]/60 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-[#bfe9f7] flex flex-col justify-between overflow-hidden animate-scaleIn">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#e09f3e]/20 blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-[#9e2a2b]/30 blur-2xl pointer-events-none"></div>

        {/* Mobile Pull / Dismiss Header */}
        <div className="flex sm:hidden justify-center pb-2">
          <div className="w-12 h-1.5 rounded-full bg-[#335c67]/70"></div>
        </div>

        {/* Brand & Badge Header */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#9e2a2b] to-[#e09f3e] p-0.5 shadow-md shadow-[#9e2a2b]/30 flex-shrink-0">
                <div className="w-full h-full rounded-full bg-[#00232b] flex items-center justify-center text-xl">
                  ⚡
                </div>
              </div>
              <div>
                <span className="font-display font-extrabold text-sm sm:text-base text-[#e09f3e] tracking-tight block">
                  Salingkusog 2026
                </span>
                <span className="font-display text-[10px] text-[#d5c4b1] uppercase tracking-wider block font-semibold">
                  Freedom Board & 3x3 Bingo Hub
                </span>
              </div>
            </div>

            {/* Peek / Minimize Button */}
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              className="px-2.5 py-1 rounded-full bg-[#001f26] border border-[#335c67]/60 hover:border-[#e09f3e]/60 text-xs text-[#d5c4b1] hover:text-[#fff3b0] transition font-display flex items-center gap-1 cursor-pointer"
            >
              <span>Peek Board</span>
              <span>↓</span>
            </button>
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#fff3b0] tracking-tight leading-snug">
            Snap your day. Fill your board. Win the stage raffle.
          </h2>
          <p className="font-body text-xs sm:text-sm text-[#bfe9f7]/85 mt-2 leading-relaxed">
            Sign in with your Google account to unlock your personal 3x3 Intramurals Bingo card, submit selfie proofs, and claim verifiable raffle entries for stage prize drawings!
          </p>
        </div>

        {/* Google OAuth Call To Action */}
        <div className="relative z-10 mt-6 sm:mt-7 flex flex-col gap-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className="btn-tactile-primary w-full h-13 sm:h-14 rounded-full font-display font-extrabold text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            <GoogleIcon className="w-5 h-5" />
            <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
            <span className="text-lg">→</span>
          </button>

          {/* Peek Action Link */}
          <button
            onClick={() => setIsOpen(false)}
            type="button"
            className="w-full py-2 rounded-full text-center text-xs font-display text-[#d5c4b1] hover:text-[#fff3b0] transition cursor-pointer"
          >
            Or explore the Freedom Board & Bingo preview first →
          </button>
        </div>

        {/* Security & Verification Guarantee */}
        <div className="relative z-10 mt-5 pt-4 border-t border-[#335c67]/40 flex items-center justify-center gap-2 text-center text-[11px] text-[#d5c4b1]/80">
          <span className="text-[#e09f3e]">🔒</span>
          <span>
            Google OAuth automatically syncs your name & avatar • Zero setup required
          </span>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
