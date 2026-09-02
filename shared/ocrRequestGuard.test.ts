/**
 * Tests for the pre-inference OCR request guard.
 * Run with: npx tsx shared/ocrRequestGuard.test.ts
 */
import {
  evaluateOcrRequest,
  type OcrGuardDecision,
} from "./ocrRequestGuard";

let pass = 0;
let fail = 0;
const failures: string[] = [];
function assert(c: unknown, name: string): void {
  if (c) { pass++; return; }
  fail++; failures.push(name); console.error(`FAIL: ${name}`);
}
function eq(a: unknown, e: unknown, name: string): void {
  const ja = JSON.stringify(a); const je = JSON.stringify(e);
  if (ja === je) { pass++; return; }
  fail++; failures.push(name);
  console.error(`FAIL: ${name}\n  expected: ${je}\n  actual:   ${ja}`);
}

// Test 9: managed over-limit request is REJECTED with code REJECT_MANAGED_DAILY_LIMIT.
{
  const d = evaluateOcrRequest({
    keyClass: "managed", requestedPages: 5, pagesUsedToday: 50, isAuthenticated: true, isPro: false,
  });
  eq(d.decision, "REJECT", "Test 9a: managed @ exactly 50 is REJECT");
  eq(d.code, "REJECT_MANAGED_DAILY_LIMIT", "Test 9b: code is REJECT_MANAGED_DAILY_LIMIT");
  eq(d.remainingPages, 0, "Test 9c: remainingPages = 0");
  eq(d.dailyLimit, 50, "Test 9d: dailyLimit = 50 (FREE 50/day unchanged)");
}

// Test 10: managed request that would push over the cap is REJECTED.
{
  const d = evaluateOcrRequest({
    keyClass: "managed", requestedPages: 10, pagesUsedToday: 45, isAuthenticated: true, isPro: false,
  });
  eq(d.decision, "REJECT", "Test 10a: 45 + 10 > 50 is REJECT");
  eq(d.code, "REJECT_MANAGED_PER_RUN_OVER_DAILY", "Test 10b: code is REJECT_MANAGED_PER_RUN_OVER_DAILY");
  eq(d.remainingPages, 5, "Test 10c: remainingPages = 5 (50 - 45)");
}

// Test 11: managed request within cap is ALLOWED.
{
  const d = evaluateOcrRequest({
    keyClass: "managed", requestedPages: 5, pagesUsedToday: 40, isAuthenticated: true, isPro: false,
  });
  eq(d.decision, "ALLOW", "Test 11a: 40 + 5 <= 50 is ALLOW");
  eq(d.code, "ALLOW", "Test 11b: code is ALLOW");
  eq(d.remainingPages, 5, "Test 11c: remainingPages = 5 after this run");
}

// Test 12: BYOK completely bypasses the guard (even at 50/50).
{
  const d = evaluateOcrRequest({
    keyClass: "byok", requestedPages: 1, pagesUsedToday: 50, isAuthenticated: true, isPro: false,
  });
  eq(d.decision, "ALLOW", "Test 12a: BYOK at 50/50 is ALLOW (caller-owned cost)");
  eq(d.code, "ALLOW", "Test 12b: BYOK code is ALLOW");
}

// Test 13a: Pro plan bypasses the daily cap.
{
  const d = evaluateOcrRequest({
    keyClass: "managed", requestedPages: 100, pagesUsedToday: 0, isAuthenticated: true, isPro: true,
  });
  eq(d.decision, "ALLOW", "Test 13a: Pro ALLOWs large requests");
  eq(d.code, "ALLOW_PRO", "Test 13b: Pro code is ALLOW_PRO");
  eq(d.remainingPages, 999999, "Test 13c: Pro remainingPages = 999999 (matches usage/check.ts)");
}

// Test 13d: unauthenticated + no BYOK -> REJECT (managed path needs an auth'd caller or a user key).
{
  const d = evaluateOcrRequest({
    keyClass: "managed", requestedPages: 1, pagesUsedToday: 0, isAuthenticated: false, isPro: false,
  });
  eq(d.decision, "REJECT", "Test 13d: unauthenticated managed is REJECT");
  eq(d.code, "REJECT_UNAUTHENTICATED_MANAGED_NO_KEYS", "Test 13e: code is REJECT_UNAUTHENTICATED_MANAGED_NO_KEYS");
}

// Test 13f: invalid requestedPages -> REJECT.
{
  const d = evaluateOcrRequest({
    keyClass: "managed", requestedPages: 0, pagesUsedToday: 0, isAuthenticated: true, isPro: false,
  });
  eq(d.decision, "REJECT", "Test 13f: requestedPages=0 is REJECT");
  eq(d.code, "REJECT_INVALID_PAGE_COUNT", "Test 13g: code is REJECT_INVALID_PAGE_COUNT");
}

// Sanity: NaN / undefined requestedPages treated as invalid.
{
  const d = evaluateOcrRequest({
    keyClass: "managed", requestedPages: undefined as unknown as number,
    pagesUsedToday: 0, isAuthenticated: true, isPro: false,
  });
  eq(d.decision, "REJECT", "Sanity: undefined requestedPages is REJECT");
  eq(d.code, "REJECT_INVALID_PAGE_COUNT", "Sanity: code is REJECT_INVALID_PAGE_COUNT");
}

// Server adapter: REJECT returns 429 for over-limit and 401 for unauthenticated.
{
  // import the server adapter at the bottom of the file is fine but avoid a
  // top-of-file import so the test file is also safe under workerd (no DOM).
  // Use a tiny dynamic import-style: require() works in tsx; for the pure
  // test we just exercise the decision shape used by the adapter.
  const overLimit: OcrGuardDecision = evaluateOcrRequest({
    keyClass: "managed", requestedPages: 1, pagesUsedToday: 50, isAuthenticated: true, isPro: false,
  });
  // 429 for over-limit per adapter code
  assert(overLimit.code !== "REJECT_UNAUTHENTICATED_MANAGED_NO_KEYS",
    "Adapter contract: over-limit != unauthenticated -> 429 path");
  const unauth: OcrGuardDecision = evaluateOcrRequest({
    keyClass: "managed", requestedPages: 1, pagesUsedToday: 0, isAuthenticated: false, isPro: false,
  });
  assert(unauth.code === "REJECT_UNAUTHENTICATED_MANAGED_NO_KEYS",
    "Adapter contract: unauthenticated -> 401 path");
}

console.log(`\nPASS ${pass}`);
console.log(`FAIL ${fail}`);
if (fail > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(" - " + f);
  process.exit(1);
}
process.exit(0);

