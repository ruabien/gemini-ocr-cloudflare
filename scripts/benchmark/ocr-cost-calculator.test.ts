/**
 * OCR cost calculator tests.
 * Run with: npx tsx scripts/benchmark/ocr-cost-calculator.test.ts
 */
import {
  validatePricing,
  computeRowCost,
  sumCost,
  scaleCost,
} from "./ocr-cost-calculator";
import type { BenchmarkPricing, PerPageRow } from "./types";

let pass = 0, fail = 0; const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; } fail++; failures.push(name); console.error("FAIL: " + name);
}

function makePricing(overrides: Partial<BenchmarkPricing> = {}): BenchmarkPricing {
  return {
    schemaVersion: "1.0",
    asOf: new Date().toISOString(),
    source: "https://example.test",
    usdToVnd: 25000,
    models: {
      "gemini-2.5-flash": { inputPricePerMillionTokens: 0.075, outputPricePerMillionTokens: 0.3, currency: "USD" },
      "gemini-2.5-flash-lite": { inputPricePerMillionTokens: 0.0375, outputPricePerMillionTokens: 0.15, currency: "USD" },
    },
    ...overrides,
  };
}

function makeRow(overrides: Partial<PerPageRow> = {}): PerPageRow {
  return {
    runId: "r1", phase: "initial", benchmarkPageId: "p1", model: "gemini-2.5-flash",
    runNumber: 1, category: "CLEAN_JUDGMENT", difficulty: "easy", referenceStatus: "REFERENCE_VERIFIED",
    outcome: "OK", success: true, failureCategory: null, fallbackUsed: false, fallbackProvider: null,
    promptTokens: 1000, candidatesTokens: 500, totalTokens: 1500, cachedContentTokenCount: 0,
    thoughtsTokenCount: 0, latencyMs: 1000, httpStatus: 200, errorCategory: null,
    keyIndex: 0, attempt: 1, CER: 0, WER: 0, legalCriticalMetrics: {}, humanReviewRequired: [],
    layoutObservations: {}, costPerPage: { inputUSD: null, outputUSD: null, totalUSD: null, totalVND: null },
    ...overrides,
  };
}

// Test 1 — fresh pricing valid
{
  const r = validatePricing(makePricing());
  assert(r.ok, "fresh pricing validates OK");
  assert(!r.errors.includes("PRICING_STALE"), "no PRICING_STALE for fresh pricing");
}

// Test 2 — stale pricing (>30 days) produces PRICING_STALE
{
  const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const r = validatePricing(makePricing({ asOf: old }));
  assert(r.errors.includes("PRICING_STALE"), "60-day-old pricing is PRICING_STALE");
}

// Test 3 — invalid asOf
{
  const r = validatePricing(makePricing({ asOf: "not-a-date" }));
  assert(r.errors.includes("PRICING_STALE"), "invalid asOf -> PRICING_STALE");
}

// Test 4 — negative values
{
  const r = validatePricing(makePricing({
    models: { "gemini-2.5-flash": { inputPricePerMillionTokens: -1, outputPricePerMillionTokens: 0.3, currency: "USD" } },
  }));
  assert(r.errors.includes("NEGATIVE_VALUES"), "negative inputPrice -> NEGATIVE_VALUES");
}

// Test 5 — missing pricing
{
  const r = validatePricing(null);
  assert(!r.ok && r.errors.includes("PRICING_MISSING"), "null -> PRICING_MISSING");
}

// Test 6 — invalid usdToVnd
{
  const r = validatePricing(makePricing({ usdToVnd: 0 }));
  assert(r.errors.includes("INVALID_USD_TO_VND"), "usdToVnd=0 -> INVALID_USD_TO_VND");
}

// Test 7 — computeRowCost: USD math
{
  const p = makePricing();
  const row = makeRow({ promptTokens: 1_000_000, candidatesTokens: 1_000_000 });
  const c = computeRowCost(row, p);
  // input = 1M * 0.075 = 0.075; output = 1M * 0.3 = 0.3; total = 0.375
  assert(c.totalUSD !== null && Math.abs(c.totalUSD - 0.375) < 1e-9, "computeRowCost USD math");
  assert(c.totalVND !== null && Math.abs(c.totalVND - 0.375 * 25000) < 1e-6, "computeRowCost VND math");
}

// Test 8 — unknown model returns nulls
{
  const c = computeRowCost(makeRow({ model: "unknown" }), makePricing());
  assert(c.totalUSD === null && c.totalVND === null, "unknown model -> null costs");
}

// Test 9 — sumCost
{
  const s = sumCost([
    { inputUSD: 0.05, outputUSD: 0.1, totalUSD: 0.15, totalVND: 150 * 25000 },
    { inputUSD: 0.025, outputUSD: 0.05, totalUSD: 0.075, totalVND: 75 * 25000 },
  ]);
  assert(s.totalUSD !== null && Math.abs(s.totalUSD - 0.225) < 1e-9, "sumCost USD");
}

// Test 10 — scaleCost
{
  const s = scaleCost({ inputUSD: 1, outputUSD: 1, totalUSD: 1, totalVND: 25000 }, 100);
  assert(s.totalUSD === 100, "scaleCost x100");
}

console.log("--- ocr-cost-calculator.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);