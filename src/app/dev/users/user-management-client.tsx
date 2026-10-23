"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import {
  fetchUsersAction,
  updateUserRoleAction,
  ManagedUserRecord,
} from "@/app/actions/auth-role";

interface UserManagementClientProps {
  canManageRoles: boolean;
  currentUserId?: string;
}

export function UserManagementClient({
  canManageRoles,
  currentUserId,
}: UserManagementClientProps) {
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial batch whenever search or roleFilter changes
  const loadInitialUsers = useCallback(
    async (searchQuery: string, role: string) => {
      setLoading(true);
      try {
        const result = await fetchUsersAction({
          search: searchQuery,
          role,
          offset: 0,
          limit: 10,
        });
        setUsers(result.users);
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search & filter trigger
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadInitialUsers(search, roleFilter);
    }, 250);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, roleFilter, loadInitialUsers]);

  // Lazy load next batch
  const loadMoreUsers = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchUsersAction({
        search,
        role: roleFilter,
        offset: users.length,
        limit: 10,
      });

      setUsers((prev) => {
        // Deduplicate in case records shifted
        const existingIds = new Set(prev.map((u) => u.id));
        const newOnes = result.users.filter((u) => !existingIds.has(u.id));
        return [...prev, ...newOnes];
      });
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Failed to lazy-load more users:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, search, roleFilter, users.length]);

  // IntersectionObserver for infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreUsers();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMoreUsers]);

  // Handle role change via server action
  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("targetUserId", targetUserId);
        formData.append("newRole", newRole);

        await updateUserRoleAction(formData);

        // Optimistically update local state
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
        );

        setStatusMessage(`Successfully updated role to ${newRole}.`);
        setTimeout(() => setStatusMessage(null), 3000);
      } catch (err) {
        const error = err as Error;
        setStatusMessage(`Failed to update role: ${error.message}`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast / Status Notification */}
      {statusMessage && (
        <div className="p-3 rounded-lg text-xs font-mono bg-zinc-800 border border-zinc-700 text-amber-300 flex items-center justify-between animate-fade-in">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-white ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar Controls */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 text-xs">
            🔍
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter search by name or email..."
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-200 text-xs cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role Filter & Count */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-zinc-400 font-mono whitespace-nowrap">
            Role:
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono transition cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="superadmin">SuperAdmin</option>
            <option value="admin">Admin (Moderator)</option>
            <option value="user">User</option>
          </select>

          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/80 whitespace-nowrap">
            {loading ? "Counting..." : `${totalCount} ${totalCount === 1 ? "Account" : "Accounts"}`}
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/80">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Role Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {loading && users.length === 0 ? (
                // Initial Loading Skeletons
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="h-3 w-28 bg-zinc-800 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3 w-36 bg-zinc-800 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-5 w-20 bg-zinc-800 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3 w-20 bg-zinc-800 rounded"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-7 w-28 bg-zinc-800 rounded ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((u) => {
                  const isRootSuperAdmin = u.role === "superadmin";
                  const isCurrentSessionUser = currentUserId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-zinc-900/40 transition duration-150"
                    >
                      <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        <span>{u.name}</span>
                        {isCurrentSessionUser && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border inline-block ${
                            u.role === "superadmin"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : u.role === "admin"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                              : "bg-zinc-800 text-zinc-400 border-zinc-700"
                          }`}
                        >
                          {u.role === "admin" ? "admin (moderator)" : u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 font-mono">{u.createdAt}</td>
                      <td className="py-3.5 px-4 text-right">
                        {isRootSuperAdmin ? (
                          <span className="text-[11px] text-amber-400/90 font-medium">
                            Protected Root
                          </span>
                        ) : canManageRoles ? (
                          <div className="inline-flex items-center gap-2">
                            <select
                              value={u.role}
                              disabled={isPending}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                            >
                              <option value="user">user</option>
                              <option value="admin">admin (moderator)</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Read-Only (SuperAdmin only)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 space-y-2">
                    <p className="text-sm text-zinc-400">No user accounts found.</p>
                    <p className="text-xs">
                      Try adjusting your search query or role filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lazy Loading Sentinel & Load More Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-400">
          <div>
            Showing <span className="text-zinc-200 font-bold">{users.length}</span> of{" "}
            <span className="text-zinc-200 font-bold">{totalCount}</span> registered{" "}
            {totalCount === 1 ? "account" : "accounts"}
          </div>

          <div className="flex items-center gap-3">
            {/* Infinite Scroll Sentinel element */}
            <div ref={sentinelRef} className="h-1 w-1 pointer-events-none" />

            {loadingMore && (
              <span className="flex items-center gap-2 text-amber-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                Lazy loading more accounts...
              </span>
            )}

            {!loading && hasMore && !loadingMore && (
              <button
                onClick={loadMoreUsers}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
              >
                Load More Accounts ↓
              </button>
            )}

            {!loading && !hasMore && users.length > 0 && (
              <span className="text-zinc-500">✓ All matching accounts loaded</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
