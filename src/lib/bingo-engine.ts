/**
 * Salingkusog 3x3 Intramurals Bingo and Raffle Claim Business Logic Engine
 *
 * Pure TypeScript domain engine:
 * - Fixed 3x3 matrix (slots 0..8)
 * - 8 Winning Lines (3 rows, 3 columns, 2 diagonals) + 1 Blackout Bonus
 * - Cryptographic, bias-free raffle ticket code generator (SK-RFL-XXXXXX)
 * - Zero external npm dependencies and zero UI imports.
 */

export type LineType = 'row' | 'column' | 'diagonal' | 'blackout';

export interface BingoLineDefinition {
  id: string;
  type: LineType;
  index: number;
  name: string;
  slots: readonly number[];
}

export interface ClaimedLine {
  lineType: LineType;
  lineIndex: number;
}

export interface BingoLineStatus {
  line: BingoLineDefinition;
  isCompleted: boolean;
  isClaimed: boolean;
  isClaimable: boolean;
  completedSlots: number[];
  missingSlots: number[];
}

export interface BingoEvaluationResult {
  completedLineCount: number;
  claimableLines: BingoLineStatus[];
  claimedLines: BingoLineStatus[];
  pendingLines: BingoLineStatus[];
  isBlackout: boolean;
  progressPercentage: number;
}

/**
 * All 8 winning lines plus the 9-slot blackout line on a 3x3 grid:
 *
 * 0 | 1 | 2
 * ---------
 * 3 | 4 | 5
 * ---------
 * 6 | 7 | 8
 */
