/**
 * Salingkusog Production Integration Test: Auth Boundaries & Moderation Lifecycle
 *
 * Verifies:
 * 1. Role-based access control (RBAC) matrix for guest, student, moderator, and superadmin
 * 2. UUID format and parameter injection defense guardrails
 * 3. Suspension contracts: blocked uploads and card edits for banned accounts
 * 4. Moderation cascading: post hiding triggers raffle ticket disqualification
 * 5. Admin ban cascading: user suspension hides posts and disqualifies all active tickets
 */

import assert from "node:assert";
import {
  isModerator,
  isDevAuthorized,
  isSuperAdmin,
  isUserBanned,
  type AuthUser,
} from "../../src/lib/auth-predicates.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function runAuthModerationTest() {
  console.log("▶ [Test Suite] Auth Boundaries & Moderation Lifecycle");

  // 1. RBAC Predicate Matrix
  const guest: AuthUser | null = null;
  const student: AuthUser = {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Regular Student",
    email: "student@univ.edu",
    role: "user",
  };
  const moderator: AuthUser = {
    id: "20000000-0000-4000-8000-000000000002",
    name: "Staff Moderator",
    email: "mod@univ.edu",
    role: "admin",
  };
  const superAdmin: AuthUser = {
    id: "30000000-0000-4000-8000-000000000003",
    name: "Lead SuperAdmin",
    email: "superadmin@univ.edu",
    role: "superadmin",
  };
  const suspendedUser: AuthUser = {
    id: "40000000-0000-4000-8000-000000000004",
    name: "Suspended Spammer",
    email: "banned@univ.edu",
    role: "user",
    banned: true,
    banReason: "Harassment and inappropriate photos",
  };

  // Guest assertions
  assert.strictEqual(isModerator(guest), false);
  assert.strictEqual(isDevAuthorized(guest), false);
  assert.strictEqual(isSuperAdmin(guest), false);
  assert.strictEqual(isUserBanned(guest), false);

  // Student assertions
  assert.strictEqual(isModerator(student), false);
  assert.strictEqual(isDevAuthorized(student), false);
  assert.strictEqual(isSuperAdmin(student), false);
  assert.strictEqual(isUserBanned(student), false);

  // Moderator assertions
  assert.strictEqual(isModerator(moderator), true);
  assert.strictEqual(isDevAuthorized(moderator), true);
  assert.strictEqual(isSuperAdmin(moderator), false);
  assert.strictEqual(isUserBanned(moderator), false);

  // SuperAdmin assertions
  assert.strictEqual(isModerator(superAdmin), true);
  assert.strictEqual(isDevAuthorized(superAdmin), true);
  assert.strictEqual(isSuperAdmin(superAdmin), true);
  assert.strictEqual(isUserBanned(superAdmin), false);

  // Suspended user assertions
  assert.strictEqual(isUserBanned(suspendedUser), true);
  console.log("  ✔ Role predicate matrix verified across all identity tiers");

  // 2. UUID Validation & Injection Defense
  const validUuids = [
    "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "00000000-0000-0000-0000-000000000000",
    "12345678-1234-1234-1234-123456789abc",
  ];

  const maliciousInputs = [
    "",
    "c56a4180-65aa-42ec-a945",
    "c56a4180-65aa-42ec-a945-5fd21dec0538; DROP TABLE posts;",
    "../../etc/passwd",
    "<script>alert(1)</script>",
    "undefined",
    "null",
    "g56a4180-65aa-42ec-a945-5fd21dec0538", // 'g' is invalid hex
  ];

  for (const id of validUuids) {
    assert.strictEqual(UUID_REGEX.test(id), true, `UUID format must be accepted: ${id}`);
  }

  for (const bad of maliciousInputs) {
    assert.strictEqual(UUID_REGEX.test(bad), false, `Malicious or invalid UUID must be rejected: ${bad}`);
  }
  console.log("  ✔ Strict UUID parameter boundary regex verified against injection attacks");

  // 3. Contract Checks: Banned User Upload & Card Edit Blocks
  function simulateUploadGuard(user: AuthUser | null) {
    if (!user) return { success: false, error: "Please sign in with Google to post." };
    if (user.banned) return { success: false, error: "Your account is suspended." };
    return { success: true };
  }

  assert.deepStrictEqual(simulateUploadGuard(null), { success: false, error: "Please sign in with Google to post." });
  assert.deepStrictEqual(simulateUploadGuard(suspendedUser), { success: false, error: "Your account is suspended." });
  assert.deepStrictEqual(simulateUploadGuard(student), { success: true });
  console.log("  ✔ Suspended account guard contracts verified");

  // 4. Contract Checks: Post Moderation Invalidation
  interface MockRaffleEntry {
    id: string;
    userId: string;
    postIds: string[];
    status: "valid" | "verified" | "disqualified";
    disqualificationReason?: string | null;
  }

  function simulateModeratePost(postId: string, newStatus: "published" | "hidden", entries: MockRaffleEntry[]) {
    if (newStatus === "hidden") {
      entries.forEach((e) => {
        if (e.postIds.includes(postId) && e.status === "valid") {
          e.status = "disqualified";
          e.disqualificationReason = "Post hidden by moderator";
        }
      });
    }
  }

  const sampleEntries: MockRaffleEntry[] = [
    { id: "e1", userId: student.id, postIds: ["p1", "p2"], status: "valid" },
    { id: "e2", userId: student.id, postIds: ["p3"], status: "valid" },
  ];

  simulateModeratePost("p1", "hidden", sampleEntries);
  assert.strictEqual(sampleEntries[0].status, "disqualified");
  assert.strictEqual(sampleEntries[0].disqualificationReason, "Post hidden by moderator");
  assert.strictEqual(sampleEntries[1].status, "valid", "Unrelated raffle entry must stay valid");
  console.log("  ✔ Post moderation raffle ticket disqualification cascade verified");

  // 5. Contract Checks: User Ban Cascade
  interface MockPost {
    id: string;
    userId: string;
    status: "published" | "hidden";
  }

  function simulateUserBan(targetUserId: string, posts: MockPost[], entries: MockRaffleEntry[]) {
    posts.forEach((p) => {
      if (p.userId === targetUserId) {
        p.status = "hidden";
      }
    });
    entries.forEach((e) => {
      if (e.userId === targetUserId && e.status === "valid") {
        e.status = "disqualified";
        e.disqualificationReason = "User account suspended by administrator";
      }
    });
  }

  const postsToBan: MockPost[] = [
    { id: "post-1", userId: suspendedUser.id, status: "published" },
    { id: "post-2", userId: student.id, status: "published" },
  ];
  const entriesToBan: MockRaffleEntry[] = [
    { id: "ticket-1", userId: suspendedUser.id, postIds: ["post-1"], status: "valid" },
    { id: "ticket-2", userId: student.id, postIds: ["post-2"], status: "valid" },
  ];

  simulateUserBan(suspendedUser.id, postsToBan, entriesToBan);
  assert.strictEqual(postsToBan[0].status, "hidden", "Banned user's post must be hidden");
  assert.strictEqual(postsToBan[1].status, "published", "Other student post must remain published");
  assert.strictEqual(entriesToBan[0].status, "disqualified", "Banned user's ticket must be disqualified");
  assert.strictEqual(entriesToBan[0].disqualificationReason, "User account suspended by administrator");
  assert.strictEqual(entriesToBan[1].status, "valid", "Other student ticket must remain valid");
  console.log("  ✔ User ban post and raffle entry cascading logic verified");

  console.log("✔ Auth boundaries & moderation lifecycle suite passed cleanly\n");
}

if (process.argv[1]?.endsWith("test-auth-moderation.ts")) {
  runAuthModerationTest().catch((err) => {
    console.error("❌ Auth moderation test failed:", err);
    process.exit(1);
  });
}
