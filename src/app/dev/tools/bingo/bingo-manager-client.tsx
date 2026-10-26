"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  type BingoTaskRecord,
  CANONICAL_BINGO_SEED_TASKS,
} from "@/lib/bingo-engine";
import {
  updateBingoTaskAction,
  resetBingoTasksToDefaultsAction,
} from "@/app/actions/bingo-tasks";
import {
  setCurrentDayAction,
  toggleEventStatusAction,
} from "@/app/actions/event-config";

interface BingoManagerClientProps {
  initialTasks: BingoTaskRecord[];
  currentDay: number;
  isEventActive?: boolean;
  userRole?: string;
}

const CATEGORIES = [
  { id: "spirit", label: "Spirit & Cheering", color: "amber" },
  { id: "booth", label: "Booths & Food", color: "emerald" },
  { id: "sports", label: "Athletics & Games", color: "sky" },
  { id: "culture", label: "Culture & Colors", color: "purple" },
  { id: "general", label: "General Campus", color: "zinc" },
] as const;

function CategoryIcon({ category, className = "w-4 h-4" }: { category: string; className?: string }) {
  switch (category) {
    case "spirit":
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75Z" />
        </svg>
      );
    case "booth":
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.614A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.015a2.993 2.993 0 0 0 2.25 1.015c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614M3.75 9.349h16.5" />
        </svg>
      );
    case "sports":
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18M3 12a9 9 0 0 1 18 0M5.5 5.5l13 13M18.5 5.5l-13 13" />
        </svg>
      );
    case "culture":
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        </svg>
      );
  }
}

