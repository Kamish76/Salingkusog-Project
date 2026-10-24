"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import {
  fetchUsersAction,
  updateUserRoleAction,
  banUserAction,
  unbanUserAction,
  fetchUserSubmissionsAction,
  moderateSubmissionAction,
  ManagedUserRecord,
  UserBingoSubmission,
} from "@/app/actions/auth-role";

interface UserManagementClientProps {
  canManageRoles: boolean;
  canModerate: boolean;
  currentUserId?: string;
}

export function UserManagementClient({
  canManageRoles,
  canModerate,
  currentUserId,
}: UserManagementClientProps) {
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Inspection Modal State
  const [inspectingUser, setInspectingUser] = useState<ManagedUserRecord | null>(null);
  const [submissions, setSubmissions] = useState<UserBingoSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionActionPending, setSubmissionActionPending] = useState<string | null>(null);

  // Ban Modal State
  const [banningUser, setBanningUser] = useState<ManagedUserRecord | null>(null);
  const [banReason, setBanReason] = useState("");

  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial batch whenever search, roleFilter, or statusFilter changes
  const loadInitialUsers = useCallback(
    async (searchQuery: string, role: string, status: string) => {
      setLoading(true);
      try {
        const result = await fetchUsersAction({
          search: searchQuery,
          role,
          status,
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
      loadInitialUsers(search, roleFilter, statusFilter);
    }, 250);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, roleFilter, statusFilter, loadInitialUsers]);

  // Lazy load next batch
  const loadMoreUsers = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchUsersAction({
        search,
        role: roleFilter,
        status: statusFilter,
        offset: users.length,
        limit: 10,
      });

      setUsers((prev) => {
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
  }, [loadingMore, hasMore, search, roleFilter, statusFilter, users.length]);

  // Infinite scroll sentinel
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

  // Handle role update (SuperAdmin only)
  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("targetUserId", targetUserId);
        formData.append("newRole", newRole);

        await updateUserRoleAction(formData);

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

  // Open Ban confirmation modal
  const openBanModal = (user: ManagedUserRecord) => {
    setBanningUser(user);
    setBanReason("Uploaded inappropriate photo proof violating campus intramurals rules.");
  };

  // Confirm Ban Action
  const handleConfirmBan = async () => {
    if (!banningUser || !banReason.trim()) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("targetUserId", banningUser.id);
        formData.append("reason", banReason.trim());

        await banUserAction(formData);

        setUsers((prev) =>
          prev.map((u) =>
            u.id === banningUser.id
              ? { ...u, banned: true, banReason: banReason.trim() }
              : u
          )
        );

        setStatusMessage(`User ${banningUser.name} has been banned.`);
        setBanningUser(null);
        setTimeout(() => setStatusMessage(null), 3500);
      } catch (err) {
        const error = err as Error;
        setStatusMessage(`Failed to ban user: ${error.message}`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    });
  };

  // Unban Action
  const handleUnban = async (targetUser: ManagedUserRecord) => {
    if (!confirm(`Are you sure you want to lift the ban on ${targetUser.name}?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("targetUserId", targetUser.id);

        await unbanUserAction(formData);

        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetUser.id
              ? { ...u, banned: false, banReason: null }
              : u
          )
        );

        setStatusMessage(`Ban lifted for ${targetUser.name}.`);
        setTimeout(() => setStatusMessage(null), 3500);
      } catch (err) {
        const error = err as Error;
        setStatusMessage(`Failed to unban user: ${error.message}`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    });
  };

  // Open User Submissions Inspector
  const handleInspectSubmissions = async (user: ManagedUserRecord) => {
    setInspectingUser(user);
    setLoadingSubmissions(true);
    try {
      const data = await fetchUserSubmissionsAction(user.id);
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to load submissions:", err);
      setStatusMessage("Failed to load user submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Toggle Hide / Publish status on a photo submission
  const handleModeratePhoto = async (postId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "hidden" ? "published" : "hidden";
    setSubmissionActionPending(postId);

    try {
      await moderateSubmissionAction(postId, nextStatus);

      setSubmissions((prev) =>
        prev.map((s) => (s.postId === postId ? { ...s, status: nextStatus } : s))
      );

      setStatusMessage(
        nextStatus === "hidden"
          ? "Inappropriate submission hidden from public views."
          : "Photo submission restored to published."
      );
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      const error = err as Error;
      setStatusMessage(`Moderation action failed: ${error.message}`);
    } finally {
      setSubmissionActionPending(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="p-3 rounded-lg text-xs font-mono bg-zinc-800 border border-zinc-700 text-amber-300 flex items-center justify-between">
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
            placeholder="Search by student name or email..."
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg pl-9 pr-8 py-2.5 sm:py-2 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-200 text-xs cursor-pointer min-h-[44px] min-w-[44px] justify-center"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls: Role and Ban Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-zinc-400 font-mono">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-2 sm:py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono transition cursor-pointer min-h-[38px] sm:min-h-0"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="banned">Banned Only</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-zinc-400 font-mono">Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-2 sm:py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono transition cursor-pointer min-h-[38px] sm:min-h-0"
            >
              <option value="all">All Roles</option>
              <option value="superadmin">SuperAdmin</option>
              <option value="admin">Admin (Moderator)</option>
              <option value="user">User</option>
            </select>
          </div>

          {/* Account Count Badge */}
          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/80 whitespace-nowrap ml-auto sm:ml-0">
            {loading ? "Counting..." : `${totalCount} ${totalCount === 1 ? "Account" : "Accounts"}`}
          </div>
        </div>
      </div>

      {/* Main User Directory Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/80">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Bingo Submissions</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {loading && users.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="h-3 w-32 bg-zinc-800 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-16 bg-zinc-800 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-20 bg-zinc-800 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3 w-28 bg-zinc-800 rounded"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3 w-20 bg-zinc-800 rounded"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-6 w-24 bg-zinc-800 rounded ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((u) => {
                  const isRootSuperAdmin = u.role === "superadmin";
                  const isAdminRole = u.role === "admin";
                  const isCurrentSessionUser = currentUserId === u.id;
                  const isProtectedAccount = isRootSuperAdmin || isAdminRole;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-zinc-900/40 transition duration-150 ${
                        u.banned ? "bg-rose-950/10" : ""
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                              u.banned
                                ? "bg-rose-950/50 border-rose-800 text-rose-300"
                                : "bg-zinc-800 border-zinc-700 text-zinc-300"
                            }`}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrentSessionUser && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-normal">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account Ban Status */}
                      <td className="py-3.5 px-4">
                        {u.banned ? (
                          <div className="inline-flex flex-col gap-0.5">
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold border bg-rose-500/20 text-rose-300 border-rose-500/40 inline-flex items-center gap-1">
                              <span>⛔ Banned</span>
                            </span>
                            {u.banReason && (
                              <span
                                className="text-[10px] text-zinc-400 truncate max-w-[150px]"
                                title={u.banReason}
                              >
                                {u.banReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold border bg-emerald-500/10 text-emerald-300 border-emerald-500/30 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Active
                          </span>
                        )}
                      </td>

                      {/* Current Role */}
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

                      {/* Bingo Submissions & Inspector Trigger */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-300 font-mono">
                            📷 {u.submissionCount} / 9
                          </span>
                          <button
                            onClick={() => handleInspectSubmissions(u)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 hover:text-amber-200 text-[11px] transition cursor-pointer flex items-center gap-1"
                            title="Inspect user's submitted bingo proofs"
                          >
                            <span>Inspect Proofs</span>
                          </button>
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-zinc-500 font-mono">
                        {u.createdAt}
                      </td>

                      {/* Moderation & Role Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {/* SuperAdmin Role Assignment */}
                          {canManageRoles && !isRootSuperAdmin && (
                            <select
                              value={u.role}
                              disabled={isPending}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                              title="Assign user role"
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                          )}

                          {/* Ban / Unban Actions for Moderators */}
                          {canModerate && (
                            <>
                              {isProtectedAccount ? (
                                <span className="text-[10px] text-zinc-500 italic">
                                  Protected
                                </span>
                              ) : u.banned ? (
                                <button
                                  onClick={() => handleUnban(u)}
                                  disabled={isPending}
                                  className="px-2.5 py-1 rounded border border-emerald-700/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
                                >
                                  Unban
                                </button>
                              ) : (
                                <button
                                  onClick={() => openBanModal(u)}
                                  disabled={isPending || isCurrentSessionUser}
                                  className="px-2.5 py-1 rounded border border-rose-800/80 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
                                >
                                  Ban User
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 space-y-2">
                    <p className="text-sm text-zinc-400">No user accounts found.</p>
                    <p className="text-xs">
                      Try adjusting your search query, role filter, or status filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Lazy Load Controls */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-400">
          <div>
            Showing <span className="text-zinc-200 font-bold">{users.length}</span> of{" "}
            <span className="text-zinc-200 font-bold">{totalCount}</span> registered{" "}
            {totalCount === 1 ? "account" : "accounts"}
          </div>

          <div className="flex items-center gap-3">
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

      {/* ======================================================== */}
      {/* 1. USER BINGO SUBMISSIONS INSPECTOR MODAL               */}
      {/* ======================================================== */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="truncate mr-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-xs uppercase tracking-wider font-bold">
                    Bingo Card Photo Proofs
                  </span>
                  {inspectingUser.banned && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                      BANNED USER
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                  {inspectingUser.name} ({inspectingUser.email})
                </h3>
                <p className="text-xs text-zinc-400 font-mono hidden sm:block">
                  All image submissions are made strictly through the 3x3 Intramurals Bingo Card.
                </p>
              </div>

              <button
                onClick={() => setInspectingUser(null)}
                className="w-10 h-10 sm:w-8 sm:h-8 min-h-[44px] min-w-[44px] rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {loadingSubmissions ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-mono">Loading user photo submissions...</span>
                </div>
              ) : submissions.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto text-xl">
                    📷
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-300">
                    No Bingo Submissions Found
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                    This student has not submitted any photo proofs for their 3x3 Bingo Card challenges yet. When they upload selfies from campus booths, sports events, or rallies, their proofs will appear here for moderator review.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {submissions.map((sub) => {
                    const isHidden = sub.status === "hidden";
                    const isPendingAction = submissionActionPending === sub.postId;

                    return (
                      <div
                        key={sub.postId}
                        className={`rounded-xl border overflow-hidden flex flex-col justify-between transition ${
                          isHidden
                            ? "border-rose-900/60 bg-rose-950/20"
                            : "border-zinc-800 bg-zinc-950"
                        }`}
                      >
                        {/* Image Preview */}
                        <div className="relative aspect-video sm:aspect-square bg-zinc-900 overflow-hidden flex items-center justify-center group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sub.imageUrl}
                            alt={sub.taskTitle || "Bingo Submission"}
                            className={`w-full h-full object-cover transition ${
                              isHidden ? "opacity-30 blur-xs" : "group-hover:scale-105"
                            }`}
                          />

                          {/* Status Tag */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 backdrop-blur text-amber-300 border border-zinc-700">
                              Slot #{sub.slotIndex !== null ? sub.slotIndex + 1 : "?"}
                            </span>
                            {isHidden && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600/90 text-white">
                                HIDDEN (INAPPROPRIATE)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metadata Details */}
                        <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                          <div>
                            <h5 className="text-xs font-bold text-zinc-200">
                              {sub.taskTitle}
                            </h5>
                            {sub.caption && (
                              <p className="text-xs text-zinc-400 mt-1 italic line-clamp-2">
                                &ldquo;{sub.caption}&rdquo;
                              </p>
                            )}
                            <div className="text-[10px] text-zinc-500 font-mono mt-1.5">
                              Uploaded: {sub.createdAt}
                            </div>
                          </div>

                          {/* Moderation Toggle */}
                          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-zinc-500">
                              Status: <span className={isHidden ? "text-rose-400" : "text-emerald-400"}>{sub.status}</span>
                            </span>

                            <button
                              onClick={() => handleModeratePhoto(sub.postId, sub.status)}
                              disabled={isPendingAction}
                              className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition cursor-pointer disabled:opacity-50 ${
                                isHidden
                                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                                  : "bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300"
                              }`}
                            >
                              {isPendingAction
                                ? "Updating..."
                                : isHidden
                                ? "Restore Photo"
                                : "Hide Photo (Inappropriate)"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs font-mono text-zinc-500">
              <span>{submissions.length} proof submissions found</span>
              <button
                onClick={() => setInspectingUser(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BAN USER CONFIRMATION MODAL                           */}
      {/* ======================================================== */}
      {banningUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-red-900/60 rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl animate-fade-in space-y-4">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 bg-red-950/20">
              <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase">
                <span>⚠️ Administrator Action</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                Ban User: {banningUser.name}
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                Target Email: {banningUser.email}
              </p>
            </div>

            {/* Body */}
            <div className="px-4 sm:px-5 space-y-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300 space-y-1">
                <div className="font-bold">Impact of Banning:</div>
                <ul className="list-disc list-inside text-rose-300/90 space-y-0.5">
                  <li>Immediately revokes all active session tokens in <code>neon_auth.session</code></li>
                  <li>Blocks user from submitting bingo tasks or claiming raffle entries</li>
                  <li>Flags their account with the documented reason below</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 font-bold">
                  Ban Reason (Mandatory):
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={3}
                  placeholder="Specify why this account is being banned..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-base sm:text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition font-mono"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end gap-3 text-xs font-mono">
              <button
                type="button"
                onClick={() => setBanningUser(null)}
                className="px-4 py-2.5 min-h-[44px] rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                disabled={isPending || !banReason.trim()}
                className="px-4 py-2.5 min-h-[44px] rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isPending ? "Banning..." : "Confirm & Ban User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
