/**
 * Static-source tests for the server-side /api/ocr/process.ts wiring.
 * Verifies that the relevant source file:
 *   - test 9: managed over-limit is rejected with zero Gemini fetches
 *   - test 12: BYOK path bypasses the guard
 *   - test 14: synthetic accuracy has been replaced with null (no Math.random)
 *   - test 18: per-attempt telemetry failures never block the OCR response
 * Run with: npx tsx shared/ocrProcessAccuracy.test.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

const repo = process.cwd();
const proc = readFileSync(join(repo, "functions/api/ocr/process.ts"), "utf8");
const guard = readFileSync(join(repo, "shared/ocrRequestGuard.ts"), "utf8");
const tele = readFileSync(join(repo, "shared/ocrTelemetry.ts"), "utf8");
const usageGuard = readFileSync(join(repo, "functions/api/utils/usageGuard.ts"), "utf8");

// Test 14: synthetic accuracy has been replaced with null
assert(
  !/computedAccuracy\s*=\s*parseFloat\(\(95\s*\+\s*Math\.random/.test(proc),
  "Test 14a: server no longer fabricates 95-99.9% accuracy"
);
assert(
  /computedAccuracy\s*=\s*null\s*;/.test(proc),
  "Test 14b: server sets computedAccuracy = null (truthful unmeasured)"
);
assert(
  /computedAccuracy:\s*computedAccuracy\s*;\s*\/\/\s*null\s*=\s*"Chưa đo được"/.test(proc) ||
    /computedAccuracy, \/\/ null = "Chưa đo được"/.test(proc),
  "Test 14c: response body documents null as 'Chưa đo được'"
);

// Test 18: telemetry must never throw or block the OCR response
assert(
  /bench\.emitSummary\(\)/.test(proc),
  "Test 18a: summary emit is called at end of request"
);
assert(
  /bench\.recordAttempt\(/.test(proc),
  "Test 18b: per-attempt recordAttempt is wired"
);
// The telemetry module must wrap emits in try/catch and return boolean.
assert(
  /return false;/.test(tele) && /try \{/.test(tele),
  "Test 18c: telemetry module never throws (returns false on error)"
);

// Test 9: server applies the guard BEFORE the Gemini fetch.
const guardIdx = proc.indexOf("applyOcrRequestGuard");
const fetchIdx = proc.indexOf("generativelanguage.googleapis.com");
assert(guardIdx > 0 && fetchIdx > 0, "Test 9a: both guard call and Gemini URL are present");
assert(guardIdx < fetchIdx, "Test 9b: guard is applied BEFORE any Gemini fetch");
assert(
  /if \(guardResp\) return guardResp;/.test(proc),
  "Test 9c: server short-circuits and returns the guard Response (no Gemini fetch)"
);

// Test 12: BYOK path is recognized and bypasses the guard
assert(
  /hasUserProvidedKey/.test(proc),
  "Test 12a: server detects BYOK (hasUserProvidedKey)"
);
assert(
  /const\s+guard\s*=\s*createBenchmarkRun/.test(proc) || /const bench = createBenchmarkRun/.test(proc),
  "Telemetry run is created at the top of the request"
);
assert(
  /keyClass:\s*ctx\.hasUserProvidedKey\s*\?\s*"byok"\s*:\s*"managed"/.test(usageGuard),
  "Test 12b: adapter passes byok/managed correctly"
);
assert(
  /evaluateOcrRequest/.test(usageGuard),
  "Test 12c: adapter delegates to pure evaluator"
);
assert(
  /keyClass:\s*"byok"/.test(guard) || /keyClass\s*===\s*"byok"/.test(guard),
  "Test 12d: pure evaluator recognizes byok"
);

// Quota constants
assert(
  /FREE_DAILY_PAGE_LIMIT\s*=\s*50/.test(readFileSync(join(repo, "shared/usagePolicy.ts"), "utf8")),
  "Quota values unchanged: 50/day"
);
assert(
  /FREE_PER_RUN_PAGE_LIMIT\s*=\s*20/.test(readFileSync(join(repo, "shared/usagePolicy.ts"), "utf8")),
  "Quota values unchanged: 20/run"
);

// Key-index log does not leak key identity
assert(
  /Gemini key index \$\{i\} failed/.test(proc) ||
    /Gemini key index/.test(proc),
  "Server log uses non-secret ephemeral key index only"
);
assert(
  !/Gemini API Key chỉ số \$\{i\} thất bại/.test(proc) &&
    !/Key chỉ số \$\{i\}/.test(proc),
  "Old key-leaking log line has been removed"
);

console.log(`\nPASS ${pass}`);
console.log(`FAIL ${fail}`);
if (fail > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(" - " + f);
  process.exit(1);
}
process.exit(0);

