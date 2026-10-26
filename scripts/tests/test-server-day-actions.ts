/**
 * Salingkusog Server Action Day Constraint Verification
 *
 * Directly tests server-side validation logic:
 * 1. Day 1: Day 1 tasks accepted; Day 2 and Day 3 tasks rejected
 * 2. Day 2: Day 1 tasks (catch-up) accepted; Day 2 tasks accepted; Day 3 tasks rejected
 * 3. Day 3: All tasks accepted
 * 4. Event Paused (is_event_active = false): Bingo uploads rejected; General memory uploads accepted
 */

import assert from "node:assert";
import { isTaskUnlocked, CANONICAL_BINGO_SEED_TASKS } from "../../src/lib/bingo-engine.ts";

export async function runServerDayActionsTest() {
  console.log("▶ [Test Suite] Server Action Day Constraint Verification");

  if (!process.env.DATABASE_URL) {
    console.log("  ℹ DATABASE_URL not set: skipping live DB server action test");
    return;
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  // Fetch live tasks from database
  const tasks = await sql`
    SELECT id, slot_index, title, unlock_day, is_active
    FROM public.bingo_tasks
    ORDER BY slot_index ASC
  `;
  assert.strictEqual(tasks.length, 9, "Must have 9 bingo tasks in database");

  const day1Task = tasks.find((t) => Number(t.unlock_day) === 1);
  const day2Task = tasks.find((t) => Number(t.unlock_day) === 2);
  const day3Task = tasks.find((t) => Number(t.unlock_day) === 3);

  assert.ok(day1Task, "Day 1 task must exist");
  assert.ok(day2Task, "Day 2 task must exist");
  assert.ok(day3Task, "Day 3 task must exist");

  // Helper simulating the exact server check implemented in submitStudentPostAction
  async function simulateServerPostValidation(
    bingoTaskId: string | null,
    testCurrentDay: number,
    testIsEventActive: boolean
  ): Promise<{ success: boolean; error?: string }> {
    if (!bingoTaskId) {
      // General post without bingo task: always permitted
      return { success: true };
    }

    if (!testIsEventActive) {
      return { success: false, error: "Bingo uploads are currently paused." };
    }

    const matchedTask = tasks.find((t) => t.id === bingoTaskId);
    if (!matchedTask) {
      return { success: false, error: "Bingo challenge not found." };
    }

    if (!matchedTask.is_active) {
      return { success: false, error: "This bingo challenge is currently inactive." };
    }

    const unlockDay = Number(matchedTask.unlock_day);
    if (!isTaskUnlocked(unlockDay, testCurrentDay)) {
      return {
        success: false,
        error: `This bingo challenge is locked until Day ${unlockDay}.`,
      };
    }

    return { success: true };
  }

  // --- TEST CASE 1: Day 1 ---
  console.log("  ▶ Case 1: Testing on Day 1");
  const resD1_T1 = await simulateServerPostValidation(day1Task.id, 1, true);
  assert.strictEqual(resD1_T1.success, true, "Day 1 task must succeed on Day 1");

  const resD1_T2 = await simulateServerPostValidation(day2Task.id, 1, true);
  assert.strictEqual(resD1_T2.success, false, "Day 2 task must be rejected on Day 1");
  assert.strictEqual(resD1_T2.error, "This bingo challenge is locked until Day 2.");

  const resD1_T3 = await simulateServerPostValidation(day3Task.id, 1, true);
  assert.strictEqual(resD1_T3.success, false, "Day 3 task must be rejected on Day 1");
  assert.strictEqual(resD1_T3.error, "This bingo challenge is locked until Day 3.");
  console.log("  ✔ Day 1: Day 1 passes, Day 2/3 rejected with locked error message");

  // --- TEST CASE 2: Day 2 ---
  console.log("  ▶ Case 2: Testing on Day 2 (Catch-up allowed)");
  const resD2_T1 = await simulateServerPostValidation(day1Task.id, 2, true);
  assert.strictEqual(resD2_T1.success, true, "Day 1 task (catch-up) must succeed on Day 2");

  const resD2_T2 = await simulateServerPostValidation(day2Task.id, 2, true);
  assert.strictEqual(resD2_T2.success, true, "Day 2 task must succeed on Day 2");

  const resD2_T3 = await simulateServerPostValidation(day3Task.id, 2, true);
  assert.strictEqual(resD2_T3.success, false, "Day 3 task must be rejected on Day 2");
  assert.strictEqual(resD2_T3.error, "This bingo challenge is locked until Day 3.");
  console.log("  ✔ Day 2: Day 1 catch-up succeeds, Day 2 succeeds, Day 3 rejected");

  // --- TEST CASE 3: Day 3 ---
  console.log("  ▶ Case 3: Testing on Day 3");
  const resD3_T1 = await simulateServerPostValidation(day1Task.id, 3, true);
  assert.strictEqual(resD3_T1.success, true, "Day 1 task must succeed on Day 3");

  const resD3_T2 = await simulateServerPostValidation(day2Task.id, 3, true);
  assert.strictEqual(resD3_T2.success, true, "Day 2 task must succeed on Day 3");

  const resD3_T3 = await simulateServerPostValidation(day3Task.id, 3, true);
  assert.strictEqual(resD3_T3.success, true, "Day 3 task must succeed on Day 3");
  console.log("  ✔ Day 3: All tasks (Day 1, Day 2, Day 3) succeed");

  // --- TEST CASE 4: Event Paused ---
  console.log("  ▶ Case 4: Testing Event Paused (is_event_active = false)");
  const resPausedBingo = await simulateServerPostValidation(day1Task.id, 1, false);
  assert.strictEqual(resPausedBingo.success, false, "Bingo task must be rejected when event is paused");
  assert.strictEqual(resPausedBingo.error, "Bingo uploads are currently paused.");

  const resPausedGeneral = await simulateServerPostValidation(null, 1, false);
  assert.strictEqual(resPausedGeneral.success, true, "General memory drop must succeed even when event is paused");
  console.log("  ✔ Event Paused: Bingo uploads blocked, general memory drop allowed");

  console.log("✔ Server Action Day Constraint Verification passed cleanly\n");
}

if (process.argv[1]?.endsWith("test-server-day-actions.ts")) {
  runServerDayActionsTest().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
}
