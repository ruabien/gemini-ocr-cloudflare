const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculates the new expiration timestamp for a subscription plan.
 *
 * @param currentExpiredAt The current expiration timestamp in milliseconds, or null/undefined if none exists or has expired.
 * @param planType The type of plan being purchased ("month" or "year").
 * @returns The new expiration timestamp in milliseconds.
 */
export function calculateNewExpiry(
  currentExpiredAt: number | null | undefined,
  planType: "month" | "year"
): number {
  const now = Date.now();
  const addedDays = planType === "month" ? 30 : 365;
  const addedMs = addedDays * MILLISECONDS_IN_A_DAY;

  if (currentExpiredAt && currentExpiredAt > now) {
    return currentExpiredAt + addedMs;
  }
  return now + addedMs;
}