import assert from "node:assert/strict";
import {
  pushDiagnosticLog,
  getRecentDiagnosticLogs,
  clearDiagnosticLogs,
  type DiagnosticLogEntry,
} from "../../src/lib/server-log-buffer.ts";

export async function runServerLogBufferTest() {
  console.log("▶ [Test Suite] In-Memory Server Log Buffer");

// 1. Clear buffer
clearDiagnosticLogs();
assert.equal(getRecentDiagnosticLogs().length, 0, "Buffer should initially be empty after clear");

// 2. Push entries and verify structure
const entry1 = pushDiagnosticLog({
  subsystem: "database",
  level: "error",
  message: "Test DB connection timeout",
  details: { code: "ETIMEDOUT" },
});

assert.ok(entry1.id, "Entry should have generated id");
assert.ok(entry1.timestamp, "Entry should have ISO timestamp");
assert.equal(entry1.subsystem, "database");
assert.equal(entry1.level, "error");
assert.equal(entry1.message, "Test DB connection timeout");

const logsAfter1 = getRecentDiagnosticLogs();
assert.equal(logsAfter1.length, 1);
assert.equal(logsAfter1[0].id, entry1.id);

// 3. FIFO eviction test (max 100 entries)
clearDiagnosticLogs();
for (let i = 0; i < 115; i++) {
  pushDiagnosticLog({
    subsystem: i % 2 === 0 ? "storage" : "moderation",
    level: "warn",
    message: `Message ${i}`,
  });
}

const cappedLogs = getRecentDiagnosticLogs(150);
assert.equal(cappedLogs.length, 100, "Buffer should cap at 100 entries");
assert.equal(cappedLogs[0].message, "Message 114", "Newest entry should be first");
assert.equal(cappedLogs[99].message, "Message 15", "Oldest kept entry should be Message 15");

// 4. Subsystem filter test
  const storageLogs = getRecentDiagnosticLogs(100, "storage");
  assert.ok(storageLogs.length > 0, "Should have storage logs");
  assert.ok(
    storageLogs.every((l) => l.subsystem === "storage"),
    "All filtered logs must belong to storage subsystem"
  );

  console.log("  ✓ Server log buffer stores, limits to 100, and filters properly\n");
}

if (process.argv[1]?.endsWith("test-server-log-buffer.ts")) {
  runServerLogBufferTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
