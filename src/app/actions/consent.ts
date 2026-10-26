"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { recordActivityLog } from "@/lib/activity-logger";
import { deleteBucketObject, extractStorageKey } from "@/lib/storage";
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  isConsentCompliant,
} from "@/lib/consent-predicates";

export interface UserConsentRecord {
  id: string;
  userId: string;
  termsVersion: string;
  privacyVersion: string;
  agreedTermsPrivacy: boolean;
  agreedPublicGallery: boolean;
  agreedPromotionalUse: boolean;
  consentedAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Checks whether a user has recorded valid, current consent for v1.0 terms & privacy.
 */
export async function checkUserConsent(userId: string): Promise<{
  hasConsented: boolean;
  consent: UserConsentRecord | null;
}> {
  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { hasConsented: false, consent: null };
  }

  try {
    const rows = await sql`
      SELECT 
        id,
        user_id,
        terms_version,
        privacy_version,
        agreed_terms_privacy,
        agreed_public_gallery,
        agreed_promotional_use,
        consented_at,
        updated_at
      FROM public.user_consents
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) {
      return { hasConsented: false, consent: null };
    }

    const r = rows[0];
    const consent: UserConsentRecord = {
      id: r.id,
      userId: r.user_id,
      termsVersion: r.terms_version,
      privacyVersion: r.privacy_version,
      agreedTermsPrivacy: Boolean(r.agreed_terms_privacy),
      agreedPublicGallery: Boolean(r.agreed_public_gallery),
      agreedPromotionalUse: Boolean(r.agreed_promotional_use),
      consentedAt: r.consented_at,
      updatedAt: r.updated_at,
    };

    const hasConsented = isConsentCompliant(consent);

    return { hasConsented, consent };
  } catch (err) {
    console.error("checkUserConsent error:", err);
    return { hasConsented: false, consent: null };
  }
}

/**
 * Save user consent agreement on first sign-in or after policy update.
 */
export async function saveUserConsentAction(
  agreedPromotionalUse: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return { success: false, error: "Please sign in with Google to record consent." };
  }

  try {
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "unknown";

    await sql`
      INSERT INTO public.user_consents (
        user_id,
        terms_version,
        privacy_version,
        agreed_terms_privacy,
        agreed_public_gallery,
        agreed_promotional_use,
        user_agent,
        consented_at,
        updated_at
      )
      VALUES (
        ${user.id}::uuid,
        ${CURRENT_TERMS_VERSION},
        ${CURRENT_PRIVACY_VERSION},
        true,
        true,
        ${agreedPromotionalUse},
        ${userAgent},
        now(),
        now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        terms_version = ${CURRENT_TERMS_VERSION},
        privacy_version = ${CURRENT_PRIVACY_VERSION},
        agreed_terms_privacy = true,
        agreed_public_gallery = true,
        agreed_promotional_use = ${agreedPromotionalUse},
        user_agent = ${userAgent},
        consented_at = now(),
        updated_at = now();
    `;

    await recordActivityLog({
      actionType: "CONSENT_AGREE",
      category: "user",
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      targetId: user.id,
      targetType: "user",
      description: `[DPA Consent] Agreed to Terms & Privacy ${CURRENT_TERMS_VERSION} (Promotional feature: ${agreedPromotionalUse ? "enabled" : "disabled"})`,
      metadata: {
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        agreedPromotionalUse,
      },
    });

    revalidatePath("/");
    revalidatePath("/gallery");
    return { success: true };
  } catch (err) {
    console.error("saveUserConsentAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to record consent",
    };
  }
}

/**
 * Toggle promotional recap & highlights permission from Personal Gallery view.
 */
export async function updatePromotionalConsentAction(
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return { success: false, error: "Please sign in to update your privacy settings." };
  }

  try {
    await sql`
      UPDATE public.user_consents
      SET 
        agreed_promotional_use = ${enabled},
        updated_at = now()
      WHERE user_id = ${user.id}::uuid;
    `;

    await recordActivityLog({
      actionType: "CONSENT_UPDATE",
      category: "user",
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      targetId: user.id,
      targetType: "user",
      description: `[DPA Consent] Updated promotional recap permission to: ${enabled ? "enabled" : "disabled"}`,
      metadata: {
        agreedPromotionalUse: enabled,
      },
    });

    revalidatePath("/gallery");
    return { success: true };
  } catch (err) {
    console.error("updatePromotionalConsentAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update preference",
    };
  }
}

/**
 * Self-Service Wipeout & Cascade Delete (RA 10173 Right to Erasure / Blocking).
 * Permanently removes all user photos from S3 storage, deletes all memory posts,
 * clears 3x3 bingo progress slots, removes raffle ticket entries, and wipes consent record.
 */
export async function wipeoutUserAccountAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return { success: false, error: "Please sign in to complete account deletion." };
  }

  try {
    // 1. Fetch all user photos to clean up files in S3/Neon object storage
    const userPosts = await sql`
      SELECT id, image_url 
      FROM public.posts 
      WHERE user_id = ${user.id}::uuid
    `;

    for (const post of userPosts) {
      if (post.image_url) {
        const key = extractStorageKey(post.image_url);
        if (key) {
          deleteBucketObject(key).catch((err) =>
            console.error(`Failed to delete blob for post ${post.id}:`, err)
          );
        }
      }
    }

    // 2. Cascade delete database records across all user domains
    await sql`
      DELETE FROM public.user_bingo_progress
      WHERE user_id = ${user.id}::uuid;
    `;

    await sql`
      DELETE FROM public.raffle_entries
      WHERE user_id = ${user.id}::uuid;
    `;

    await sql`
      DELETE FROM public.photo_reports
      WHERE reporter_id = ${user.id}::uuid;
    `;

    await sql`
      DELETE FROM public.posts
      WHERE user_id = ${user.id}::uuid;
    `;

    await sql`
      DELETE FROM public.user_consents
      WHERE user_id = ${user.id}::uuid;
    `;

    // 3. Record audit trail for erasure compliance
    await recordActivityLog({
      actionType: "ACCOUNT_WIPEOUT",
      category: "user",
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      targetId: user.id,
      targetType: "user",
      description: `[DPA Erasure] Self-service account wipeout: purged ${userPosts.length} posts, bingo slots, raffle codes, and consent records`,
      metadata: {
        purgedPostsCount: userPosts.length,
      },
    });

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/dev/logs");

    return { success: true };
  } catch (err) {
    console.error("wipeoutUserAccountAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to erase account data",
    };
  }
}
