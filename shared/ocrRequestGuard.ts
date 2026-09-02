/**
 * Pre-inference request guard for the /api/ocr Pages Function.
 *
 * Pure, environment-agnostic decision logic. The server (workerd) adapter
 * (functions/api/utils/usageGuard.ts) is responsible for collecting the
 * inputs from the Firebase token + Firestore check; this module decides what
 * to do with them.
 *
 * CONTRACT (locked by plan review):
 * - This guard is FAIL-FAST ONLY, NOT an atomic quota reservation.
 * - It is a read-then-decide TOCTOU check. Concurrent managed requests may
 *   collectively exceed the daily 50 cap. Atomic authorize/reserve/settle is
 *   a HARD PREREQUISITE for any future Managed Gemini Production Rollout
 *   and is out of scope here.
 * - What this guard GUARANTEES: a SINGLE over-limit managed request is
 *   rejected with zero Gemini fetches. (Tests 9 and 12 prove zero fetches.)
 * - Anonymous (= no verified Firebase ID token) is treated as a managed
 *   request for this guard's purposes (matches the server's "managed path"
 *   definition — unauthenticated callers go through the managed key pool).
 * - BYOK callers (user supplies their own Gemini key on the request) bypass
 *   this guard entirely and are not affected.
 * - Quota values are read from shared/usagePolicy.ts to keep one source of
 *   truth.
 */

import { FREE_DAILY_PAGE_LIMIT } from "./usagePolicy";

export type KeyClass = "byok" | "managed";

export interface OcrRequestGuardInput {
  /** Whether the request carries a user-supplied BYOK Gemini key. */
  keyClass: KeyClass;
  /** Pages the caller is about to submit in this single request. */
  requestedPages: number;
  /** Already-used pages today for this caller (Firestore dailyUsage.pages). */
  pagesUsedToday: number;
  /**
   * True when the request is verified-authenticated (Firebase ID token
   * validated) AND has a known plan field. Unverified/anonymous requests
   * are treated as managed (see file header).
   */
  isAuthenticated: boolean;
  /**
   * True when the authenticated caller is on the Pro plan and not expired.
   * Pro callers are exempt from the FREE daily cap (matches
   * functions/api/usage/check.ts).
   */
  isPro: boolean;
}

export type OcrGuardDecisionCode =
  | "ALLOW"
  | "ALLOW_PRO"
  | "REJECT_UNAUTHENTICATED_MANAGED_NO_KEYS"
  | "REJECT_MANAGED_DAILY_LIMIT"
  | "REJECT_MANAGED_PER_RUN_OVER_DAILY"
  | "REJECT_INVALID_PAGE_COUNT";

export interface OcrGuardDecision {
  /** What the caller should do. ALLOW = proceed to Gemini, REJECT = 4xx. */
  decision: "ALLOW" | "REJECT";
  code: OcrGuardDecisionCode;
  /** Public error message safe to return to the client. */
  message: string;
  /** Numeric fields used in the rejection body (test 9). */
  pagesUsed: number;
  remainingPages: number;
  dailyLimit: number;
  requestedPages: number;
}

export function evaluateOcrRequest(input: OcrRequestGuardInput): OcrGuardDecision {
  const requestedPages = Math.max(0, Math.floor(Number(input.requestedPages) || 0));
  const pagesUsedToday = Math.max(0, Math.floor(Number(input.pagesUsedToday) || 0));
  const dailyLimit = FREE_DAILY_PAGE_LIMIT;

  // Invalid request: no pages to process.
  if (requestedPages <= 0) {
    return {
      decision: "REJECT",
      code: "REJECT_INVALID_PAGE_COUNT",
      message: "requestedPages must be > 0",
      pagesUsed: pagesUsedToday,
      remainingPages: Math.max(0, dailyLimit - pagesUsedToday),
      dailyLimit,
      requestedPages,
    };
  }

  // BYOK callers bypass every managed-tier guard. The client owns the cost.
  if (input.keyClass === "byok") {
    return {
      decision: "ALLOW",
      code: "ALLOW",
      message: "BYOK path — caller-owned cost; quota guard not applied",
      pagesUsed: pagesUsedToday,
      remainingPages: Math.max(0, dailyLimit - pagesUsedToday),
      dailyLimit,
      requestedPages,
    };
  }

  // Unauthenticated + no BYOK key = no managed keys at all to use. Reject.
  if (!input.isAuthenticated) {
    return {
      decision: "REJECT",
      code: "REJECT_UNAUTHENTICATED_MANAGED_NO_KEYS",
      message: "Yêu cầu xác thực hoặc BYOK key để sử dụng OCR.",
      pagesUsed: pagesUsedToday,
      remainingPages: Math.max(0, dailyLimit - pagesUsedToday),
      dailyLimit,
      requestedPages,
    };
  }

  // Pro plan: server-side check.ts returns remainingPages=999999 for pro,
  // i.e. cap is effectively not enforced. Mirror that here.
  if (input.isPro) {
    return {
      decision: "ALLOW",
      code: "ALLOW_PRO",
      message: "Pro plan — daily cap not enforced",
      pagesUsed: pagesUsedToday,
      remainingPages: 999999,
      dailyLimit,
      requestedPages,
    };
  }

  // Single over-limit managed request: reject with zero Gemini fetches.
  // The remaining-pages-after-this-request would be < 0.
  if (pagesUsedToday >= dailyLimit) {
    return {
      decision: "REJECT",
      code: "REJECT_MANAGED_DAILY_LIMIT",
      message: "Đã hết hạn mức 50 trang miễn phí hôm nay.",
      pagesUsed: pagesUsedToday,
      remainingPages: 0,
      dailyLimit,
      requestedPages,
    };
  }

  if (pagesUsedToday + requestedPages > dailyLimit) {
    return {
      decision: "REJECT",
      code: "REJECT_MANAGED_PER_RUN_OVER_DAILY",
      message: "Tổng số trang yêu cầu vượt quá hạn mức 50 trang/ngày.",
      pagesUsed: pagesUsedToday,
      remainingPages: Math.max(0, dailyLimit - pagesUsedToday),
      dailyLimit,
      requestedPages,
    };
  }

  return {
    decision: "ALLOW",
    code: "ALLOW",
    message: "OK",
    pagesUsed: pagesUsedToday,
    remainingPages: Math.max(0, dailyLimit - pagesUsedToday - requestedPages),
    dailyLimit,
    requestedPages,
  };
}

