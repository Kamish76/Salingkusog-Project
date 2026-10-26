"use client";

import { useState, useTransition } from "react";
import { reportPhotoAction, type ReportReason } from "@/app/actions/posts";

interface ReportPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onReported?: () => void;
}

const REPORT_REASONS: { id: ReportReason; label: string; desc: string }[] = [
  {
    id: "no_consent",
    label: "I appear in this photo without my consent",
    desc: "Request quick non-consensual image removal under Philippine DPA rules.",
  },
  {
    id: "inappropriate",
    label: "Inappropriate or offensive content",
    desc: "Explicit, dangerous, or alcohol/hazing-related imagery.",
  },
  {
    id: "harassment",
    label: "Harassment or bullying",
    desc: "Targeted ridicule, defamation, or collegiate hostility.",
  },
  {
    id: "other",
    label: "Other reason",
    desc: "Copyright infringement, stock photo misuse, or general issue.",
  },
];

export function ReportPhotoModal({
  isOpen,
  onClose,
  postId,
  onReported,
}: ReportPhotoModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason>("no_consent");
  const [details, setDetails] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await reportPhotoAction(postId, selectedReason, details);
      if (res.success) {
        setSubmitted(true);
        if (onReported) {
          onReported();
        }
      } else {
        setErrorMessage(res.error || "Unable to submit report. Please try again.");
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-[130] flex items-center justify-center p-3.5 sm:p-6 bg-stone-950/80 backdrop-blur-xs select-none overflow-y-auto"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-[#e8ded5] shadow-2xl p-5 sm:p-6 flex flex-col gap-4 text-[#1e1b19] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#e8ded5]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚩</span>
            <h3 id="report-modal-title" className="font-display font-bold text-base text-[#1e1b19]">
              Report Photo Memory
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close"
            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-bold transition active:scale-95 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="py-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-[#1e1b19]">
                Photo Flagged for Review
              </h4>
              <p className="text-xs text-[#5a413d] font-body mt-1 max-w-xs leading-relaxed">
                Thank you for helping keep Salingkusog safe and consensual. The memory has been quarantined for moderation review.
              </p>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="mt-2 px-5 py-2 rounded-xl bg-[#1e1b19] hover:bg-stone-800 text-white font-display font-bold text-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <p className="text-xs text-[#5a413d] font-body leading-relaxed">
              Why should this memory be removed or reviewed?
            </p>

            {/* Reason Radio Options */}
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((r) => {
                const isChecked = selectedReason === r.id;
                return (
                  <label
                    key={r.id}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      isChecked
                        ? "bg-[#fff8f5] border-[#ff5e4d]/60 shadow-2xs"
                        : "bg-[#fcf9f5] border-[#e8ded5] hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={isChecked}
                      onChange={() => setSelectedReason(r.id)}
                      className="mt-0.5 text-[#ff5e4d] focus:ring-[#ff5e4d] accent-[#ff5e4d] cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-display font-bold text-xs text-[#1e1b19] block leading-tight">
                        {r.label}
                      </span>
                      <span className="font-body text-[11px] text-[#8e706c] block mt-0.5">
                        {r.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Optional Details */}
            <div>
              <label htmlFor="report-details" className="block text-[11px] font-display font-semibold text-[#5a413d] mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={500}
                placeholder="Give us context (e.g. 'I am the student on the left wearing a red shirt and did not give consent')..."
                className="w-full p-2.5 rounded-xl bg-[#fcf9f5] border border-[#e8ded5] text-xs font-body text-[#1e1b19] focus:outline-none focus:border-[#ff5e4d] focus:bg-white resize-none h-20"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs text-center font-body">
                {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8ded5]">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 min-h-[44px] rounded-xl text-stone-600 hover:bg-stone-100 font-display font-medium text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 min-h-[44px] rounded-xl bg-[#b4281e] hover:bg-[#8e1c14] text-white font-display font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <span>{isPending ? "Submitting..." : "Submit Report"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
