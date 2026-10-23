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
