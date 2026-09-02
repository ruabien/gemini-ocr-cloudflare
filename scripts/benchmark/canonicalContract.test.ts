/**
 * Canonical contract DRIFT GUARD.
 * Run with: npx tsx scripts/benchmark/canonicalContract.test.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_ENDPOINT,
  CANONICAL_PROMPT_INITIAL,
  CANONICAL_GENERATION_CONFIG,
  CANONICAL_SAFETY_SETTINGS,
  CANONICAL_MAX_TRANSIENT_RETRIES,
  CANONICAL_TRANSIENT_DELAY_BASE_MS,
  CANONICAL_RATE_LIMIT_MAX_RETRIES,
  CANONICAL_RATE_LIMIT_DELAY_BASE_MS,
} from "./canonicalContract";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const OCR_SCANNER_PATH = join(__dirname, "..", "..", "src", "components", "OcrScanner.tsx");
let ocrScannerSource = "";
try { ocrScannerSource = readFileSync(OCR_SCANNER_PATH, "utf8"); } catch (e) {
  throw new Error("Could not read OcrScanner.tsx: " + (e as Error).message);
}

let pass = 0, fail = 0; const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; } fail++; failures.push(name); console.error("FAIL: " + name);
}
function assertContains(needle: string, label: string): void {
  assert(ocrScannerSource.includes(needle), "byte-equal: " + label);
}

// Test 1 - PRIMARY prompt
assertContains(CANONICAL_PROMPT_INITIAL, "CANONICAL_PROMPT_INITIAL in OcrScanner.tsx");
// Test 2 - recitation retry prefix (split between two source strings)
assertContains("Chỉ trích xuất văn bản nhìn thấy trong hình ảnh/tài liệu.", "recitation VN part");
assertContains("Only extract visible text from the provided image/document.", "recitation EN part");
// Test 3 - generationConfig
assertContains("\"temperature\": " + CANONICAL_GENERATION_CONFIG.temperature, "temperature: 0.0");
assertContains("\"topP\": " + CANONICAL_GENERATION_CONFIG.topP, "topP: 0.95");
assertContains("\"candidateCount\": " + CANONICAL_GENERATION_CONFIG.candidateCount, "candidateCount: 1");
// Test 4 - all four BLOCK_NONE safety settings
for (const s of CANONICAL_SAFETY_SETTINGS) {
  assertContains(s.category, "category: " + s.category);
  assertContains("BLOCK_NONE", "BLOCK_NONE for " + s.category);
}
// Test 5 - AI-intro strip regex
assertContains("/^(Dưới đây là|Văn bản đã được|Kết quả|Đây là văn bản)/i", "CANONICAL_AI_INTRO_REGEX");
// Test 6 - no systemInstruction in benchmark config
assert(!CANONICAL_GENERATION_CONFIG.toString().includes("systemInstruction"), "no systemInstruction");
// Test 7 - endpoint family (production uses template literal)
assertContains("generativelanguage.googleapis.com/v1/models/${selectedModel}:generateContent", "endpoint v1 family");
// Test 8 - retry budget constants
assert(CANONICAL_TRANSIENT_DELAY_BASE_MS === 2500, "transientDelayBaseMs = 2500");
assert(CANONICAL_RATE_LIMIT_DELAY_BASE_MS === 2500, "rateLimitDelayBaseMs = 2500");
assert(CANONICAL_MAX_TRANSIENT_RETRIES >= 1, "maxTransientRetries >= 1");
assert(CANONICAL_RATE_LIMIT_MAX_RETRIES >= 1, "rateLimitMaxRetries >= 1");

console.log("--- canonicalContract.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);