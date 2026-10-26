"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  SystemHealthSummary,
  SubsystemHealth,
  SubsystemStatus,
} from "@/lib/health-probes";
import type { SubsystemType } from "@/lib/server-log-buffer";

export function HealthDashboardClient() {
  const [data, setData] = useState<SystemHealthSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemType | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>("");

  const fetchHealth = useCallback(async (manual = false) => {
    if (manual) setIsProbing(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Health probe returned HTTP ${res.status}`);
      }
      const json: SystemHealthSummary = await res.json();
      setData(json);
      setError(null);
      setLastFetchTime(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      if (manual) setIsProbing(false);
    }
  }, []);

  // Initial fetch and auto-refresh effect
  useEffect(() => {
    let isCancelled = false;

    const probe = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Health probe returned HTTP ${res.status}`);
        }
        const json: SystemHealthSummary = await res.json();
        if (!isCancelled) {
          setData(json);
          setError(null);
          setLastFetchTime(new Date().toLocaleTimeString());
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    probe();

    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        probe();
      }, 5000);
    }

    return () => {
      isCancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh]);

  const getStatusBadge = (status: SubsystemStatus) => {
    switch (status) {
      case "healthy":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          dot: "bg-emerald-400",
          text: "Healthy",
        };
      case "degraded":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          dot: "bg-amber-400",
          text: "Degraded",
        };
      case "down":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          dot: "bg-rose-400",
          text: "Offline",
        };
      default:
        return {
          bg: "bg-zinc-800 text-zinc-400 border-zinc-700",
          dot: "bg-zinc-400",
          text: "Unconfigured",
        };
    }
  };

  const getLatencyBadge = (latency: number, status: SubsystemStatus) => {
    if (status === "unconfigured" || status === "down") return null;
    let color = "text-emerald-400";
    if (latency > 1000) color = "text-rose-400";
    else if (latency > 500) color = "text-amber-400";

    return (
      <span className={`font-mono text-xs font-semibold ${color}`}>
        {latency} ms
      </span>
    );
  };

  const renderServiceCard = (
    key: SubsystemType,
    title: string,
    icon: string,
    probe?: SubsystemHealth
  ) => {
    const status = probe?.status || "unconfigured";
    const badge = getStatusBadge(status);
    const isSelected = selectedSubsystem === key;

    return (
      <button
        type="button"
        onClick={() => setSelectedSubsystem(isSelected ? "all" : key)}
        className={`w-full text-left p-4 rounded-xl border transition flex flex-col justify-between gap-3 relative cursor-pointer ${
          isSelected
            ? "border-amber-400/80 bg-zinc-900 ring-1 ring-amber-400/50"
            : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/90"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="font-bold text-sm text-zinc-100">{title}</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${badge.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
            {badge.text}
          </span>
        </div>

        <div className="text-xs text-zinc-400 font-mono truncate w-full" title={probe?.message}>
          {probe?.message || "No status reported"}
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-2 border-t border-zinc-800/60 w-full">
          <span>{probe ? getLatencyBadge(probe.latencyMs, status) : "N/A"}</span>
          <span>{isSelected ? "Filtering Logs âœ“" : "Click to filter"}</span>
        </div>
      </button>
    );
  };

  // Filter logs by subsystem and search text
  const filteredLogs = (data?.recentLogs || []).filter((log) => {
    if (selectedSubsystem !== "all" && log.subsystem !== selectedSubsystem) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchSub = log.subsystem.toLowerCase().includes(q);
      const matchDet = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
      return matchMsg || matchSub || matchDet;
    }
    return true;
  });

  const isDbDown = data?.subsystems.database.status === "down";

  return (
    <div className="space-y-6">
      {/* Top Controls & Pulse Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                data?.status === "healthy"
                  ? "bg-emerald-400 animate-pulse"
                  : data?.status === "degraded"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-500"
              }`}
            ></span>
            <span className="font-bold text-sm text-zinc-200">
              System Status:{" "}
              <span className="font-mono uppercase tracking-wide">
                {data?.status || (loading ? "Probing..." : "Unknown")}
              </span>
            </span>
          </div>

          {lastFetchTime && (
            <span className="text-xs font-mono text-zinc-400 border-l border-zinc-800 pl-3">
              Last probe: {lastFetchTime}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition flex items-center gap-1.5 cursor-pointer ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autoRefresh ? "bg-emerald-400 animate-ping" : "bg-zinc-500"
              }`}
            ></span>
            <span>{autoRefresh ? "Auto-Refresh (5s)" : "Auto-Refresh Off"}</span>
          </button>

          <button
            type="button"
            disabled={isProbing}
            onClick={() => fetchHealth(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            {isProbing ? (
              <>
                <span className="animate-spin text-xs">âŸ³</span>
                <span>Probing...</span>
              </>
            ) : (
              <>
                <span>âš¡</span>
                <span>Probe All Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Database Offline Emergency Alert */}
      {isDbDown && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 text-rose-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span className="text-rose-400 text-lg">âš ï¸</span>
            <div>
              <p className="font-bold tracking-tight">Postgres Database Unreachable</p>
              <p className="text-rose-300/80">
                Diagnostic console is running in emergency decoupled mode. Serving resilient in-memory server error logs below.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-rose-500/20 border border-rose-500/40 font-mono text-[11px] font-bold">
            DECOUPLED MODE
          </span>
        </div>
      )}

      {/* General Error Banner */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2"
        >
          <span>âœ•</span>
          <span>Failed to fetch health endpoint: {error}</span>
        </div>
      )}

      {/* Subsystem Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderServiceCard(
          "database",
          "Neon Postgres",
          "ðŸ˜",
          data?.subsystems.database
        )}
        {renderServiceCard(
          "storage",
          "Neon S3 Storage",
          "ðŸª£",
          data?.subsystems.storage
        )}
        {renderServiceCard(
          "auth",
          "Neon Better Auth",
          "ðŸ”",
          data?.subsystems.auth
        )}
        {renderServiceCard(
          "moderation",
          "OpenAI Moderation",
          "ðŸ›¡ï¸",
          data?.subsystems.moderation
        )}
      </div>

      {/* Production & Diagnostic Error Logs Section */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900/40 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>ðŸ“‹</span>
              <span>Production Diagnostic & Error Stream</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Captures recent server exceptions, timeout events, and probe failures in Node memory.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>Buffer capacity:</span>
            <span className="font-bold text-zinc-200">
              {filteredLogs.length} / 100 events
            </span>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          {/* Subsystem Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            {(
              [
                { label: "All", value: "all" },
                { label: "Postgres", value: "database" },
                { label: "S3 Storage", value: "storage" },
                { label: "Auth", value: "auth" },
                { label: "Moderation", value: "moderation" },
                { label: "System", value: "system" },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setSelectedSubsystem(item.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  selectedSubsystem === item.value
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                    : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search error messages..."
              className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 font-mono"
            />
          </div>
        </div>

        {/* Log Entries Stream */}
        <div className="space-y-2 max-h-[480px] overflow-y-auto no-scrollbar font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-500">
              No diagnostic logs found matching current filter.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const levelColor =
                log.level === "error"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : log.level === "warn"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-950 transition flex flex-col gap-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${levelColor}`}
                      >
                        {log.level}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                        {log.subsystem}
                      </span>
                      <span className="text-zinc-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <span className="text-[10px] text-zinc-600 truncate">
                      {log.id}
                    </span>
                  </div>

                  <div className="text-zinc-200 text-xs break-words">
                    {log.message}
                  </div>

                  {log.details && (
                    <pre className="p-2 mt-1 rounded bg-zinc-900 border border-zinc-800/60 text-[11px] text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                      {typeof log.details === "string"
                        ? log.details
                        : JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
