/**
 * OCR quality evaluator tests.
 * Run with: npx tsx scripts/benchmark/ocr-quality-evaluator.test.ts
 */
import {
  computeCer,
  computeWer,
  classifyResponse,
  normalizeForComparison,
  tokenizeForWer,
  charArray,
  levenshteinDistance,
  applyCanonicalPostProcessing,
  ResponseCategory,
} from "./ocr-quality-evaluator";

let pass = 0, fail = 0; const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; } fail++; failures.push(name); console.error("FAIL: " + name);
}

// 1. CER exact match
assert(computeCer("hello world", "hello world") === 0, "CER = 0 on identical strings");
// 2. CER null when reference is empty
assert(computeCer("", "anything") === null, "CER = null when reference empty");
// 3. CER one-character substitution
{
  const v = computeCer("abc", "axc");
  assert(v !== null && Math.abs(v - 1/3) < 1e-6, "CER = 1/3 on 1-char substitution in 3-char string");
}
// 4. CER with Vietnamese diacritics preserved (NFC)
{
  const ref = "Nguyễn Văn A".normalize("NFC");
  const cand = "Nguyễn Văn A".normalize("NFC");
  assert(computeCer(ref, cand) === 0, "CER preserves Vietnamese NFC diacritics");
}
// 5. CER flags stripped-diacritic mismatch (non-zero)
{
  const ref = "Nguyễn Văn A";
  const cand = "Nguyen Van A";
  const v = computeCer(ref, cand);
  assert(v !== null && v > 0, "CER > 0 when model strips diacritics (Nguyen vs Nguyễn)");
}
// 6. WER identical
assert(computeWer("một hai ba", "một hai ba") === 0, "WER = 0 on identical");
// 7. WER null on empty reference
assert(computeWer("", "anything") === null, "WER null on empty ref");
// 8. WER with Vietnamese word tokens
{
  const w = computeWer("bản án số 12", "bản án số 13");
  assert(w !== null && w > 0, "WER > 0 on 1-word substitution");
}
// 9. WER preserves Vietnamese diacritics
{
  const w = computeWer("Nguyễn", "Nguyen");
  assert(w !== null && w > 0, "WER > 0 when diacritics stripped (Nguyễn vs Nguyen)");
}
// 10. Levenshtein distance classic
assert(levenshteinDistance("kitten", "sitting") === 3, "Levenshtein kitten->sitting = 3");
// 11. charArray uses code points, not UTF-16 units
{
  const a = charArray("Nguyễn");
  // NFC Nguyễn = N g u y e ~ + combining n with a combining mark -> 6 code points
  assert(a.length === 6, "charArray Nguyễn = 6 code points (NFC)");
}
// 12. tokenizeForWer splits whitespace + punctuation
{
  const t = tokenizeForWer("Điều 1, Khoản 2.");
  assert(t.length === 4 && t[0] === "Điều" && t[1] === "1" && t[2] === "Khoản" && t[3] === "2", "tokenize splits Vietnamese legal text");
}
// 13. classifyResponse: empty / 200 OK / malformed
{
  const r1 = classifyResponse({ httpStatus: 200, candidates: [] });
  assert(r1 === "MALFORMED_MODEL_OUTPUT", "200 with no candidates is MALFORMED");
  const r2 = classifyResponse({ httpStatus: null });
  assert(r2 === "GEMINI_FAILURE", "null httpStatus is GEMINI_FAILURE");
  const r3 = classifyResponse({ httpStatus: 200, candidates: [{ content: { parts: [{ text: "hello" }] } }] });
  assert(r3 === "OK", "valid response is OK");
  const r4 = classifyResponse({ httpStatus: 500 });
  assert(r4 === "GEMINI_FAILURE", "HTTP 500 is GEMINI_FAILURE");
}
// 14. applyCanonicalPostProcessing strips AI-intro line
{
  const before = "Dưới đây là văn bản:\nNội dung thật.";
  const after = applyCanonicalPostProcessing(before);
  assert(!after.startsWith("Dưới đây là"), "AI-intro line is stripped");
  assert(after.includes("Nội dung thật"), "body content preserved after intro strip");
}
// 15. normalizeForComparison NFC
{
  const n = normalizeForComparison("Nguyễn");
  assert(n.normalize("NFC") === n, "normalizeForComparison returns NFC");
}

// 16. Metric-layer invariant: computeCer/computeWer do NOT strip workflow-looking content
{
  const ref = "[DRAFT]\nABC";
  const cand = "ABC";
  const cer = computeCer(ref, cand);
  const wer = computeWer(ref, cand);
  // The contaminated reference deliberately bypasses the corpus validator to prove
  // the metric functions treat ALL reference content as reference text (no stripper).
  assert(cer !== null && cer > 0, "CER reflects additional '[DRAFT]' content (no silent stripping)");
  assert(wer !== null && wer > 0, "WER reflects additional '[DRAFT]' token (no silent stripping)");
  // Control: identical reference/candidate must still be 0
  assert(computeCer("ABC", "ABC") === 0, "control: CER = 0 on identical strings");
  assert(computeWer("ABC", "ABC") === 0, "control: WER = 0 on identical strings");
}

console.log("--- ocr-quality-evaluator.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);