export function BingoManagerClient({
  initialTasks,
  currentDay,
  isEventActive = true,
}: BingoManagerClientProps) {
  const [liveDay, setLiveDay] = useState<number>(currentDay || 1);
  const [liveEventActive, setLiveEventActive] = useState<boolean>(isEventActive);
  const [isUpdatingEvent, startEventTransition] = useTransition();
  // Sort tasks by slotIndex (0..8)
  const sortedInitial = [...initialTasks].sort((a, b) => a.slotIndex - b.slotIndex);
  
  // Fill any missing slots with fallback seed definition
  const canonicalTasks: BingoTaskRecord[] = Array.from({ length: 9 }, (_, idx) => {
    const existing = sortedInitial.find((t) => t.slotIndex === idx);
    if (existing) return existing;
    const seed = CANONICAL_BINGO_SEED_TASKS[idx];
    return {
      id: `slot-${idx}`,
      slotIndex: idx,
      title: seed.title,
      description: seed.description,
      category: seed.category,
      unlockDay: seed.unlockDay,
      requiresSelfie: seed.requiresSelfie,
      isActive: seed.isActive,
    };
  });

  const [tasks, setTasks] = useState<BingoTaskRecord[]>(canonicalTasks);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [previewDay, setPreviewDay] = useState<number | "all">(currentDay || 1);

  // Active form state for the currently selected slot
  const selectedTask = tasks[selectedSlotIndex] || tasks[0];
  const [formTitle, setFormTitle] = useState<string>(selectedTask.title);
  const [formDescription, setFormDescription] = useState<string>(selectedTask.description);
  const [formCategory, setFormCategory] = useState<string>(selectedTask.category);
  const [formUnlockDay, setFormUnlockDay] = useState<number>(selectedTask.unlockDay);
  const [formRequiresSelfie, setFormRequiresSelfie] = useState<boolean>(selectedTask.requiresSelfie);
  const [formIsActive, setFormIsActive] = useState<boolean>(selectedTask.isActive);

  // Update form fields when selected slot changes
  const handleSelectSlot = (slotIdx: number) => {
    setSelectedSlotIndex(slotIdx);
    const target = tasks[slotIdx];
    if (target) {
      setFormTitle(target.title);
      setFormDescription(target.description);
      setFormCategory(target.category);
      setFormUnlockDay(target.unlockDay);
      setFormRequiresSelfie(target.requiresSelfie);
      setFormIsActive(target.isActive);
      setStatusBanner(null);
    }
  };

  // Keep local tasks updated in real-time as user types for live preview!
  const updateLocalPreview = (updates: Partial<BingoTaskRecord>) => {
    setTasks((prev) =>
      prev.map((t, idx) => (idx === selectedSlotIndex ? { ...t, ...updates } : t))
    );
  };

  const [isSaving, startSaveTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const handleSaveCurrentTask = () => {
    setStatusBanner(null);
    if (!formTitle.trim()) {
      setStatusBanner({ type: "error", message: "Task title cannot be empty." });
      return;
    }

    startSaveTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", selectedTask.id);
      formData.set("slotIndex", selectedSlotIndex.toString());
      formData.set("title", formTitle.trim());
      formData.set("description", formDescription.trim());
      formData.set("category", formCategory);
      formData.set("unlockDay", formUnlockDay.toString());
      formData.set("requiresSelfie", formRequiresSelfie ? "true" : "false");
      formData.set("isActive", formIsActive ? "true" : "false");

      const result = await updateBingoTaskAction(formData);
      if (result.success && result.task) {
        setTasks((prev) =>
          prev.map((t, idx) => (idx === selectedSlotIndex ? result.task! : t))
        );
        setStatusBanner({
          type: "success",
          message: `Slot #${selectedSlotIndex + 1} ("${result.task.title}") updated successfully!`,
        });
      } else {
        setStatusBanner({
          type: "error",
          message: result.error || "Failed to update task.",
        });
      }
    });
  };

  const handleRevertSlot = () => {
    const original = initialTasks.find((t) => t.slotIndex === selectedSlotIndex);
    if (original) {
      setFormTitle(original.title);
      setFormDescription(original.description);
      setFormCategory(original.category);
      setFormUnlockDay(original.unlockDay);
      setFormRequiresSelfie(original.requiresSelfie);
      setFormIsActive(original.isActive);
      setTasks((prev) =>
        prev.map((t, idx) => (idx === selectedSlotIndex ? original : t))
      );
      setStatusBanner(null);
    }
  };

  const handleConfirmReset = () => {
    startResetTransition(async () => {
      const result = await resetBingoTasksToDefaultsAction();
      if (result.success) {
        setShowResetConfirmModal(false);
        setStatusBanner({
          type: "success",
          message: "All 9 challenge slots successfully reset to canonical default seed challenges!",
        });
        // Reload location to fetch latest IDs from database
        window.location.reload();
      } else {
        setStatusBanner({
          type: "error",
          message: result.error || "Failed to reset tasks.",
        });
      }
    });
  };

  const handleChangeLiveDay = (day: number) => {
    startEventTransition(async () => {
      try {
        await setCurrentDayAction(day);
        setLiveDay(day);
        setPreviewDay(day);
        setStatusBanner({
          type: "success",
          message: `Active Intramurals Day set to Day ${day}!`,
        });
      } catch (err: unknown) {
        setStatusBanner({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to update event day.",
        });
      }
    });
  };

  const handleToggleLiveEvent = () => {
    startEventTransition(async () => {
      try {
        const nextState = !liveEventActive;
        const fd = new FormData();
        fd.append("enabled", String(nextState));
        await toggleEventStatusAction(fd);
        setLiveEventActive(nextState);
        setStatusBanner({
          type: "success",
          message: `Event status switched to ${nextState ? "ACTIVE" : "PAUSED"}!`,
        });
      } catch (err: unknown) {
        setStatusBanner({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to toggle event status.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mb-1">
            <Link href="/dev" className="hover:text-zinc-200">Dev</Link>
            <span>/</span>
            <Link href="/dev/tools" className="hover:text-zinc-200">Developer Tools</Link>
            <span>/</span>
            <span className="text-amber-400">Bingo Card Manager</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>3x3 Bingo Card & Challenge Manager</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-normal">
              LIVE ENGINE
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Preview the live student 3x3 Bingo Card, test multi-day unlock schedules, and update challenge tasks in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowResetConfirmModal(true)}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Reset to Defaults</span>
          </button>
        </div>
      </div>

      {/* Organizer Live Event Controls Panel */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
              Active Intramural Day (Live DB)
            </span>
            <div className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={isUpdatingEvent}
                  onClick={() => handleChangeLiveDay(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50 ${
                    liveDay === d
                      ? "bg-amber-500 text-stone-950 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  Day {d}
                </button>
              ))}
            </div>
          </div>

          <div className="border-l border-zinc-800 pl-4 sm:pl-6">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
              Bingo Submission Status
            </span>
            <button
              type="button"
              disabled={isUpdatingEvent}
              onClick={handleToggleLiveEvent}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer flex items-center gap-2 ${
                liveEventActive
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${liveEventActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span>{liveEventActive ? "ACTIVE (Uploads Allowed)" : "PAUSED (Uploads Frozen)"}</span>
            </button>
          </div>
        </div>

        <div className="text-right text-[11px] font-mono text-zinc-500">
          Changes sync live across student clients.
        </div>
      </div>

      {/* Status feedback banner */}
      {statusBanner && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
            statusBanner.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
              : "bg-red-950/40 border-red-800/60 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {statusBanner.type === "success" ? "✓" : "!"}
            </span>
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-zinc-400 hover:text-zinc-200 font-mono text-xs cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Grid: Left = Live 3x3 Preview, Right = Slot Task Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ==================================================================== */}
        {/* LEFT COLUMN: LIVE 3X3 INTERACTIVE CARD PREVIEW                      */}
        {/* ==================================================================== */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur space-y-4">
            
            {/* Simulation Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-zinc-100 font-mono">
                  Live 3x3 Card Preview
                </h3>
              </div>

              {/* Day Unlock Simulator */}
              <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
                <span className="text-[10px] uppercase text-zinc-500 px-2">Simulate Day:</span>
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPreviewDay(d)}
                    className={`px-2.5 py-1 rounded transition text-xs cursor-pointer ${
                      previewDay === d
                        ? "bg-amber-500 text-stone-950 font-bold shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                    }`}
                  >
                    Day {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPreviewDay("all")}
                  className={`px-2.5 py-1 rounded transition text-xs cursor-pointer ${
                    previewDay === "all"
                      ? "bg-amber-500 text-stone-950 font-bold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            {/* Simulated Student Warm-Paper Card Shell */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#fcf9f5] text-stone-900 shadow-xl border border-stone-300 relative select-none">
              
              {/* Header inside paper card */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200/80">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-900 border border-amber-600/30">
                    Salingkusog 3x3
                  </span>
                  <span className="text-xs font-semibold text-stone-600">
                    Intramurals Challenge
                  </span>
                </div>
                <div className="text-[11px] font-mono text-stone-500">
                  {previewDay === "all" ? "Previewing All Open" : `Viewing Day ${previewDay}`}
                </div>
              </div>

              {/* 3x3 Grid */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 aspect-square">
                {tasks.map((task, idx) => {
                  const isSelected = selectedSlotIndex === idx;
                  const isLocked =
                    previewDay !== "all" && task.unlockDay > (typeof previewDay === "number" ? previewDay : 1);

                  return (
                    <button
                      key={task.id || idx}
                      type="button"
                      onClick={() => handleSelectSlot(idx)}
                      className={`relative rounded-xl p-2 sm:p-2.5 flex flex-col justify-between text-left transition-all cursor-pointer group overflow-hidden ${
                        isSelected
                          ? "bg-amber-100/90 ring-3 ring-amber-500 ring-offset-2 ring-offset-[#fcf9f5] shadow-md border-amber-400"
                          : "bg-white hover:bg-stone-50 border border-stone-300/80 hover:border-stone-400 shadow-xs"
                      } ${!task.isActive ? "opacity-60 grayscale-[40%]" : ""}`}
                    >
                      {/* Slot Header: Index + Category Icon */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold ${
                            isSelected
                              ? "bg-amber-600 text-white"
                              : "bg-stone-200/80 text-stone-700"
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <div className="flex items-center gap-1">
                          {task.requiresSelfie && (
                            <span
                              title="Requires Selfie Photo"
                              className="w-4 h-4 rounded flex items-center justify-center text-stone-600 bg-stone-100"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                              </svg>
                            </span>
                          )}
                          <span
                            title={`Category: ${task.category}`}
                            className="w-5 h-5 rounded-md flex items-center justify-center bg-stone-100 text-stone-700"
                          >
                            <CategoryIcon category={task.category} className="w-3 h-3 text-stone-700" />
                          </span>
                        </div>
                      </div>

                      {/* Title Center */}
                      <div className="my-auto py-1">
                        <p className="text-[11px] sm:text-xs font-bold text-stone-800 line-clamp-3 leading-snug">
                          {task.title || `Slot ${idx + 1}`}
                        </p>
                      </div>

                      {/* Footer Badge: Day or Active Status */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-stone-500 pt-1 border-t border-stone-200/50">
                        <span className="uppercase font-semibold">
                          Day {task.unlockDay}
                        </span>
                        {!task.isActive && (
                          <span className="text-red-600 font-bold">PAUSED</span>
                        )}
                        {isSelected && (
                          <span className="text-amber-700 font-bold">EDITING</span>
                        )}
                      </div>

                      {/* Locked Padlock Overlay */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-stone-900/65 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center text-white p-2 text-center transition-opacity">
                          <svg className="w-5 h-5 text-amber-400 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                          </svg>
                          <span className="text-[10px] font-bold font-mono tracking-wide">
                            Day {task.unlockDay}
                          </span>
                          <span className="text-[8px] text-stone-300 font-sans">
                            Locked
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instructions banner */}
              <div className="mt-3.5 pt-3 border-t border-stone-200 text-center">
                <p className="text-[11px] text-stone-500 font-mono">
                  💡 Click any slot above to edit its challenge task and settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: SLOT TASK EDITOR                                      */}
        {/* ==================================================================== */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur space-y-5">
            
            {/* Slot Selector Tab Bar (1..9) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 uppercase tracking-wider">Select Slot to Manage:</span>
                <span className="text-amber-400 font-bold">
                  Editing Slot #{selectedSlotIndex + 1}
                </span>
              </div>
              <div className="grid grid-cols-9 gap-1.5">
                {tasks.map((task, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSlot(idx)}
                    className={`py-2 rounded-lg font-mono text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                      selectedSlotIndex === idx
                        ? "bg-amber-500 text-stone-950 border-amber-400 shadow-xs"
                        : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700/80"
                    }`}
                  >
                    <span>#{idx + 1}</span>
                    <span className="text-[9px] opacity-75 font-normal">D{task.unlockDay}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Task Edit Form */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              
              {/* Task Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-200">
                  <label htmlFor="task-title">Challenge Title</label>
                  <span
                    className={`font-mono text-[10px] ${
                      formTitle.length > 110 ? "text-amber-400" : "text-zinc-500"
                    }`}
                  >
                    {formTitle.length} / 120
                  </span>
                </div>
                <input
                  id="task-title"
                  type="text"
                  maxLength={120}
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    updateLocalPreview({ title: e.target.value });
                  }}
                  placeholder="e.g. Opening Ceremony Cheer"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Category Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-200 block">
                  Challenge Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = formCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setFormCategory(cat.id);
                          updateLocalPreview({ category: cat.id });
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs"
                            : "bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 border-zinc-800"
                        }`}
                      >
                        <CategoryIcon category={cat.id} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unlock Day Segmented Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-200 block">
                  Unlock Schedule (Event Day)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((dayNum) => (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => {
                        setFormUnlockDay(dayNum);
                        updateLocalPreview({ unlockDay: dayNum });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border text-center transition cursor-pointer ${
                        formUnlockDay === dayNum
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                          : "bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 border-zinc-800"
                      }`}
                    >
                      Day {dayNum} ({dayNum === 1 ? "Opening" : dayNum === 2 ? "Games" : "Finals"})
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="task-description" className="text-xs font-medium text-zinc-200 block">
                  Student Instructions / Description
                </label>
                <textarea
                  id="task-description"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => {
                    setFormDescription(e.target.value);
                    updateLocalPreview({ description: e.target.value });
                  }}
                  placeholder="Clear instructions for what the student must capture in their photo proof..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500 transition resize-none leading-relaxed"
                />
              </div>

              {/* Toggle Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                
                {/* Requires Selfie Switch */}
                <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-medium text-zinc-200 block">
                      Selfie Required
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Student face must be in frame
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formRequiresSelfie}
                    onChange={(e) => {
                      setFormRequiresSelfie(e.target.checked);
                      updateLocalPreview({ requiresSelfie: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                  />
                </label>

                {/* Active in Game Switch */}
                <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-medium text-zinc-200 block">
                      Active Challenge
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Visible & playable on card
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => {
                      setFormIsActive(e.target.checked);
                      updateLocalPreview({ isActive: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80 gap-3">
                <button
                  type="button"
                  onClick={handleRevertSlot}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                >
                  Discard Edits
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentTask}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                      <span>Saving Slot #{selectedSlotIndex + 1}...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Slot #{selectedSlotIndex + 1}</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-w-md w-full p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg font-bold">
                !
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Reset All Bingo Tasks to Defaults?
                </h3>
                <p className="text-xs text-zinc-400">
                  This action will restore all 9 slots to the canonical intramurals seed challenges.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-1.5 font-mono">
              <div>• Restores canonical titles & descriptions</div>
              <div>• Realigns Day 1, Day 2, and Day 3 unlock distribution</div>
              <div>• Preserves student progress & photo proof records</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Confirm Reset</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
