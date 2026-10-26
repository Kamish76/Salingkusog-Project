export const CURRENT_TERMS_VERSION = "v1.0";
export const CURRENT_PRIVACY_VERSION = "v1.0";

export type ReportReason = "no_consent" | "inappropriate" | "harassment" | "other";

export const VALID_REPORT_REASONS: readonly ReportReason[] = [
  "no_consent",
  "inappropriate",
  "harassment",
  "other",
] as const;

export interface ConsentRecordLike {
  termsVersion: string;
  privacyVersion: string;
  agreedTermsPrivacy: boolean;
  agreedPublicGallery: boolean;
  agreedPromotionalUse?: boolean;
}

/**
 * Predicate to evaluate whether a consent record satisfies active compliance rules.
 */
export function isConsentCompliant(record: ConsentRecordLike | null | undefined): boolean {
  if (!record) return false;
  return (
    record.termsVersion === CURRENT_TERMS_VERSION &&
    record.privacyVersion === CURRENT_PRIVACY_VERSION &&
    record.agreedTermsPrivacy === true &&
    record.agreedPublicGallery === true
  );
}
