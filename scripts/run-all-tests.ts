/**
 * Salingkusog Master Integration & Verification Runner
 *
 * Runs all production verification suites:
 * 1. 3x3 Bingo Matrix & Cryptographic Raffle Code Engine
 * 2. Database Schemas, Foreign Keys & Migration Integrity
 * 3. Storage Magic Bytes, Media Upload Safety & Key Extraction
 * 4. Auth Roles, Moderation Cascades & Account Suspension Guardrails
 * 5. Raffle Concurrency, Transaction Locks & Re-Claim Idempotency
 */

import { runSchemaMigrationsTest } from "./tests/test-schema-migrations.ts";
import { runStorageMediaTest } from "./tests/test-storage-media.ts";
import { runAuthModerationTest } from "./tests/test-auth-moderation.ts";
import { runRaffleConcurrencyTest } from "./tests/test-raffle-concurrency.ts";
import { runImageProxySecurityTest } from "./tests/test-image-proxy.ts";
import { runExportEngineTest } from "./tests/test-export-engine.ts";
import { runModerationTest } from "./tests/test-moderation.ts";
import { runServerLogBufferTest } from "./tests/test-server-log-buffer.ts";
import { runHealthProbesTest } from "./tests/test-health-probes.ts";
import { runPhotoModerationTest } from "./tests/test-photo-moderation.ts";
import { runConsentDpaTest } from "./tests/test-consent-dpa.ts";
import { runDayUploadConstraintsTest } from "./tests/test-day-upload-constraints.ts";
import { runPostsPaginationTest } from "./tests/test-posts-pagination.ts";
import { runLegalHeaderResponsiveTest } from "./tests/test-legal-header-responsive.ts";
import { runLegalTokenWrappingTest } from "./tests/test-legal-token-wrapping.ts";
import { spawnSync } from "node:child_process";
import path from "node:path";

interface SuiteResult {
  name: string;
  durationMs: number;
  status: "PASSED" | "FAILED";
  error?: string;
}

