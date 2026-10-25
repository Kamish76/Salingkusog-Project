"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchActivityLogsAction,
  ActivityLogsSummary,
} from "@/app/actions/activity-logs";
import { ActivityLogRecord, ActivityActionType } from "@/lib/activity-logger";

export function ActivityLogsClient() {
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [summary, setSummary] = useState<ActivityLogsSummary>({
    totalCount: 0,
    userCount: 0,
    adminCount: 0,
    banCount: 0,
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLogRecord | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial batch of logs
  const loadInitialLogs = useCallback(
    async (searchQuery: string, category: string, actionType: string) => {
      setLoading(true);
      try {
        const result = await fetchActivityLogsAction({
          search: searchQuery,
          category,
          actionType: actionType === "all" ? undefined : actionType,
          offset: 0,
          limit: 25,
        });
        setLogs(result.logs);
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setSummary(result.summary);
      } catch (err) {
        console.error("Failed to load activity logs:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Handle search input debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadInitialLogs(value, categoryFilter, actionFilter);
    }, 350);
  };

  // Handle category tab change
  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    loadInitialLogs(search, category, actionFilter);
  };

  // Handle action type dropdown change
  const handleActionChange = (action: string) => {
    setActionFilter(action);
    loadInitialLogs(search, categoryFilter, action);
  };

  // Load more pagination
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchActivityLogsAction({
        search,
        category: categoryFilter,
        actionType: actionFilter === "all" ? undefined : actionFilter,
        offset: logs.length,
        limit: 25,
      });
      setLogs((prev) => [...prev, ...result.logs]);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error("Failed to load more logs:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const result = await fetchActivityLogsAction({
          search: "",
          category: "all",
          offset: 0,
          limit: 25,
        });
        if (!ignore) {
          setLogs(result.logs);
          setTotalCount(result.totalCount);
          setHasMore(result.hasMore);
          setSummary(result.summary);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load activity logs:", err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Helper for action badges
  const renderActionBadge = (action: ActivityActionType, metadata?: Record<string, unknown>) => {
    switch (action) {
      case "USER_REGISTER":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            NEW USER
          </span>
        );
      case "POST_SUBMIT": {
        const isBingo = metadata?.isBingoEntry ?? Boolean(metadata?.bingoTaskId);
        return isBingo ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
            <span>🎯</span>
            <span>BINGO PROOF</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1">
            <span>📸</span>
            <span>MEMORY DROP</span>
          </span>
        );
      }
      case "USER_BAN":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30">
            USER BAN
          </span>
        );
      case "USER_UNBAN":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            USER UNBAN
          </span>
        );
      case "ROLE_UPDATE":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
            ROLE UPDATE
          </span>
        );
      case "POST_MODERATE":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
            MODERATED
          </span>
        );
      case "RAFFLE_TOGGLE":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            RAFFLE TOGGLE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
            {action}
          </span>
        );
    }
  };

  // Helper for format time
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-1">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Total Audited Logs
          </span>
          <div className="text-2xl font-bold font-mono text-white">
            {summary.totalCount}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-1">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
            User Activities
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {summary.userCount}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-1">
          <span className="text-[11px] font-mono text-purple-400 uppercase tracking-wider">
            Admin Moderations
          </span>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {summary.adminCount}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-1">
          <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider">
            User Bans
          </span>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {summary.banCount}
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {[
              { id: "all", label: "All Activity" },
              { id: "user", label: "User Actions" },
              { id: "admin", label: "Admin Moderation" },
              { id: "system", label: "System Events" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                  categoryFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action Type Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">Filter Event:</span>
            <select
              value={actionFilter}
              onChange={(e) => handleActionChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Action Types</option>
              <option value="USER_REGISTER">New Users (USER_REGISTER)</option>
              <option value="POST_SUBMIT">Photo Posts (POST_SUBMIT)</option>
              <option value="USER_BAN">User Bans (USER_BAN)</option>
              <option value="USER_UNBAN">User Unbans (USER_UNBAN)</option>
              <option value="ROLE_UPDATE">Role Updates (ROLE_UPDATE)</option>
              <option value="POST_MODERATE">Moderated Posts (POST_MODERATE)</option>
              <option value="RAFFLE_TOGGLE">Raffle Toggles (RAFFLE_TOGGLE)</option>
            </select>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by actor name, email, target ID, or action description..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono placeholder:text-zinc-600 focus:outline-hidden focus:border-indigo-500 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                loadInitialLogs("", categoryFilter, actionFilter);
              }}
              className="absolute right-3 top-2.5 text-xs text-zinc-500 hover:text-zinc-300 font-mono"
            >
              ✕ clear
            </button>
          )}
        </div>
      </div>

      {/* 3. Logs Timeline Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>
            Showing <strong className="text-zinc-200">{logs.length}</strong> of{" "}
            <strong className="text-zinc-200">{totalCount}</strong> recorded logs
          </span>
          <button
            type="button"
            onClick={() => loadInitialLogs(search, categoryFilter, actionFilter)}
            className="text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1"
          >
            <span>↻ Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-500">Loading audit log traces...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="text-2xl">📋</div>
            <p className="text-sm font-semibold text-zinc-300">No activity logs found</p>
            <p className="text-xs text-zinc-500">
              No logs matched the selected filter or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 bg-zinc-950/40">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-800/30 transition group"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-400 text-[11px]">
                      {formatTime(log.createdAt)}
                    </td>

                    {/* Action Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderActionBadge(log.actionType, log.metadata)}
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-zinc-200">
                          {log.actorName || "System / Automated"}
                        </div>
                        {log.actorEmail && (
                          <div className="text-[11px] text-zinc-500">
                            {log.actorEmail}
                          </div>
                        )}
                        {log.actorRole && (
                          <span
                            className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold border ${
                              log.actorRole === "superadmin"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : log.actorRole === "admin"
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700"
                            }`}
                          >
                            {log.actorRole}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-zinc-300 max-w-md">
                      <p className="line-clamp-2 leading-relaxed">
                        {log.description}
                      </p>
                      {log.targetId && (
                        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                          target: {log.targetId} ({log.targetType || "entity"})
                        </span>
                      )}
                    </td>

                    {/* Details Modal Trigger */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono border border-zinc-700 transition cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="p-4 border-t border-zinc-800/80 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-zinc-700 transition cursor-pointer disabled:opacity-50"
            >
              {loadingMore ? "Loading more..." : "Load More Logs"}
            </button>
          </div>
        )}
      </div>

      {/* 4. Inspection Modal Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                {renderActionBadge(selectedLog.actionType, selectedLog.metadata)}
                <span className="text-xs font-mono text-zinc-400">
                  Log Inspection
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-white font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Log ID:</span>
                  <span className="text-zinc-300 select-all">{selectedLog.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Recorded At:</span>
                  <span className="text-zinc-300">
                    {formatTime(selectedLog.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Actor Identity:</span>
                  <span className="text-zinc-200">
                    {selectedLog.actorName} ({selectedLog.actorEmail || "no email"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Actor Role:</span>
                  <span className="text-amber-300 font-bold">
                    {selectedLog.actorRole || "none"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Target Type:</span>
                  <span className="text-zinc-300">
                    {selectedLog.targetType || "none"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Target ID:</span>
                  <span className="text-zinc-300 select-all">
                    {selectedLog.targetId || "none"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400 font-semibold">Description:</span>
                <p className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400 font-semibold">Structured Metadata:</span>
                <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
