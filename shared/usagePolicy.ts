/**
 * Single source of truth for current FREE usage limits.
 *
 * IMPORTANT: Values intentionally unchanged from pre-instrumentation behavior.
 * This task introduces a fail-fast pre-inference guard for the MANAGED key path
 * only. BYOK behavior is unchanged. Atomic quota reservation is a HARD
 * PREREQUISITE for any future Managed Gemini Production Rollout and is
 * explicitly out of scope here — see SECURITY_DEBT_DEFERRED.
 */

export const FREE_DAILY_PAGE_LIMIT = 50;
export const FREE_PER_RUN_PAGE_LIMIT = 20;