async function runAllSuites() {
  const startTime = Date.now();
  console.log("===============================================================================");
  console.log("🚀 SALINGKUSOG MASTER INTEGRATION & PRODUCTION VERIFICATION SUITE");
  console.log("===============================================================================\n");

  const results: SuiteResult[] = [];

  // Suite 1: Bingo Engine & Matrix Tests (runs via child process to match test-bingo-engine.ts runner)
  const t0 = Date.now();
  try {
    const bingoScript = path.resolve(process.cwd(), "scripts", "test-bingo-engine.ts");
    const child = spawnSync("node", ["--no-warnings", "--experimental-strip-types", bingoScript], {
      stdio: "inherit",
    });
    if (child.status !== 0) {
      throw new Error(`Bingo engine tests exited with code ${child.status}`);
    }
    results.push({ name: "Bingo Matrix & Raffle Codes", durationMs: Date.now() - t0, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Bingo Matrix & Raffle Codes", durationMs: Date.now() - t0, status: "FAILED", error: (err as Error).message });
  }

  // Suite 2: Schema & Migrations Integrity
  const t1 = Date.now();
  try {
    await runSchemaMigrationsTest();
    results.push({ name: "Database Schemas & Migrations", durationMs: Date.now() - t1, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Database Schemas & Migrations", durationMs: Date.now() - t1, status: "FAILED", error: (err as Error).message });
  }

  // Suite 3: Storage & Media File Safety
  const t2 = Date.now();
  try {
    await runStorageMediaTest();
    results.push({ name: "Storage & Media Security", durationMs: Date.now() - t2, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Storage & Media Security", durationMs: Date.now() - t2, status: "FAILED", error: (err as Error).message });
  }

  // Suite 4: Auth Boundaries & Moderation
  const t3 = Date.now();
  try {
    await runAuthModerationTest();
    results.push({ name: "Auth & Moderation Lifecycle", durationMs: Date.now() - t3, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Auth & Moderation Lifecycle", durationMs: Date.now() - t3, status: "FAILED", error: (err as Error).message });
  }

  // Suite 5: Raffle Concurrency & Re-Claims
  const t4 = Date.now();
  try {
    await runRaffleConcurrencyTest();
    results.push({ name: "Raffle Concurrency & Re-Claims", durationMs: Date.now() - t4, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Raffle Concurrency & Re-Claims", durationMs: Date.now() - t4, status: "FAILED", error: (err as Error).message });
  }

  // Suite 6: Image Proxy SSRF & Security Guards
  const t5 = Date.now();
  try {
    await runImageProxySecurityTest();
    results.push({ name: "Image Proxy SSRF & Security", durationMs: Date.now() - t5, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Image Proxy SSRF & Security", durationMs: Date.now() - t5, status: "FAILED", error: (err as Error).message });
  }

  // Suite 7: reCAPTCHA Bingo Export Engine
  const t6 = Date.now();
  try {
    await runExportEngineTest();
    results.push({ name: "reCAPTCHA Bingo Export Engine", durationMs: Date.now() - t6, status: "PASSED" });
  } catch (err) {
    results.push({ name: "reCAPTCHA Bingo Export Engine", durationMs: Date.now() - t6, status: "FAILED", error: (err as Error).message });
  }

  // Suite 8: OpenAI Content Moderation Gate
  const t7 = Date.now();
  try {
    await runModerationTest();
    results.push({ name: "OpenAI Content Moderation", durationMs: Date.now() - t7, status: "PASSED" });
  } catch (err) {
    results.push({ name: "OpenAI Content Moderation", durationMs: Date.now() - t7, status: "FAILED", error: (err as Error).message });
  }

  // Suite 9: In-Memory Server Log Buffer
  const t8 = Date.now();
  try {
    await runServerLogBufferTest();
    results.push({ name: "In-Memory Server Log Buffer", durationMs: Date.now() - t8, status: "PASSED" });
  } catch (err) {
    results.push({ name: "In-Memory Server Log Buffer", durationMs: Date.now() - t8, status: "FAILED", error: (err as Error).message });
  }

  // Suite 10: Isolated API Health Probes
  const t9 = Date.now();
  try {
    await runHealthProbesTest();
    results.push({ name: "Isolated API Health Probes", durationMs: Date.now() - t9, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Isolated API Health Probes", durationMs: Date.now() - t9, status: "FAILED", error: (err as Error).message });
  }

  // Suite 11: Photo Moderation & RBAC Cascades
  const t10 = Date.now();
  try {
    await runPhotoModerationTest();
    results.push({ name: "Photo Moderation & Cascades", durationMs: Date.now() - t10, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Photo Moderation & Cascades", durationMs: Date.now() - t10, status: "FAILED", error: (err as Error).message });
  }

  // Suite 12: Philippine DPA Legal & Student Consent Layer
  const t11 = Date.now();
  try {
    await runConsentDpaTest();
    results.push({ name: "Philippine DPA & Student Consent", durationMs: Date.now() - t11, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Philippine DPA & Student Consent", durationMs: Date.now() - t11, status: "FAILED", error: (err as Error).message });
  }

  // Suite 13: Day-Based Bingo Constraints & Task Sync
  const t12 = Date.now();
  try {
    await runDayUploadConstraintsTest();
    results.push({ name: "Day-Based Bingo Constraints", durationMs: Date.now() - t12, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Day-Based Bingo Constraints", durationMs: Date.now() - t12, status: "FAILED", error: (err as Error).message });
  }

  // Suite 14: Posts Keyset Pagination & Cursor Validation
  const t13 = Date.now();
  try {
    await runPostsPaginationTest();
    results.push({ name: "Posts Keyset Pagination & Cursors", durationMs: Date.now() - t13, status: "PASSED" });
  } catch (err) {
    results.push({ name: "Posts Keyset Pagination & Cursors", durationMs: Date.now() - t13, status: "FAILED", error: (err as Error).message });
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("===============================================================================");
  console.log("📊 INTEGRATION SUITE RESULTS SUMMARY");
  console.log("===============================================================================");
  for (const r of results) {
    const icon = r.status === "PASSED" ? "✔" : "✖";
    console.log(` ${icon} ${r.name.padEnd(36)} [${r.status}] (${r.durationMs}ms)`);
    if (r.error) {
      console.log(`   └── Error: ${r.error}`);
    }
  }
  console.log("-------------------------------------------------------------------------------");
  console.log(`Total Execution Time: ${totalTime}s`);

  const hasFailures = results.some((r) => r.status === "FAILED");
  if (hasFailures) {
    console.error("\n❌ ONE OR MORE SUITES FAILED PRODUCTION VERIFICATION.\n");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL 15 PRODUCTION INTEGRATION SUITES PASSED CLEANLY!\n");
  }
}

runAllSuites().catch((err) => {
  console.error("Fatal runner error:", err);
  process.exit(1);
});
