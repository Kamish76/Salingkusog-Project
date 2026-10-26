import assert from "node:assert/strict";
import {
  runAllHealthProbes,
  probeDatabase,
  probeStorage,
  probeAuth,
  probeModeration,
} from "../../src/lib/health-probes.ts";
import { clearDiagnosticLogs, getRecentDiagnosticLogs } from "../../src/lib/server-log-buffer.ts";

export async function runHealthProbesTest() {
  console.log("▶ [Test Suite] Isolated API Health Probes");
  clearDiagnosticLogs();

  // 1. Test probeDatabase with a mock SQL client that fails
  const mockFailingSql = async () => {
    throw new Error("connection timeout: ETIMEDOUT");
  };
  const dbResult = await probeDatabase(mockFailingSql as any);
  assert.equal(dbResult.status, "down");
  assert.ok(dbResult.message.includes("ETIMEDOUT"));
  assert.ok(typeof dbResult.latencyMs === "number");

  // 2. Test probeDatabase with healthy SQL client
  const mockHealthySql = async () => [{ health: 1 }];
  const dbHealthyResult = await probeDatabase(mockHealthySql as any);
  assert.equal(dbHealthyResult.status, "healthy");
  assert.equal(dbHealthyResult.message, "Database connected");

  // 3. Test probeAuth with simulated fetch
  const mockFetchOk: typeof fetch = async () => new Response("ok", { status: 200 });
  const authHealthyResult = await probeAuth("https://auth.example.com", mockFetchOk);
  assert.equal(authHealthyResult.status, "healthy");

  const mockFetchDown: typeof fetch = async () => {
    throw new Error("ENOTFOUND auth.example.com");
  };
  const authDownResult = await probeAuth("https://auth.example.com", mockFetchDown);
  assert.equal(authDownResult.status, "down");
  assert.ok(authDownResult.message.includes("ENOTFOUND"));

  // 4. Test probeModeration unconfigured & configured
  const modUnconfigured = await probeModeration("", mockFetchOk);
  assert.equal(modUnconfigured.status, "unconfigured");

  const modHealthy = await probeModeration("sk-mock-key", mockFetchOk);
  assert.equal(modHealthy.status, "healthy");

  // 5. Test probeStorage with simulated client
  const mockS3Client = {
    send: async () => ({ Contents: [] }),
  };
  const storageHealthy = await probeStorage(mockS3Client as any);
  assert.equal(storageHealthy.status, "healthy");

  const mockFailingS3Client = {
    send: async () => {
      throw new Error("AccessDenied: Invalid credentials");
    },
  };
  const storageDown = await probeStorage(mockFailingS3Client as any);
  assert.equal(storageDown.status, "down");
  assert.ok(storageDown.message.includes("AccessDenied"));

  // 6. Test aggregate runAllHealthProbes resilience
  const summary = await runAllHealthProbes();
  assert.ok(summary.timestamp);
  assert.ok(summary.subsystems.database);
  assert.ok(summary.subsystems.storage);
  assert.ok(summary.subsystems.auth);
  assert.ok(summary.subsystems.moderation);
  assert.ok(Array.isArray(summary.recentLogs));

  // 7. Test Server-Side Cache and forceFresh bypass
  const s1 = await runAllHealthProbes(true);
  await new Promise((r) => setTimeout(r, 15));
  const s2 = await runAllHealthProbes(false);
  assert.equal(s1.timestamp, s2.timestamp, "Consecutive calls within 10s should return cached summary");
  const s3 = await runAllHealthProbes(true);
  assert.notEqual(s1.timestamp, s3.timestamp, "forceFresh=true should bypass cache and return fresh summary");

  console.log("  ✓ All health probe isolation and resilience tests passed\n");
}

if (process.argv[1]?.endsWith("test-health-probes.ts")) {
  runHealthProbesTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
