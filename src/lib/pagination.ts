export const STRICT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PaginationCursorValidation {
  isValid: boolean;
  error?: string;
}

export function validatePaginationCursor(
  cursorCreatedAt: unknown,
  cursorId: unknown
): PaginationCursorValidation {
  if (typeof cursorId !== "string" || !STRICT_UUID_REGEX.test(cursorId)) {
    return { isValid: false, error: "Invalid cursor ID: must be a valid UUID" };
  }

  if (typeof cursorCreatedAt !== "string" || isNaN(new Date(cursorCreatedAt).getTime())) {
    return { isValid: false, error: "Invalid cursor timestamp: must be a valid ISO date" };
  }

  return { isValid: true };
}
