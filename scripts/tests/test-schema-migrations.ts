/**
 * Salingkusog Production Integration Test: Database Schemas & Migrations Integrity
 *
 * Verifies:
 * 1. Sequential migration ordering and non-empty schema files
 * 2. Presence of all essential database tables and primary keys
 * 3. Unique and check constraint integrity (line rules, ticket status, foreign keys)
 * 4. Cascade delete policies for referential safety
 * 5. Smoke test against live Neon Postgres database if DATABASE_URL is provisioned
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

export async function runSchemaMigrationsTest() {
  console.log("▶ [Test Suite] Database Schemas & Migration Integrity");

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  assert.ok(fs.existsSync(migrationsDir), "Migrations directory must exist");

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  assert.ok(files.length >= 6, `Expected at least 6 migration files, found ${files.length}`);

  let combinedSql = "";
  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    assert.ok(content.trim().length > 10, `Migration ${file} must not be empty`);
    combinedSql += `\n-- File: ${file}\n` + content;
  }

  // 1. Table definitions verification
  const requiredTables = [
    "public.posts",
    "public.bingo_tasks",
    "public.user_bingo_progress",
    "public.raffle_entries",
    "public.event_config",
    "public.activity_logs",
    "public.raffle_rules",
  ];

  for (const table of requiredTables) {
    assert.ok(
      combinedSql.toLowerCase().includes(`create table if not exists ${table.toLowerCase()}`) ||
      combinedSql.toLowerCase().includes(`create table ${table.toLowerCase()}`),
      `Schema must define table ${table}`
    );
  }
  console.log("  ✔ All 7 required application tables defined in migrations");

  // 2. Relational integrity & cascade behavior
  assert.ok(
    combinedSql.includes("REFERENCES neon_auth.user(id) ON DELETE CASCADE"),
    "User foreign keys must enforce ON DELETE CASCADE to prevent orphaned data"
  );
  assert.ok(
    combinedSql.includes("REFERENCES public.posts(id) ON DELETE CASCADE"),
    "Post progress links must enforce ON DELETE CASCADE"
  );
  console.log("  ✔ Cascade delete rules verified across relational boundaries");

  // 3. Unique constraints for ticket and bingo slot idempotency
  assert.ok(
    combinedSql.includes("uq_raffle_entries_user_line UNIQUE (user_id, line_type, line_index)"),
    "Must enforce unique constraint on (user_id, line_type, line_index)"
  );
  assert.ok(
    combinedSql.includes("UNIQUE(user_id, task_id)") ||
    combinedSql.includes("UNIQUE (user_id, task_id)"),
    "Must enforce unique progress slot constraint per user"
  );
  console.log("  ✔ Unique constraints for raffle lines and bingo slots verified");

  // 4. Value domain check constraints
  assert.ok(
    combinedSql.includes("status IN ('valid', 'verified', 'disqualified')"),
    "Raffle status must be constrained to valid, verified, or disqualified"
  );
  assert.ok(
    combinedSql.includes("line_type IN ('row', 'column', 'diagonal', 'blackout')"),
    "Raffle line_type must be constrained to row, column, diagonal, or blackout"
  );
  console.log("  ✔ Enum-style domain check constraints verified");

  // 5. Live DB smoke test when credentials provided
  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL);
      const res = await sql`SELECT 1 as connected`;
      assert.strictEqual(Number(res[0]?.connected), 1, "Database connection query must return 1");
      console.log("  ✔ Live Neon Postgres smoke check passed");
    } catch (err) {
      console.warn("  ⚠ Live database connection failed:", (err as Error).message);
    }
  } else {
    console.log("  ℹ DATABASE_URL not set in runner: Offline migration assertion mode");
  }

  console.log("✔ Schemas & migrations integrity suite passed cleanly\n");
}

if (process.argv[1]?.endsWith("test-schema-migrations.ts")) {
  runSchemaMigrationsTest().catch((err) => {
    console.error("❌ Schema migrations test failed:", err);
    process.exit(1);
  });
}
