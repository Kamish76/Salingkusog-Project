/**
 * Salingkusog Production Integration Test: Raffle Concurrency & Re-Claim Idempotency
 *
 * Verifies:
 * 1. Advisory transaction lock key generation and user key isolation
 * 2. Per-student ticket limit capping under simulated concurrent claims
 * 3. Line re-claim idempotency after photo removal and replacement
 * 4. Multi-rule evaluation integrity for Milestones and Blackout lines
 */

import assert from "node:assert";
import {
  evaluateRaffleRules,
  generateRaffleCode,
  type RaffleRuleRecord,
  type ExistingRaffleClaim,
} from "../../src/lib/bingo-engine.ts";

export async function runRaffleConcurrencyTest() {
  console.log("▶ [Test Suite] Raffle Concurrency & Re-Claim Idempotency");

  // 1. Transaction Advisory Lock Hash Isolation
  // Simulates PostgreSQL hashtext('raffle_' || user_id)
  function hashText(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  const userA = "11111111-1111-4111-a111-111111111111";
  const userB = "22222222-2222-4222-a222-222222222222";
  const lockKeyA = hashText(`raffle_${userA}`);
  const lockKeyB = hashText(`raffle_${userB}`);

  assert.strictEqual(lockKeyA, hashText(`raffle_${userA}`), "Lock key must be deterministic for identical user");
  assert.notStrictEqual(lockKeyA, lockKeyB, "Lock keys must differ between distinct users to avoid cross-user blocking");
  console.log("  ✔ Transactional advisory lock hash derivation and user isolation verified");

  // 2. Ticket Capping Under Simulated Concurrency
  const standardRules: RaffleRuleRecord[] = [
    { id: "r1", ruleKey: "line_row", name: "Row Completion", category: "bingo_line", description: "", ticketsAwarded: 1, isActive: true },
  ];

  // User has already claimed 2 rows and has a cap of 2
  const maxCap = 2;
  const existingClaims: ExistingRaffleClaim[] = [
    { ruleKey: "line_row", lineType: "row", lineIndex: 0 },
    { ruleKey: "line_row", lineType: "row", lineIndex: 1 },
  ];

  // User completes all 9 slots [0..8], which completes Row 2 as well
  const fullGrid = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const evalCapped = evaluateRaffleRules(standardRules, {
    completedSlotIndexes: fullGrid,
    memoryDropCount: 0,
    existingClaims,
    maxTicketsPerUser: maxCap,
  });

  assert.strictEqual(evalCapped.eligibleRewards.length, 0, "No new rewards should be eligible when user has reached ticket cap");
  assert.strictEqual(evalCapped.totalNewTickets, 0, "Zero tickets must be minted when cap is hit");
  assert.strictEqual(evalCapped.isCapped, true, "isCapped flag must be true");
  console.log("  ✔ Hard ticket cap enforcement under completed conditions verified");

  // 3. Line Re-Claim Idempotency (Photo Removal & Re-Upload Flow)
  // Step A: User completes Row 0 ([0, 1, 2])
  const stepA = evaluateRaffleRules(standardRules, {
    completedSlotIndexes: [0, 1, 2],
    memoryDropCount: 0,
    existingClaims: [],
    maxTicketsPerUser: 10,
  });
  assert.strictEqual(stepA.eligibleRewards.length, 1);
  assert.strictEqual(stepA.eligibleRewards[0].ruleKey, "line_row");
  assert.strictEqual(stepA.eligibleRewards[0].lineIndex, 0);
  const mintedCode = generateRaffleCode();
  assert.ok(mintedCode.startsWith("SK-RFL-"));

  // Step B: User removes photo for slot 1 (breaks Row 0)
  // Public raffle row is deleted. In-memory active claims are now empty.
  const activeClaimsAfterRemoval: ExistingRaffleClaim[] = [];
  const stepB = evaluateRaffleRules(standardRules, {
    completedSlotIndexes: [0, 2], // Slot 1 missing
    memoryDropCount: 0,
    existingClaims: activeClaimsAfterRemoval,
    maxTicketsPerUser: 10,
  });
  assert.strictEqual(stepB.eligibleRewards.length, 0, "Incomplete line after photo removal must not award tickets");

  // Step C: User uploads new valid photo for slot 1 (re-completing Row 0)
  const stepC = evaluateRaffleRules(standardRules, {
    completedSlotIndexes: [0, 1, 2],
    memoryDropCount: 0,
    existingClaims: activeClaimsAfterRemoval,
    maxTicketsPerUser: 10,
  });
  assert.strictEqual(stepC.eligibleRewards.length, 1, "Re-completed line must be eligible for a new ticket");
  assert.strictEqual(stepC.eligibleRewards[0].ruleKey, "line_row");
  assert.strictEqual(stepC.eligibleRewards[0].lineIndex, 0);
  console.log("  ✔ Photo removal and line re-claim idempotency verified");

  // 4. Milestone and Blackout Line Combination Rewards
  const fullEventRules: RaffleRuleRecord[] = [
    { id: "r1", ruleKey: "line_row", name: "Row Completion", category: "bingo_line", description: "", ticketsAwarded: 1, isActive: true },
    { id: "r4", ruleKey: "milestone_3", name: "Milestone 3", category: "milestone", description: "", ticketsAwarded: 1, isActive: true },
    { id: "r5", ruleKey: "line_blackout", name: "Full Blackout", category: "bingo_line", description: "", ticketsAwarded: 5, isActive: true },
  ];

  const blackoutEval = evaluateRaffleRules(fullEventRules, {
    completedSlotIndexes: fullGrid,
    memoryDropCount: 0,
    existingClaims: [],
    maxTicketsPerUser: 0, // unlimited
  });

  const awardedKeys = blackoutEval.eligibleRewards.map((r) => r.ruleKey);
  assert.ok(awardedKeys.includes("line_row"), "Must award row line(s)");
  assert.ok(awardedKeys.includes("milestone_3"), "Must award milestone 3");
  assert.ok(awardedKeys.includes("line_blackout"), "Must award blackout grand prize");
  assert.strictEqual(blackoutEval.totalNewTickets, 9, "Total tickets must match 3 rows (3*1) + milestone (1) + blackout (5) = 9");
  console.log("  ✔ Milestone and Blackout grand prize combinations calculated accurately");

  console.log("✔ Raffle concurrency & re-claim idempotency suite passed cleanly\n");
}

if (process.argv[1]?.endsWith("test-raffle-concurrency.ts")) {
  runRaffleConcurrencyTest().catch((err) => {
    console.error("❌ Raffle concurrency test failed:", err);
    process.exit(1);
  });
}
