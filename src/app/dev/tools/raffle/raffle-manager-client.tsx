"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  type RaffleRuleRecord,
  evaluateRaffleRules,
} from "@/lib/bingo-engine";
import {
  updateRaffleRuleAction,
  updateRaffleGlobalConfigAction,
  resetRaffleRulesToDefaultsAction,
} from "@/app/actions/raffle-rules";

interface RaffleStats {
  totalTickets: number;
  totalStudents: number;
  totalValid: number;
  totalVerified: number;
  totalDisqualified: number;
}

interface RaffleManagerClientProps {
  initialRules: RaffleRuleRecord[];
  initialIsRaffleActive: boolean;
  initialMaxTicketsPerUser: number;
  stats: RaffleStats;
  userRole: string;
}

export function RaffleManagerClient({
  initialRules,
  initialIsRaffleActive,
  initialMaxTicketsPerUser,
  stats,
}: RaffleManagerClientProps) {
  const [rules, setRules] = useState<RaffleRuleRecord[]>(initialRules);
  const [isRaffleActive, setIsRaffleActive] = useState<boolean>(initialIsRaffleActive);
  const [maxTicketsPerUser, setMaxTicketsPerUser] = useState<number>(initialMaxTicketsPerUser);

  // Active category filter tab
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

  // Local rule editing states
  const [savingRuleKey, setSavingRuleKey] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Transitions for server actions
  const [isPending, startTransition] = useTransition();

  // Reset confirmation modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ---------------------------------------------------------------------------
  // Simulator State (Interactive sandbox on the right pane)
  // ---------------------------------------------------------------------------
  const [simulatedCompletedSlots, setSimulatedCompletedSlots] = useState<number[]>([0, 1, 2]);
  const [simulatedMemoryDrops, setSimulatedMemoryDrops] = useState<number>(0);

  // Live evaluation of simulator state
  const simulationResult = useMemo(() => {
    return evaluateRaffleRules(rules, {
      completedSlotIndexes: simulatedCompletedSlots,
      memoryDropCount: simulatedMemoryDrops,
      existingClaims: [],
      maxTicketsPerUser,
    });
  }, [rules, simulatedCompletedSlots, simulatedMemoryDrops, maxTicketsPerUser]);

  // Handle toggling a rule active/inactive in local state
  const handleToggleRuleActive = (ruleKey: string) => {
    setRules((prev) =>
      prev.map((r) => (r.ruleKey === ruleKey ? { ...r, isActive: !r.isActive } : r))
    );
  };

  // Handle ticket count change
  const handleChangeTicketsAwarded = (ruleKey: string, tickets: number) => {
    setRules((prev) =>
      prev.map((r) => (r.ruleKey === ruleKey ? { ...r, ticketsAwarded: tickets } : r))
    );
  };

  // Handle description change
  const handleChangeDescription = (ruleKey: string, description: string) => {
    setRules((prev) =>
      prev.map((r) => (r.ruleKey === ruleKey ? { ...r, description } : r))
    );
  };

  // Save an individual rule to server
  const handleSaveRule = (rule: RaffleRuleRecord) => {
    setSavingRuleKey(rule.ruleKey);
    setFeedbackMessage(null);

    const formData = new FormData();
    formData.append("ruleId", rule.id);
    formData.append("ruleKey", rule.ruleKey);
    formData.append("name", rule.name);
    formData.append("description", rule.description);
    formData.append("ticketsAwarded", rule.ticketsAwarded.toString());
    formData.append("isActive", rule.isActive ? "true" : "false");

    startTransition(async () => {
      const res = await updateRaffleRuleAction(formData);
      setSavingRuleKey(null);
      if (res.success && res.rule) {
        setRules((prev) =>
          prev.map((r) => (r.ruleKey === res.rule!.ruleKey ? res.rule! : r))
        );
        setFeedbackMessage({
          type: "success",
          text: `Rule "${rule.name}" successfully saved.`,
        });
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to save rule.",
        });
      }
    });
  };

  // Save global event configuration
  const handleSaveGlobalConfig = () => {
    setFeedbackMessage(null);
    const formData = new FormData();
    formData.append("isRaffleActive", isRaffleActive ? "true" : "false");
    formData.append("maxTicketsPerUser", maxTicketsPerUser.toString());

    startTransition(async () => {
      const res = await updateRaffleGlobalConfigAction(formData);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: `Global raffle configuration saved (System ${isRaffleActive ? "ACTIVE" : "STANDBY"}, Cap: ${maxTicketsPerUser === 0 ? "Unlimited" : maxTicketsPerUser}).`,
        });
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to update global settings.",
        });
      }
    });
  };

  // Toggle global active state directly
  const handleToggleGlobalActive = () => {
    const nextState = !isRaffleActive;
    setIsRaffleActive(nextState);

    const formData = new FormData();
    formData.append("isRaffleActive", nextState ? "true" : "false");
    formData.append("maxTicketsPerUser", maxTicketsPerUser.toString());

    startTransition(async () => {
      const res = await updateRaffleGlobalConfigAction(formData);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: `Raffle system is now ${nextState ? "ACTIVE" : "STANDBY"}.`,
        });
      } else {
        setIsRaffleActive(!nextState);
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to toggle raffle system status.",
        });
      }
    });
  };

  // Reset to canonical defaults
  const handleResetToDefaults = () => {
    setShowResetConfirm(false);
    startTransition(async () => {
      const res = await resetRaffleRulesToDefaultsAction();
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: "All 7 raffle rules have been restored to canonical defaults.",
        });
        window.location.reload();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to reset rules.",
        });
      }
    });
  };

  // Filtered rules list
  const filteredRules = useMemo(() => {
    if (activeCategoryFilter === "all") return rules;
    return rules.filter((r) => r.category === activeCategoryFilter);
  }, [rules, activeCategoryFilter]);

  // Simulator helper presets
  const toggleSimulatorSlot = (slotIndex: number) => {
    setSimulatedCompletedSlots((prev) =>
      prev.includes(slotIndex)
        ? prev.filter((s) => s !== slotIndex)
        : [...prev, slotIndex].sort((a, b) => a - b)
    );
  };

  const handleSelectPreset = (preset: "clear" | "row1" | "col1" | "diagonal" | "blackout") => {
    if (preset === "clear") setSimulatedCompletedSlots([]);
    if (preset === "row1") setSimulatedCompletedSlots([0, 1, 2]);
    if (preset === "col1") setSimulatedCompletedSlots([0, 3, 6]);
    if (preset === "diagonal") setSimulatedCompletedSlots([0, 4, 8]);
    if (preset === "blackout") setSimulatedCompletedSlots([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mb-1">
            <Link href="/dev" className="hover:text-zinc-200">Dev</Link>
            <span>/</span>
            <Link href="/dev/tools" className="hover:text-zinc-200">Tools</Link>
            <span>/</span>
            <span className="text-amber-400">Raffle Rules Manager</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Raffle System & Ticket Rules Manager</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-normal">
              TICKET ENGINE
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure what counts as an authoritative stage raffle ticket, set per-rule rewards, student caps, and test live combinations in the interactive sandbox.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            type="button"
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* 2. Global Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedbackMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
              : "bg-red-950/40 border-red-800/60 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedbackMessage.type === "success" ? "✓" : "!"}</span>
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-zinc-400 hover:text-zinc-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Global Control & Stats Banner */}
      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/70 backdrop-blur space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          {/* Status Switch */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleGlobalActive}
              disabled={isPending}
              type="button"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isRaffleActive ? "bg-amber-500" : "bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isRaffleActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <div>
              <div className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-2">
                <span>Raffle System Status:</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded font-bold uppercase ${
                    isRaffleActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {isRaffleActive ? "ACTIVE (Drawings Open)" : "STANDBY (Drawings Paused)"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                When active, eligible submissions generate authoritative stage tickets immediately.
              </p>
            </div>
          </div>

          {/* Student Ticket Cap */}
          <div className="flex items-center gap-3 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
            <div>
              <label htmlFor="maxTickets" className="text-[11px] font-mono text-zinc-400 block font-bold">
                Max Tickets Per Student:
              </label>
              <span className="text-[10px] text-zinc-500">0 = Unlimited</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="maxTickets"
                type="number"
                min="0"
                max="20"
                value={maxTicketsPerUser}
                onChange={(e) => setMaxTicketsPerUser(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-mono text-center focus:border-amber-400 focus:outline-none"
              />
              <button
                onClick={handleSaveGlobalConfig}
                disabled={isPending}
                type="button"
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
            <span className="text-zinc-500 text-[10px] uppercase font-mono block">Total Tickets Issued</span>
            <span className="text-lg font-bold text-amber-400 font-mono mt-0.5 block">{stats.totalTickets}</span>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
            <span className="text-zinc-500 text-[10px] uppercase font-mono block">Active Rules</span>
            <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5 block">
              {rules.filter((r) => r.isActive).length} / {rules.length}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
            <span className="text-zinc-500 text-[10px] uppercase font-mono block">Unique Students</span>
            <span className="text-lg font-bold text-zinc-200 font-mono mt-0.5 block">{stats.totalStudents}</span>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
            <span className="text-zinc-500 text-[10px] uppercase font-mono block">Verified / Valid</span>
            <span className="text-lg font-bold text-indigo-400 font-mono mt-0.5 block">
              {stats.totalVerified} <span className="text-zinc-500 font-normal text-xs">/ {stats.totalValid}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Dual-Pane Management Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Configurable Rules Directory (8 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setActiveCategoryFilter("all")}
                type="button"
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  activeCategoryFilter === "all"
                    ? "bg-zinc-800 text-amber-300 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All ({rules.length})
              </button>
              <button
                onClick={() => setActiveCategoryFilter("bingo_line")}
                type="button"
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  activeCategoryFilter === "bingo_line"
                    ? "bg-zinc-800 text-amber-300 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Lines (4)
              </button>
              <button
                onClick={() => setActiveCategoryFilter("milestone")}
                type="button"
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  activeCategoryFilter === "milestone"
                    ? "bg-zinc-800 text-amber-300 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Milestones (2)
              </button>
              <button
                onClick={() => setActiveCategoryFilter("memory_drop")}
                type="button"
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  activeCategoryFilter === "memory_drop"
                    ? "bg-zinc-800 text-amber-300 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Campus Drops (1)
              </button>
            </div>

            <span className="text-[11px] font-mono text-zinc-500">
              Showing {filteredRules.length} rules
            </span>
          </div>

          {/* Rules Cards List */}
          <div className="space-y-3">
            {filteredRules.map((rule) => {
              const isSaving = savingRuleKey === rule.ruleKey;
              return (
                <div
                  key={rule.ruleKey}
                  className={`p-4 rounded-xl border transition space-y-3 ${
                    rule.isActive
                      ? "border-zinc-800 bg-zinc-900/60"
                      : "border-zinc-800/60 bg-zinc-950/30 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] px-2 py-0.2 rounded font-mono font-bold uppercase border ${
                            rule.category === "bingo_line"
                              ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                              : rule.category === "milestone"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                          }`}
                        >
                          {rule.category === "bingo_line"
                            ? "BINGO LINE"
                            : rule.category === "milestone"
                            ? "MILESTONE"
                            : "CAMPUS DROP"}
                        </span>
                        <h3 className="text-sm font-bold text-zinc-100">{rule.name}</h3>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 block">
                        rule_key: {rule.ruleKey}
                      </span>
                    </div>

                    {/* Active Switch */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleRuleActive(rule.ruleKey)}
                        type="button"
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          rule.isActive ? "bg-emerald-500" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            rule.isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-[10px] font-mono uppercase text-zinc-400 w-12">
                        {rule.isActive ? "ACTIVE" : "OFF"}
                      </span>
                    </div>
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                      Student Rule Explanation:
                    </label>
                    <textarea
                      rows={2}
                      value={rule.description}
                      onChange={(e) => handleChangeDescription(rule.ruleKey, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-300 focus:border-amber-400 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Tickets Awarded Counter & Save */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400">Tickets Awarded:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((val) => (
                          <button
                            key={val}
                            onClick={() => handleChangeTicketsAwarded(rule.ruleKey, val)}
                            type="button"
                            className={`w-7 h-6 rounded text-xs font-mono font-bold transition cursor-pointer ${
                              rule.ticketsAwarded === val
                                ? "bg-amber-500 text-zinc-950"
                                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            +{val}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveRule(rule)}
                      disabled={isSaving || isPending}
                      type="button"
                      className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition border border-zinc-700 flex items-center gap-1 cursor-pointer"
                    >
                      {isSaving ? "Saving..." : "Save Rule"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Live Interactive Rule Simulator / Testing Sandbox (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Live Rule Testing Sandbox</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    REAL-TIME
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Toggle completed bingo slots or campus photo uploads to simulate what tickets are awarded.
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                Quick Test Combinations:
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  onClick={() => handleSelectPreset("clear")}
                  type="button"
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  onClick={() => handleSelectPreset("row1")}
                  type="button"
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition cursor-pointer"
                >
                  Top Row (0,1,2)
                </button>
                <button
                  onClick={() => handleSelectPreset("col1")}
                  type="button"
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition cursor-pointer"
                >
                  Left Col (0,3,6)
                </button>
                <button
                  onClick={() => handleSelectPreset("diagonal")}
                  type="button"
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition cursor-pointer"
                >
                  Diagonal (0,4,8)
                </button>
                <button
                  onClick={() => handleSelectPreset("blackout")}
                  type="button"
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition cursor-pointer"
                >
                  Full Blackout (9/9)
                </button>
              </div>
            </div>

            {/* Interactive 3x3 Grid */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>Completed Slots ({simulatedCompletedSlots.length}/9):</span>
                <span>Click tiles to toggle</span>
              </div>
              <div className="grid grid-cols-3 gap-2 aspect-square max-w-[240px] mx-auto p-2 rounded-xl bg-zinc-950/70 border border-zinc-800">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((slot) => {
                  const isChecked = simulatedCompletedSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => toggleSimulatorSlot(slot)}
                      type="button"
                      className={`rounded-lg flex flex-col items-center justify-center font-mono transition select-none cursor-pointer ${
                        isChecked
                          ? "bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-sm"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-xs font-bold">Slot #{slot + 1}</span>
                      <span className="text-[9px]">{isChecked ? "COMPLETED" : "EMPTY"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Memory Drops Slider */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-mono text-[11px]">Campus Scrapbook Photo Drops:</span>
                <span className="font-mono font-bold text-amber-400">{simulatedMemoryDrops} photo(s)</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={simulatedMemoryDrops}
                onChange={(e) => setSimulatedMemoryDrops(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Simulation Results Card */}
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Earned Tickets:</span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {simulationResult.totalNewTickets} Ticket{simulationResult.totalNewTickets === 1 ? "" : "s"}
                </span>
              </div>

              {simulationResult.isCapped && (
                <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                  ⚠ Capped by Max Limit ({maxTicketsPerUser} per student)
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block">Triggered Rules:</span>
                {simulationResult.eligibleRewards.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No tickets earned with this combination.</p>
                ) : (
                  <ul className="space-y-1">
                    {simulationResult.eligibleRewards.map((reward, idx) => (
                      <li
                        key={`${reward.ruleKey}_${idx}`}
                        className="text-xs flex items-center justify-between p-1.5 rounded bg-zinc-900/80 border border-zinc-800"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-emerald-400 text-xs">✓</span>
                          <span className="text-zinc-300 truncate">{reward.ruleName}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0 ml-2">
                          +{reward.ticketsAwarded}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="max-w-md w-full p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-zinc-100">
              Restore Default Canonical Raffle Rules?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This will reset all 7 raffle rules (Horizontal Rows, Vertical Columns, Diagonals, Blackout, Milestones 3 & 6, and Memory Drop) to their original default settings and restore the student cap to unlimited (0).
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                type="button"
                className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                disabled={isPending}
                type="button"
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition cursor-pointer"
              >
                {isPending ? "Restoring..." : "Yes, Restore Defaults"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
