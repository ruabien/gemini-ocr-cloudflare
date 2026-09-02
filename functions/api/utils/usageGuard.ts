/**
 * Server adapter for the pre-inference OCR request guard.
 *
 * Collects: (a) whether the request is BYOK or managed, (b) authentication
 * state from the Firebase ID token, (c) today's usage from Firestore, then
 * delegates the decision to the pure module shared/ocrRequestGuard.ts.
 *
 * This module does NOT touch Gemini. On a REJECT decision the function
 * returns a 4xx (or 401) with a small JSON body — no Gemini fetch occurs.
 * On ALLOW the function returns null and the caller proceeds.
 *
 * The guard is FAIL-FAST ONLY. Atomic reservation is explicitly out of scope.
 */

import {
  evaluateOcrRequest,
  type OcrGuardDecision,
} from "../../../shared/ocrRequestGuard";

export type { OcrGuardDecision } from "../../../shared/ocrRequestGuard";

export interface UsageGuardContext {
  request: Request;
  env: any;
  /** Caller's pre-decoded Firebase token (or null when unauthenticated). */
  decodedToken: { uid: string } | null;
  /** Already-loaded usage state — must be supplied by the caller. */
  pagesUsedToday: number;
  /** Plan info already loaded by the caller. */
  isPro: boolean;
  /** Whether the request carries a user-supplied BYOK key. */
  hasUserProvidedKey: boolean;
  /** Number of pages the caller intends to process. */
  requestedPages: number;
}

/**
 * Returns null when the request is allowed, or a Response to return
 * immediately when rejected. The caller MUST short-circuit on non-null.
 */
export async function applyOcrRequestGuard(
  ctx: UsageGuardContext
): Promise<Response | null> {
  const decision = evaluateOcrRequest({
    keyClass: ctx.hasUserProvidedKey ? "byok" : "managed",
    requestedPages: ctx.requestedPages,
    pagesUsedToday: ctx.pagesUsedToday,
    isAuthenticated: !!ctx.decodedToken,
    isPro: !!ctx.isPro,
  });

  if (decision.decision === "ALLOW") return null;

  const status = decision.code === "REJECT_UNAUTHENTICATED_MANAGED_NO_KEYS" ? 401 : 429;
  return new Response(
    JSON.stringify({
      success: false,
      error: decision.message,
      code: decision.code,
      pagesUsed: decision.pagesUsed,
      remainingPages: decision.remainingPages,
      dailyLimit: decision.dailyLimit,
      requestedPages: decision.requestedPages,
    }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

