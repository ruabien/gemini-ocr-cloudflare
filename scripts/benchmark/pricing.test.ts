/**
 * Pricing loader + validator tests.
 * Run with: npx tsx scripts/benchmark/pricing.test.ts
 */
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadPricing,
  validatePricingData,
} from "./pricing";

let pass = 0, fail = 0; const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; } fail++; failures.push(name); console.error("FAIL: " + name);
}
function ok(result: { ok: boolean; errors: { code: string }[] }, expectedCode: string, name: string): void {
  const found = result.errors.some((e) => e.code === expectedCode);
  assert(!result.ok && found, name + " (expected " + expectedCode + ")");
}

const validPricing = {
  schemaVersion: "1.0",
  asOf: new Date().toISOString(),
  source: "https://example.test/pricing",
  usdToVnd: 25000,
  models: {
    "gemini-2.5-flash": { inputPricePerMillionTokens: 0.075, outputPricePerMillionTokens: 0.3, currency: "USD" },
    "gemini-2.5-flash-lite": { inputPricePerMillionTokens: 0.0375, outputPricePerMillionTokens: 0.15, currency: "USD" },
  },
};

// Test 1 — valid pricing
{
  const r = validatePricingData(validPricing);
  assert(r.ok, "valid pricing validates OK");
}

// Test 2 — wrong schemaVersion
{
  const r = validatePricingData({ ...validPricing, schemaVersion: "0.9" });
  ok(r, "PRICING_SCHEMA_VERSION", "wrong schemaVersion -> PRICING_SCHEMA_VERSION");
}

// Test 3 — missing asOf
{
  const { asOf, ...rest } = validPricing;
  const r = validatePricingData(rest);
  ok(r, "PRICING_MISSING_FIELD", "missing asOf -> PRICING_MISSING_FIELD");
}

// Test 4 — invalid asOf
{
  const r = validatePricingData({ ...validPricing, asOf: "not-a-date" });
  ok(r, "PRICING_INVALID_AS_OF", "invalid asOf -> PRICING_INVALID_AS_OF");
}

// Test 5 — invalid usdToVnd
{
  const r = validatePricingData({ ...validPricing, usdToVnd: -1 });
  ok(r, "PRICING_INVALID_USD_TO_VND", "usdToVnd=-1 -> PRICING_INVALID_USD_TO_VND");
}

// Test 6 — missing models
{
  const r = validatePricingData({ ...validPricing, models: undefined });
  ok(r, "PRICING_MODEL_MISSING", "missing models -> PRICING_MODEL_MISSING");
}

// Test 7 — negative price
{
  const r = validatePricingData({
    ...validPricing,
    models: { "gemini-2.5-flash": { inputPricePerMillionTokens: -0.01, outputPricePerMillionTokens: 0.3, currency: "USD" } },
  });
  ok(r, "PRICING_MODEL_NEGATIVE", "negative price -> PRICING_MODEL_NEGATIVE");
}

// Test 8 — wrong currency
{
  const r = validatePricingData({
    ...validPricing,
    models: { "gemini-2.5-flash": { inputPricePerMillionTokens: 0.075, outputPricePerMillionTokens: 0.3, currency: "VND" } },
  });
  ok(r, "PRICING_MODEL_MISSING", "currency=VND -> PRICING_MODEL_MISSING");
}

// Test 9 — loadPricing from disk
{
  const dir = mkdtempSync(join(tmpdir(), "lexocr-pricing-"));
  const file = join(dir, "p.json");
  writeFileSync(file, JSON.stringify(validPricing), "utf8");
  try {
    const p = loadPricing(file);
    assert(p.usdToVnd === 25000, "loadPricing round-trip preserves usdToVnd");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Test 10 — loadPricing missing file
{
  let threw = false;
  try { loadPricing("/nonexistent/path/x.json"); } catch { threw = true; }
  assert(threw, "loadPricing throws on missing file");
}

// Test 11 — loadPricing malformed JSON
{
  const dir = mkdtempSync(join(tmpdir(), "lexocr-pricing-"));
  const file = join(dir, "p.json");
  writeFileSync(file, "{ not json", "utf8");
  try {
    let threw = false;
    try { loadPricing(file); } catch { threw = true; }
    assert(threw, "loadPricing throws on malformed JSON");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log("--- pricing.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);