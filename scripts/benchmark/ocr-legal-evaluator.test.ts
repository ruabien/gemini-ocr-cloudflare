/**
 * Legal evaluator tests — three-tier + diacritic-sensitive NFC.
 * Run with: npx tsx scripts/benchmark/ocr-legal-evaluator.test.ts
 */
import {
  evaluatePageLegalMetrics,
  evaluateReferenceAnchored,
  evaluateAutoMeasured,
  collectHumanReviewRequired,
  applyInsufficientEvidence,
  stripDiacritics,
  referenceEntityPresent,
} from "./ocr-legal-evaluator";
import type { PageReference } from "./types";

let pass = 0, fail = 0; const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; } fail++; failures.push(name); console.error("FAIL: " + name);
}
function eq(a: unknown, b: unknown, name: string): void {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) { pass++; return; }
  fail++; failures.push(name);
  console.error("FAIL: " + name + " | expected: " + JSON.stringify(b) + " actual: " + JSON.stringify(a));
}

// ASCII-only test data avoids shell encoding issues.
// LEGAL_ARTICLE entities use Vietnamese "Điều" (with diacritics) so the
// Unicode-aware regex actually matches them.
const ref: PageReference = {
  benchmarkPageId: "P001",
  referenceStatus: "REFERENCE_VERIFIED",
  rawText: "Nguyen Van X\nCong ty ABC\n123 Duong Le Loi\nDate: 15/03/2024\nSo: 1234/2024/QD-ST\n150.000.000 dong\nĐiều 1. Quyen khang cao.\nĐiều 2. An phi.\n",
  entities: [
    { kind: "PERSON_NAME", text: "Nguyen Van X" },
    { kind: "ORGANIZATION_NAME", text: "Cong ty ABC" },
    { kind: "ADDRESS", text: "123 Duong Le Loi" },
    { kind: "DATE", text: "15/03/2024" },
    { kind: "DOCUMENT_NUMBER", text: "So: 1234/2024/QD-ST" },
    { kind: "MONEY_AMOUNT", text: "150.000.000 dong" },
    { kind: "LEGAL_ARTICLE", text: "Điều 1" },
    { kind: "LEGAL_ARTICLE", text: "Điều 2" },
  ],
};

// Test 1 — Tier A: REFERENCE_ANCHORED_RECALL for PERSON_NAME
{
  const m = evaluateReferenceAnchored("PERSON_NAME", ref, ref.rawText);
  eq(m.measurementMode, "REFERENCE_ANCHORED_RECALL", "Tier A mode");
  assert(m.exactRecall === 1, "Tier A exactRecall = 1. got " + m.exactRecall);
  assert(m.correct === 1, "Tier A correct = 1. got " + m.correct);
  assert(m.precision === null, "Tier A precision = null. got " + m.precision);
}

// Test 2 — Tier A: missing PERSON_NAME
{
  const m = evaluateReferenceAnchored("PERSON_NAME", ref, "no names here");
  assert(m.exactRecall === 0, "Tier A exactRecall = 0 when missing. got " + m.exactRecall);
  assert(m.missing === 1, "Tier A missing = 1. got " + m.missing);
}

// Test 3 — Tier B: AUTO_MEASURED for DATE
{
  const m = evaluateAutoMeasured("DATE", ref, "Date: 15/03/2024");
  eq(m.measurementMode, "AUTO_MEASURED", "Tier B mode");
  assert(m.recall === 1, "Tier B recall = 1. got " + m.recall);
  assert(m.precision === 1, "Tier B precision = 1. got " + m.precision);
}

// Test 4 — Tier B: missing entity
{
  const m = evaluateAutoMeasured("DATE", ref, "no date here");
  assert(m.recall === 0, "Tier B recall = 0. got " + m.recall);
  assert(m.correct === 0, "Tier B correct = 0. got " + m.correct);
  assert(m.missing === 1, "Tier B missing = 1. got " + m.missing);
}

// Test 5 — Tier B: hallucinated extras flagged
// Note: LEGAL_ARTICLE regex uses Unicode \b (the /u flag) so it works with
// Vietnamese diacritics. Both ref entities and extras use the proper form.
{
  const m = evaluateAutoMeasured("LEGAL_ARTICLE", ref, ref.rawText + " Điều 99. Extra article.\n");
  assert(m.humanReviewRequired === true, "Tier B humanReviewRequired = true. got " + m.humanReviewRequired);
  assert(m.incorrect !== null && m.incorrect > 0, "Tier B incorrect > 0. got " + m.incorrect);
}

// Test 6 — Tier C: collectHumanReviewRequired
{
  const extras = collectHumanReviewRequired(ref, ref.rawText + " EXTRA Điều 99. Mrs. Fake Person.");
  const hasExtra = extras.some((e) => e.kind === "EXTRA_LEGAL_ARTICLE");
  assert(hasExtra, "Tier C: extra LEGAL_ARTICLE. extras=" + JSON.stringify(extras));
}

// Test 7 — INSUFFICIENT_EVIDENCE
{
  const m = evaluateAutoMeasured("LEGAL_ARTICLE", ref, "");
  const applied = applyInsufficientEvidence(m, 0, 1);
  eq(applied.measurementMode, "INSUFFICIENT_EVIDENCE", "applyInsufficientEvidence overrides mode");
  assert(applied.precision === null, "INSUFFICIENT_EVIDENCE precision = null. got " + applied.precision);
  assert(applied.recall === null, "INSUFFICIENT_EVIDENCE recall = null. got " + applied.recall);
}

// Test 8 — evaluatePageLegalMetrics returns all 11 types
{
  const all = evaluatePageLegalMetrics(ref, ref.rawText);
  const types = Object.keys(all);
  for (const t of [
    "PERSON_NAME", "ORGANIZATION_NAME", "ADDRESS",
    "DATE", "DOCUMENT_NUMBER", "MONEY_AMOUNT", "LEGAL_ARTICLE",
    "LEGAL_CLAUSE_POINT", "LAND_PARCEL_NUMBER", "MAP_SHEET_NUMBER", "IDENTIFICATION_NUMBER",
  ]) {
    assert(types.includes(t), "evaluatePageLegalMetrics includes " + t);
  }
}

// Test 9 — stripDiacritics normalization (ASCII test)
{
  const s = stripDiacritics("Nguyen Van X");
  assert(s === "nguyen van x", "stripDiacritics ASCII. got '" + s + "'");
}

// Test 10 — referenceEntityPresent
{
  assert(referenceEntityPresent("Nguyen Van X", "Nguyen Van X"), "referenceEntityPresent exact");
  assert(!referenceEntityPresent("Nguyen Van X", "Tran Thi Y"), "referenceEntityPresent none");
}

console.log("--- ocr-legal-evaluator.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);