export const BINGO_LINES: readonly BingoLineDefinition[] = [
  { id: 'row_0', type: 'row', index: 0, name: 'Top Row', slots: [0, 1, 2] },
  { id: 'row_1', type: 'row', index: 1, name: 'Middle Row', slots: [3, 4, 5] },
  { id: 'row_2', type: 'row', index: 2, name: 'Bottom Row', slots: [6, 7, 8] },
  { id: 'col_0', type: 'column', index: 0, name: 'Left Column', slots: [0, 3, 6] },
  { id: 'col_1', type: 'column', index: 1, name: 'Center Column', slots: [1, 4, 7] },
  { id: 'col_2', type: 'column', index: 2, name: 'Right Column', slots: [2, 5, 8] },
  { id: 'diag_0', type: 'diagonal', index: 0, name: 'Main Diagonal', slots: [0, 4, 8] },
  { id: 'diag_1', type: 'diagonal', index: 1, name: 'Anti-Diagonal', slots: [2, 4, 6] },
  { id: 'blackout', type: 'blackout', index: 0, name: 'Full Blackout', slots: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
] as const;

/**
 * 31-character alphabet excluding visually ambiguous glyphs:
 * Excluded: 0 (zero), O (letter O), 1 (one), I (letter I), L (letter L)
 */
export const RAFFLE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const RAFFLE_PREFIX = 'SK-RFL-';
export const RAFFLE_CODE_REGEX = /^SK-RFL-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

/**
 * Checks if all required slots for a line are completed.
 */
export function isLineCompleted(slots: readonly number[] | number[], completedSlots: readonly number[] | number[]): boolean {
  if (!slots || slots.length === 0) return false;
  const completedSet = new Set(completedSlots);
  return slots.every((slot) => completedSet.has(slot));
}

/**
 * Evaluates the 3x3 grid state against all 8 lines and blackout.
 *
 * @param completedSlotIndexes Array of completed slot numbers (0..8)
 * @param claimedLines Array of lines previously claimed by the user
 */
export function evaluateBingoLines(
  completedSlotIndexes: number[],
  claimedLines: ClaimedLine[] = []
): BingoEvaluationResult {
  // Sanitize and bound slot indexes strictly to valid 0..8 integers
  const validSlots = new Set<number>();
  for (const s of completedSlotIndexes) {
    if (Number.isInteger(s) && s >= 0 && s <= 8) {
      validSlots.add(s);
    }
  }

  // Build quick lookup set for claimed lines
  const claimedKeySet = new Set<string>();
  for (const cl of claimedLines) {
    claimedKeySet.add(`${cl.lineType}_${cl.lineIndex}`);
  }

  const claimableLines: BingoLineStatus[] = [];
  const claimedLinesResult: BingoLineStatus[] = [];
  const pendingLines: BingoLineStatus[] = [];
  let completedLineCount = 0;

  for (const line of BINGO_LINES) {
    const completedSlots = line.slots.filter((slot) => validSlots.has(slot));
    const missingSlots = line.slots.filter((slot) => !validSlots.has(slot));
    const isCompleted = missingSlots.length === 0;
    const isClaimed = claimedKeySet.has(`${line.type}_${line.index}`);
    const isClaimable = isCompleted && !isClaimed;

    const status: BingoLineStatus = {
      line,
      isCompleted,
      isClaimed,
      isClaimable,
      completedSlots,
      missingSlots,
    };

    if (isCompleted) {
      completedLineCount++;
    }

    if (isClaimed) {
      claimedLinesResult.push(status);
    } else if (isClaimable) {
      claimableLines.push(status);
    } else {
      pendingLines.push(status);
    }
  }

  const isBlackout = validSlots.size === 9;
  const progressPercentage = Math.round((validSlots.size / 9) * 100);

  return {
    completedLineCount,
    claimableLines,
    claimedLines: claimedLinesResult,
    pendingLines,
    isBlackout,
    progressPercentage,
  };
}

/**
 * Validates whether a specific line claim request is legitimate and unblocked.
 *
 * @param lineType Type of the target winning line
 * @param lineIndex Index of the line (0..2 for row/col, 0..1 for diag, 0 for blackout)
 * @param completedSlots Array of student's completed slot numbers
 * @param alreadyClaimed Array of lines previously claimed by the student
 */
export function validateLineClaim(
  lineType: LineType,
  lineIndex: number,
  completedSlots: number[],
  alreadyClaimed: ClaimedLine[]
): { valid: boolean; reason?: string } {
  const targetLine = BINGO_LINES.find(
    (line) => line.type === lineType && line.index === lineIndex
  );

  if (!targetLine) {
    return {
      valid: false,
      reason: `Invalid bingo line: type '${lineType}' and index ${lineIndex} does not exist.`,
    };
  }

  const isAlreadyClaimed = alreadyClaimed.some(
    (c) => c.lineType === lineType && c.lineIndex === lineIndex
  );

  if (isAlreadyClaimed) {
    return {
      valid: false,
      reason: `Line '${targetLine.name}' has already been claimed.`,
    };
  }

  if (!isLineCompleted(targetLine.slots, completedSlots)) {
    return {
      valid: false,
      reason: `Line '${targetLine.name}' is not yet completed.`,
    };
  }

  return { valid: true };
}

/**
 * Generates an authoritative, collision-resistant raffle code.
 * Format: `SK-RFL-XXXXXX` (e.g. `SK-RFL-8K3N7P`)
 *
 * Uses cryptographic randomness with rejection sampling to eliminate modulo bias.
 */
export function generateRaffleCode(): string {
  const result: string[] = [];
  const buffer = new Uint8Array(16);

  // 31 characters. 31 * 8 = 248. Bytes 0..247 provide exact uniform distribution.
  while (result.length < 6) {
    globalThis.crypto.getRandomValues(buffer);
    for (let i = 0; i < buffer.length && result.length < 6; i++) {
      const byte = buffer[i];
      if (byte < 248) {
        result.push(RAFFLE_CHARSET[byte % 31]);
      }
    }
  }

  return `${RAFFLE_PREFIX}${result.join('')}`;
}

/**
 * Validates whether a raffle code matches the authoritative format pattern.
 */
export function isValidRaffleCodeFormat(code: string): boolean {
  if (typeof code !== 'string') return false;
  return RAFFLE_CODE_REGEX.test(code);
}

// -----------------------------------------------------------------------------
// Dynamic Raffle Rules Configuration & Multi-Rule Evaluation
// -----------------------------------------------------------------------------

export type RaffleRuleCategory = 'bingo_line' | 'milestone' | 'memory_drop' | 'general';

export interface RaffleRuleRecord {
  id: string;
  ruleKey: string;
  name: string;
  category: RaffleRuleCategory;
  description: string;
  ticketsAwarded: number;
  isActive: boolean;
}

export interface ExistingRaffleClaim {
  ruleKey?: string | null;
  lineType: string;
  lineIndex: number;
}

export interface RaffleEvaluationInput {
  completedSlotIndexes: number[];
  memoryDropCount: number;
  existingClaims: ExistingRaffleClaim[];
  maxTicketsPerUser?: number; // 0 = unlimited
}

export interface EligibleRaffleReward {
  ruleKey: string;
  ruleName: string;
  category: RaffleRuleCategory;
  lineType: 'row' | 'column' | 'diagonal' | 'blackout' | 'milestone' | 'memory_drop';
  lineIndex: number;
  ticketsAwarded: number;
  taskSlotIndexes?: number[];
  reason: string;
}

export interface RaffleRulesEvaluationResult {
  eligibleRewards: EligibleRaffleReward[];
  totalNewTickets: number;
  isCapped: boolean;
  activeRuleCount: number;
}

/**
 * Pure domain evaluator checking user progress (completed slots & memory drops)
 * against active raffle rules, filtering out previous claims, and enforcing user ticket limits.
 */
export function evaluateRaffleRules(
  rules: RaffleRuleRecord[],
  input: RaffleEvaluationInput
): RaffleRulesEvaluationResult {
  const activeRules = rules.filter((r) => r.isActive);
  const activeRuleKeys = new Set(activeRules.map((r) => r.ruleKey));

  // Build lookup sets for existing claims
  const claimedKeys = new Set<string>();
  for (const claim of input.existingClaims) {
    if (claim.ruleKey) {
      claimedKeys.add(`rule_${claim.ruleKey}`);
    }
    claimedKeys.add(`${claim.lineType}_${claim.lineIndex}`);
  }

  // Sanitize valid completed slot indexes (0..8)
  const validSlots = new Set<number>();
  for (const s of input.completedSlotIndexes) {
    if (Number.isInteger(s) && s >= 0 && s <= 8) {
      validSlots.add(s);
    }
  }

  const eligibleRewards: EligibleRaffleReward[] = [];

  // Helper to check if a line is completed
  const hasCompletedSlots = (requiredSlots: readonly number[]): boolean => {
    return requiredSlots.every((slot) => validSlots.has(slot));
  };

  // 1. Evaluate Bingo Lines (row, col, diag, blackout)
  for (const line of BINGO_LINES) {
    const ruleKey =
      line.type === 'row'
        ? 'line_row'
        : line.type === 'column'
        ? 'line_column'
        : line.type === 'diagonal'
        ? 'line_diagonal'
        : 'line_blackout';

    if (!activeRuleKeys.has(ruleKey)) continue;

    const rule = activeRules.find((r) => r.ruleKey === ruleKey);
    if (!rule) continue;

    const isClaimed =
      claimedKeys.has(`${line.type}_${line.index}`) ||
      (line.type === 'blackout' && claimedKeys.has('rule_line_blackout'));

    if (!isClaimed && hasCompletedSlots(line.slots)) {
      eligibleRewards.push({
        ruleKey: rule.ruleKey,
        ruleName: `${rule.name} (${line.name})`,
        category: 'bingo_line',
        lineType: line.type,
        lineIndex: line.index,
        ticketsAwarded: rule.ticketsAwarded,
        taskSlotIndexes: [...line.slots],
        reason: `Completed ${line.name}`,
      });
    }
  }

  // 2. Evaluate Milestones (Bronze: 3 slots, Silver: 6 slots)
  if (activeRuleKeys.has('milestone_3')) {
    const rule = activeRules.find((r) => r.ruleKey === 'milestone_3')!;
    const isClaimed = claimedKeys.has('milestone_0') || claimedKeys.has('rule_milestone_3');
    if (!isClaimed && validSlots.size >= 3) {
      eligibleRewards.push({
        ruleKey: 'milestone_3',
        ruleName: rule.name,
        category: 'milestone',
        lineType: 'milestone',
        lineIndex: 0,
        ticketsAwarded: rule.ticketsAwarded,
        reason: `Completed ${validSlots.size} challenge slots (Milestone 3)`,
      });
    }
  }

  if (activeRuleKeys.has('milestone_6')) {
    const rule = activeRules.find((r) => r.ruleKey === 'milestone_6')!;
    const isClaimed = claimedKeys.has('milestone_1') || claimedKeys.has('rule_milestone_6');
    if (!isClaimed && validSlots.size >= 6) {
      eligibleRewards.push({
        ruleKey: 'milestone_6',
        ruleName: rule.name,
        category: 'milestone',
        lineType: 'milestone',
        lineIndex: 1,
        ticketsAwarded: rule.ticketsAwarded,
        reason: `Completed ${validSlots.size} challenge slots (Milestone 6)`,
      });
    }
  }

  // 3. Evaluate Memory Drops
  if (activeRuleKeys.has('memory_drop')) {
    const rule = activeRules.find((r) => r.ruleKey === 'memory_drop')!;
    const isClaimed = claimedKeys.has('memory_drop_0') || claimedKeys.has('rule_memory_drop');
    if (!isClaimed && input.memoryDropCount >= 1) {
      eligibleRewards.push({
        ruleKey: 'memory_drop',
        ruleName: rule.name,
        category: 'memory_drop',
        lineType: 'memory_drop',
        lineIndex: 0,
        ticketsAwarded: rule.ticketsAwarded,
        reason: `Uploaded ${input.memoryDropCount} campus scrapbook photo(s)`,
      });
    }
  }

  // 4. Enforce User Ticket Cap (maxTicketsPerUser)
  const currentClaimCount = input.existingClaims.length;
  const maxLimit = input.maxTicketsPerUser && input.maxTicketsPerUser > 0 ? input.maxTicketsPerUser : 0;

  let totalNewTickets = 0;
  let isCapped = false;
  const finalRewards: EligibleRaffleReward[] = [];

  for (const reward of eligibleRewards) {
    if (maxLimit > 0 && currentClaimCount + totalNewTickets + reward.ticketsAwarded > maxLimit) {
      isCapped = true;
      // If we can partially award up to the limit
      const remainingAllowed = maxLimit - (currentClaimCount + totalNewTickets);
      if (remainingAllowed > 0) {
        finalRewards.push({
          ...reward,
          ticketsAwarded: remainingAllowed,
          reason: `${reward.reason} (capped by max limit)`,
        });
        totalNewTickets += remainingAllowed;
      }
      break;
    } else {
      finalRewards.push(reward);
      totalNewTickets += reward.ticketsAwarded;
    }
  }

  return {
    eligibleRewards: finalRewards,
    totalNewTickets,
    isCapped,
    activeRuleCount: activeRules.length,
  };
}
