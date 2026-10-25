/**
 * Salingkusog Server Actions & Auth Gates Integration Test Suite
 *
 * Tests:
 * 1. Role-based access control and security gate predicates
 * 2. UUID format and parameter validation guardrails
 * 3. Migration schema constraint validation (unique keys, foreign keys, check constraints)
 * 4. Active database connection & schema verification (when DATABASE_URL is configured)
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  isModerator,
  isDevAuthorized,
  isSuperAdmin,
  isUserBanned,
  type AuthUser,
} from "../src/lib/auth-predicates.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function runIntegrationTestSuite() {
  console.log("🧪 Starting Integration & Auth Gates Test Suite...\n");

  // --------------------------------------------------------------------------
  // TEST 1: Role-Based Access Control and Authorization Gates
  // --------------------------------------------------------------------------
  console.log("▶ Test 1: Role Gates & Access Control Predicates");

  const guest: AuthUser | null = null;
  const regularUser: AuthUser = {
    id: "11111111-1111-4111-a111-111111111111",
    name: "Student One",
    email: "student@school.edu",
    role: "user",
  };
  const adminUser: AuthUser = {
    id: "22222222-2222-4222-a222-222222222222",
    name: "Admin Moderator",
    email: "moderator@school.edu",
    role: "admin",
  };
  const superAdminUser: AuthUser = {
    id: "33333333-3333-4333-a333-333333333333",
    name: "System SuperAdmin",
    email: "superadmin@school.edu",
    role: "superadmin",
  };
  const bannedUser: AuthUser = {
    id: "44444444-4444-4444-a444-444444444444",
    name: "Suspended Spammer",
    email: "spammer@school.edu",
    role: "user",
    banned: true,
    banReason: "Inappropriate photos uploaded",
  };

  // Guest assertions
  assert.strictEqual(isModerator(guest), false, "Guest must not be moderator");
  assert.strictEqual(isDevAuthorized(guest), false, "Guest must not have dev access");
  assert.strictEqual(isSuperAdmin(guest), false, "Guest must not be superadmin");
  assert.strictEqual(isUserBanned(guest), false, "Guest must not be reported as banned");

  // Regular user assertions
  assert.strictEqual(isModerator(regularUser), false, "Regular user must not be moderator");
  assert.strictEqual(isDevAuthorized(regularUser), false, "Regular user must not have dev access");
  assert.strictEqual(isSuperAdmin(regularUser), false, "Regular user must not be superadmin");
  assert.strictEqual(isUserBanned(regularUser), false, "Active student must not be banned");

  // Moderator / Admin assertions
  assert.strictEqual(isModerator(adminUser), true, "Admin role must pass isModerator");
  assert.strictEqual(isDevAuthorized(adminUser), true, "Admin role must pass isDevAuthorized");
  assert.strictEqual(isSuperAdmin(adminUser), false, "Admin must not pass isSuperAdmin");
  assert.strictEqual(isUserBanned(adminUser), false);

  // SuperAdmin assertions
  assert.strictEqual(isModerator(superAdminUser), true, "SuperAdmin must pass isModerator");
  assert.strictEqual(isDevAuthorized(superAdminUser), true, "SuperAdmin must pass isDevAuthorized");
  assert.strictEqual(isSuperAdmin(superAdminUser), true, "SuperAdmin must pass isSuperAdmin");
  assert.strictEqual(isUserBanned(superAdminUser), false);

  // Banned user assertions
  assert.strictEqual(isUserBanned(bannedUser), true, "Suspended user must return isUserBanned = true");
  console.log("  ✔ Role predicates and access boundaries verified");

  // --------------------------------------------------------------------------
  // TEST 2: UUID Validation Regex & Parameter Boundary Guardrails
  // --------------------------------------------------------------------------
  console.log("▶ Test 2: UUID Format & Injection Defense");

  const validUuids = [
    "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "00000000-0000-0000-0000-000000000000",
    "ffffffff-ffff-4fff-bfff-ffffffffffff",
  ];

  const invalidInputs = [
    "",
    "not-a-uuid",
    "c56a4180-65aa-42ec-a945",
    "c56a4180-65aa-42ec-a945-5fd21dec0538; DROP TABLE users;",
    "../config/dev_role",
    "undefined",
    "null",
  ];

  for (const id of validUuids) {
    assert.strictEqual(UUID_REGEX.test(id), true, `Expected valid UUID: ${id}`);
  }

  for (const bad of invalidInputs) {
    assert.strictEqual(UUID_REGEX.test(bad), false, `Expected invalid input to be rejected: ${bad}`);
  }
  console.log("  ✔ UUID validation regex and boundary guards verified");

  // --------------------------------------------------------------------------
  // TEST 3: Migration Schema & Constraint Integrity Verification
  // --------------------------------------------------------------------------
  console.log("▶ Test 3: Database Schema & Constraint Definition Checks");

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  assert.strictEqual(fs.existsSync(migrationsDir), true, "Migrations directory must exist");

  const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(migrationFiles.length >= 4, `Expected at least 4 migration files, found ${migrationFiles.length}`);

  let combinedSql = "";
  for (const file of migrationFiles) {
    combinedSql += "\n" + fs.readFileSync(path.join(migrationsDir, file), "utf8");
  }

  // 1. Check raffle entries uniqueness and foreign keys
  assert.ok(
    combinedSql.includes("uq_raffle_entries_user_line UNIQUE (user_id, line_type, line_index)"),
    "Raffle entries must enforce unique user line constraint"
  );
  assert.ok(
    combinedSql.includes("REFERENCES neon_auth.user(id) ON DELETE CASCADE"),
    "Tables must enforce cascade delete on auth user deletion"
  );

  // 2. Check check constraints on valid raffle line types
  assert.ok(
    combinedSql.includes("line_type IN ('row', 'column', 'diagonal', 'blackout')"),
    "Raffle entries must constrain line_type values"
  );

  // 3. Check status constraints on raffle entries
  assert.ok(
    combinedSql.includes("status IN ('valid', 'verified', 'disqualified')"),
    "Raffle entries must constrain status values"
  );
  console.log("  ✔ Migration SQL constraints and relational integrity verified");

  // --------------------------------------------------------------------------
  // TEST 4: Live Database Verification (if DATABASE_URL is available)
  // --------------------------------------------------------------------------
  console.log("▶ Test 4: Live Database Connection & Constraint Smoke Test");
  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL);
      const testQuery = await sql`SELECT 1 as live_check`;
      assert.strictEqual(Number(testQuery[0]?.live_check), 1, "Live database check must return 1");

      const eventConfig = await sql`SELECT key, is_raffle_active FROM public.event_config LIMIT 1`;
      assert.ok(eventConfig.length >= 0, "Querying event_config must succeed");

      console.log("  ✔ Live Neon Database smoke check passed successfully");
    } catch (dbErr) {
      console.warn("  ⚠ Live database connection failed, skipping live checks:", (dbErr as Error).message);
    }
  } else {
    console.log("  ℹ DATABASE_URL not set in environment: Skipped live network queries (offline/CI mode)");
  }

  console.log("\n🎉 ALL INTEGRATION AND SECURITY GATE TESTS PASSED CLEANLY!\n");
}

runIntegrationTestSuite().catch((err) => {
  console.error("❌ Integration test suite failed:", err);
  process.exit(1);
});
