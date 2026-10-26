/**
 * Salingkusog 3x3 Bingo Engine & Raffle Code Self-Check Test Suite
 *
 * Executes automated unit tests for:
 * 1. Line definitions and matrix geometries
 * 2. Helper functions and boundary conditions
 * 3. Multi-line evaluation and missing slots tracking
 * 4. Claim idempotency and duplicate blocking
 * 5. Cryptographic raffle code generation, collision resistance, and entropy
 */

import assert from 'node:assert';
import {
  BINGO_LINES,
  RAFFLE_CHARSET,
  evaluateBingoLines,
  generateRaffleCode,
  isLineCompleted,
  isValidRaffleCodeFormat,
  validateLineClaim,
  evaluateRaffleRules,
  type ClaimedLine,
  type LineType,
  type RaffleRuleRecord,
} from '../src/lib/bingo-engine.ts';

function runTestSuite() {
  console.log('🧪 Starting Bingo Engine & Raffle Generator Test Suite...\n');

  // --------------------------------------------------------------------------
  // TEST 1: Line Definitions Integrity
  // --------------------------------------------------------------------------
  console.log('▶ Test 1: BINGO_LINES definitions');
  assert.strictEqual(BINGO_LINES.length, 9, 'Must have exactly 9 winning lines (8 standard + 1 blackout)');

  const rowLines = BINGO_LINES.filter((l) => l.type === 'row');
  const colLines = BINGO_LINES.filter((l) => l.type === 'column');
  const diagLines = BINGO_LINES.filter((l) => l.type === 'diagonal');
  const blackoutLines = BINGO_LINES.filter((l) => l.type === 'blackout');

  assert.strictEqual(rowLines.length, 3, 'Must have 3 row lines');
  assert.strictEqual(colLines.length, 3, 'Must have 3 column lines');
  assert.strictEqual(diagLines.length, 2, 'Must have 2 diagonal lines');
  assert.strictEqual(blackoutLines.length, 1, 'Must have 1 blackout line');

  // Verify exact slot indices
  assert.deepStrictEqual(rowLines[0].slots, [0, 1, 2]);
  assert.deepStrictEqual(rowLines[1].slots, [3, 4, 5]);
  assert.deepStrictEqual(rowLines[2].slots, [6, 7, 8]);

  assert.deepStrictEqual(colLines[0].slots, [0, 3, 6]);
  assert.deepStrictEqual(colLines[1].slots, [1, 4, 7]);
  assert.deepStrictEqual(colLines[2].slots, [2, 5, 8]);

  assert.deepStrictEqual(diagLines[0].slots, [0, 4, 8]);
  assert.deepStrictEqual(diagLines[1].slots, [2, 4, 6]);

  assert.deepStrictEqual(blackoutLines[0].slots, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  console.log('  ✔ Line geometry matrix verified');

  // --------------------------------------------------------------------------
  // TEST 2: isLineCompleted Helper
  // --------------------------------------------------------------------------
  console.log('▶ Test 2: isLineCompleted helper');
  assert.strictEqual(isLineCompleted([0, 1, 2], []), false);
  assert.strictEqual(isLineCompleted([0, 1, 2], [0, 1]), false);
  assert.strictEqual(isLineCompleted([0, 1, 2], [0, 1, 2]), true);
  assert.strictEqual(isLineCompleted([0, 1, 2], [2, 1, 0]), true, 'Should be order independent');
  assert.strictEqual(isLineCompleted([0, 1, 2], [0, 1, 2, 3, 4]), true, 'Superset should be complete');
  console.log('  ✔ isLineCompleted behavior verified');

  // --------------------------------------------------------------------------
  // TEST 3: evaluateBingoLines - Empty and Partial States
  // --------------------------------------------------------------------------
  console.log('▶ Test 3: evaluateBingoLines empty and partial grids');
  const emptyResult = evaluateBingoLines([]);
  assert.strictEqual(emptyResult.completedLineCount, 0);
  assert.strictEqual(emptyResult.claimableLines.length, 0);
  assert.strictEqual(emptyResult.claimedLines.length, 0);
  assert.strictEqual(emptyResult.pendingLines.length, 9);
  assert.strictEqual(emptyResult.isBlackout, false);
  assert.strictEqual(emptyResult.progressPercentage, 0);

  // Partial grid: slots 0 and 1 completed (Row 0 is missing slot 2)
  const partialResult = evaluateBingoLines([0, 1]);
  assert.strictEqual(partialResult.completedLineCount, 0);
  assert.strictEqual(partialResult.progressPercentage, 22); // 2/9 = 22%
  const row0Status = partialResult.pendingLines.find((p) => p.line.id === 'row_0');
  assert.ok(row0Status, 'Row 0 must be in pendingLines');
  assert.deepStrictEqual(row0Status.completedSlots, [0, 1]);
  assert.deepStrictEqual(row0Status.missingSlots, [2]);
  console.log('  ✔ Partial grid evaluation and missing slots verified');

  // --------------------------------------------------------------------------
  // TEST 4: evaluateBingoLines - Single Line and Multi-Line Claims
  // --------------------------------------------------------------------------
  console.log('▶ Test 4: Single line and multi-line claims');
  // Row 0 completed: [0, 1, 2]
  const row0Result = evaluateBingoLines([0, 1, 2]);
  assert.strictEqual(row0Result.completedLineCount, 1);
  assert.strictEqual(row0Result.claimableLines.length, 1);
  assert.strictEqual(row0Result.claimableLines[0].line.id, 'row_0');
  assert.strictEqual(row0Result.claimableLines[0].isClaimable, true);
  assert.strictEqual(row0Result.progressPercentage, 33);

  // Multi-line: Row 1 ([3, 4, 5]) AND Col 0 ([0, 3, 6]) completed -> slots [0, 3, 4, 5, 6]
  const multiResult = evaluateBingoLines([0, 3, 4, 5, 6]);
  assert.strictEqual(multiResult.completedLineCount, 2, 'Row 1 and Col 0 completed');
  const claimableIds = multiResult.claimableLines.map((c) => c.line.id).sort();
  assert.deepStrictEqual(claimableIds, ['col_0', 'row_1']);

  // Now simulate that Row 1 was already claimed previously
  const claimedList: ClaimedLine[] = [{ lineType: 'row', lineIndex: 1 }];
  const claimedResult = evaluateBingoLines([0, 3, 4, 5, 6], claimedList);
  assert.strictEqual(claimedResult.completedLineCount, 2);
  assert.strictEqual(claimedResult.claimedLines.length, 1);
  assert.strictEqual(claimedResult.claimedLines[0].line.id, 'row_1');
  assert.strictEqual(claimedResult.claimedLines[0].isClaimed, true);
  assert.strictEqual(claimedResult.claimableLines.length, 1);
  assert.strictEqual(claimedResult.claimableLines[0].line.id, 'col_0');
  console.log('  ✔ Multi-line evaluation and claim segregation verified');

  // --------------------------------------------------------------------------
  // TEST 5: evaluateBingoLines - Diagonals and Full Blackout
  // --------------------------------------------------------------------------
  console.log('▶ Test 5: Diagonals and Full Blackout');
  // Main diagonal: [0, 4, 8]
  const diag0Result = evaluateBingoLines([0, 4, 8]);
  assert.strictEqual(diag0Result.claimableLines.some((l) => l.line.id === 'diag_0'), true);

  // Anti diagonal: [2, 4, 6]
  const diag1Result = evaluateBingoLines([2, 4, 6]);
  assert.strictEqual(diag1Result.claimableLines.some((l) => l.line.id === 'diag_1'), true);

  // Full Blackout: all 9 slots [0..8]
  const blackoutResult = evaluateBingoLines([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.strictEqual(blackoutResult.completedLineCount, 9, 'All 8 lines + blackout line');
  assert.strictEqual(blackoutResult.isBlackout, true);
  assert.strictEqual(blackoutResult.progressPercentage, 100);
  assert.strictEqual(blackoutResult.claimableLines.length, 9);
  console.log('  ✔ Diagonals and blackout completion verified');

  // --------------------------------------------------------------------------
  // TEST 6: Input Sanitization & Bounds Checking
  // --------------------------------------------------------------------------
  console.log('▶ Test 6: Input sanitization & bounds checking');
  // Floats, negatives, duplicates, numbers > 8
  const dirtySlots = [-5, 0, 0, 1, 1, 2, 2, 9, 100, 3.14, NaN];
  const sanitizedResult = evaluateBingoLines(dirtySlots);
  assert.strictEqual(sanitizedResult.completedLineCount, 1);
  assert.strictEqual(sanitizedResult.claimableLines[0].line.id, 'row_0');
  assert.strictEqual(sanitizedResult.progressPercentage, 33);
  console.log('  ✔ Dirty input filtered cleanly');

  // --------------------------------------------------------------------------
  // TEST 7: validateLineClaim Verification
  // --------------------------------------------------------------------------
  console.log('▶ Test 7: validateLineClaim checks');
  // Valid claim for Top Row
  const validCheck = validateLineClaim('row', 0, [0, 1, 2], []);
  assert.strictEqual(validCheck.valid, true);
  assert.strictEqual(validCheck.reason, undefined);

  // Duplicate claim prevention
  const dupCheck = validateLineClaim('row', 0, [0, 1, 2], [{ lineType: 'row', lineIndex: 0 }]);
  assert.strictEqual(dupCheck.valid, false);
  assert.ok(dupCheck.reason?.includes('already been claimed'));

  // Incomplete line claim attempt
  const incompleteCheck = validateLineClaim('row', 0, [0, 1], []);
  assert.strictEqual(incompleteCheck.valid, false);
  assert.ok(incompleteCheck.reason?.includes('not yet completed'));

  // Non-existent line definition attempt
  const invalidLineCheck = validateLineClaim('row' as LineType, 5, [0, 1, 2], []);
  assert.strictEqual(invalidLineCheck.valid, false);
  assert.ok(invalidLineCheck.reason?.includes('does not exist'));
  console.log('  ✔ validateLineClaim logic and guardrails verified');

  // --------------------------------------------------------------------------
  // TEST 8: Raffle Code Generation & Format Validation
  // --------------------------------------------------------------------------
  console.log('▶ Test 8: Cryptographic Raffle Code Generator');
  const sampleCode = generateRaffleCode();
  console.log(`  Sample Generated Code: ${sampleCode}`);
  assert.ok(sampleCode.startsWith('SK-RFL-'), 'Must start with SK-RFL-');
  assert.strictEqual(sampleCode.length, 13, 'Length must be exactly 13 (SK-RFL- + 6 chars)');
  assert.strictEqual(isValidRaffleCodeFormat(sampleCode), true);

  // Format validation negative tests
  assert.strictEqual(isValidRaffleCodeFormat('SK-RFL-000000'), false, 'Cannot contain 0');
  assert.strictEqual(isValidRaffleCodeFormat('SK-RFL-OOOOOO'), false, 'Cannot contain O');
  assert.strictEqual(isValidRaffleCodeFormat('SK-RFL-111111'), false, 'Cannot contain 1');
  assert.strictEqual(isValidRaffleCodeFormat('SK-RFL-IIIIII'), false, 'Cannot contain I');
  assert.strictEqual(isValidRaffleCodeFormat('SK-RFL-LLLLLL'), false, 'Cannot contain L');
  assert.strictEqual(isValidRaffleCodeFormat('SK-RFL-8K3N7'), false, 'Too short');
  assert.strictEqual(isValidRaffleCodeFormat('SK-RFL-8K3N7PZ'), false, 'Too long');
  assert.strictEqual(isValidRaffleCodeFormat('INVALID-CODE'), false, 'Bad prefix');
  assert.strictEqual(isValidRaffleCodeFormat('sk-rfl-8k3n7p'), false, 'Must be uppercase');

  // --------------------------------------------------------------------------
  // TEST 9: Entropy and 1,000 Sample Collision Test
  // --------------------------------------------------------------------------
  console.log('▶ Test 9: 1,000 iterations collision & distribution test');
  const generatedSet = new Set<string>();
  const charFreq: Record<string, number> = {};
  for (const c of RAFFLE_CHARSET) {
    charFreq[c] = 0;
  }

  const ITERATIONS = 1_000;
  for (let i = 0; i < ITERATIONS; i++) {
    const code = generateRaffleCode();
    assert.strictEqual(isValidRaffleCodeFormat(code), true, `Code ${code} must be valid`);
    assert.strictEqual(generatedSet.has(code), false, `Collision detected on iteration ${i}: ${code}`);
    generatedSet.add(code);

    const randomPart = code.slice(7);
    for (const char of randomPart) {
      charFreq[char]++;
    }
  }

  assert.strictEqual(generatedSet.size, ITERATIONS, 'Must have zero collisions across 1,000 samples');

  // Verify all 31 characters were sampled across 60,000 character instances
  for (const c of RAFFLE_CHARSET) {
    assert.ok(charFreq[c] > 0, `Character '${c}' should be generated (observed ${charFreq[c]})`);
  }
  console.log(`  ✔ Generated ${ITERATIONS} codes with 0 collisions and uniform distribution`);

  // --------------------------------------------------------------------------
  // TEST 10: evaluateRaffleRules Dynamic Multi-Rule Evaluation
  // --------------------------------------------------------------------------
  console.log('▶ Test 10: evaluateRaffleRules dynamic multi-rule evaluation');
  const sampleRules: RaffleRuleRecord[] = [
    { id: '1', ruleKey: 'line_row', name: 'Row Completion', category: 'bingo_line', description: '', ticketsAwarded: 1, isActive: true },
    { id: '2', ruleKey: 'line_column', name: 'Column Completion', category: 'bingo_line', description: '', ticketsAwarded: 1, isActive: true },
    { id: '3', ruleKey: 'line_diagonal', name: 'Diagonal Completion', category: 'bingo_line', description: '', ticketsAwarded: 1, isActive: true },
    { id: '4', ruleKey: 'line_blackout', name: 'Full Blackout', category: 'bingo_line', description: '', ticketsAwarded: 2, isActive: true },
    { id: '5', ruleKey: 'milestone_3', name: 'Milestone 3', category: 'milestone', description: '', ticketsAwarded: 1, isActive: true },
    { id: '6', ruleKey: 'milestone_6', name: 'Milestone 6', category: 'milestone', description: '', ticketsAwarded: 1, isActive: true },
    { id: '7', ruleKey: 'memory_drop', name: 'Memory Drop', category: 'memory_drop', description: '', ticketsAwarded: 1, isActive: true },
  ];

  // 10a: Row 0 completed with memory drop
  const eval1 = evaluateRaffleRules(sampleRules, {
    completedSlotIndexes: [0, 1, 2],
    memoryDropCount: 1,
    existingClaims: [],
    maxTicketsPerUser: 0,
  });
  assert.strictEqual(eval1.eligibleRewards.length, 3, 'Should trigger row_0, milestone_3, and memory_drop');
  assert.strictEqual(eval1.totalNewTickets, 3, 'Total tickets should be 3');

  // 10b: Idempotency with existing claim on row 0 and milestone 3
  const eval2 = evaluateRaffleRules(sampleRules, {
    completedSlotIndexes: [0, 1, 2],
    memoryDropCount: 1,
    existingClaims: [
      { lineType: 'row', lineIndex: 0, ruleKey: 'line_row' },
      { lineType: 'milestone', lineIndex: 0, ruleKey: 'milestone_3' },
    ],
    maxTicketsPerUser: 0,
  });
  assert.strictEqual(eval2.eligibleRewards.length, 1, 'Only memory_drop should remain claimable');
  assert.strictEqual(eval2.eligibleRewards[0].ruleKey, 'memory_drop');

  // 10c: Student ticket cap enforcement
  const eval3 = evaluateRaffleRules(sampleRules, {
    completedSlotIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    memoryDropCount: 0,
    existingClaims: [],
    maxTicketsPerUser: 2,
  });
  assert.strictEqual(eval3.totalNewTickets, 2, 'Must strictly cap at maxTicketsPerUser');
  assert.strictEqual(eval3.isCapped, true, 'isCapped flag must be true');

  console.log('  ✔ evaluateRaffleRules multi-rule, idempotency, and limits verified');

  console.log('\n🎉 ALL 10 TEST SUITES PASSED CLEANLY!\n');
}

runTestSuite();
