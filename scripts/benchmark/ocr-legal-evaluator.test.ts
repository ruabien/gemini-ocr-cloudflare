/**
 * Legal evaluator tests — three-tier + diacritic-sensitive NFC (authoritative).
 * Run with: npx tsx scripts/benchmark/ocr-legal-evaluator.test.ts
 *
 * CORRECTION (PHASE A+B blocker): Authoritative legal-critical matching is
 * now DIACRITIC-SENSITIVE. Vietnamese diacritics are preserved. Two strings
 * that differ only in the presence of diacritics (e.g. "Nguyễn" vs "Nguyen")
 * are NOT considered equal by any authoritative function.
 *
 *  - Tier A (PERSON_NAME / ORG / ADDRESS)  -> referenceEntityPresent + normalizeForAuthoritativeMatch
 *  - Tier B (auto-measured)                 -> evaluateAutoMeasured via normalizeForAuthoritativeMatch
 *  - Tier C (human-review extras)           -> collectHumanReviewRequired via normalizeForAuthoritativeMatch
 *
 *  - Non-authoritative DIAGNOSTIC only:     -> stripDiacritics + diagnosticDiacriticInsensitiveMatch
 *
 * This file uses Unicode escape sequences (\uXXXX) for non-ASCII Vietnamese
 * test data to avoid shell-encoding issues. At runtime, JS interprets the
 * escapes to real diacritic-bearing characters.
 */
import {
  evaluatePageLegalMetrics,
  evaluateReferenceAnchored,
  evaluateAutoMeasured,
  collectHumanReviewRequired,
  applyInsufficientEvidence,
  stripDiacritics,
  referenceEntityPresent,
  normalizeForAuthoritativeMatch,
  diagnosticDiacriticInsensitiveMatch,
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

// Vietnamese strings (via Unicode escapes).
// "Nguyễn Văn X", "Công ty Hòa Bình", "Đường Nguyễn Tất Thành"
const NGUYEN_VAN_X     = "Nguy\u1ec5n V\u0103n X";
const NGUYEN_VAN_X_ASC = "Nguyen Van X";
const CONG_TY_HOA_BINH = "C\u00f4ng ty H\u00f2a B\u00ecnh";
const CONG_TY_ASC      = "Cong ty Hoa Binh";
const DUONG_NTT        = "\u0110\u01b0\u1eddng Nguy\u1ec5n T\u1ea5t Th\u00e0nh";
const DUONG_NTT_ASC    = "Duong Nguyen Tat Thanh";

// Build a small ref that uses VIETNAMESE-with-diacritics forms, so the Tier A
// authoritative test (case 1) actually exercises diacritic-preservation.
const refVn: PageReference = {
  benchmarkPageId: "P001",
  referenceStatus: "REFERENCE_VERIFIED",
  rawText:
    NGUYEN_VAN_X + "\n" +
    CONG_TY_HOA_BINH + "\n" +
    DUONG_NTT + "\n" +
    "Date: 15/03/2024\n" +
    "So: 1234/2024/QD-ST\n" +
    "150.000.000 dong\n" +
    "\u0110i\u1ec1u 1. Quyen khang cao.\n" +
    "\u0110i\u1ec1u 2. An phi.\n",
  entities: [
    { kind: "PERSON_NAME", text: NGUYEN_VAN_X },
    { kind: "ORGANIZATION_NAME", text: CONG_TY_HOA_BINH },
    { kind: "ADDRESS", text: DUONG_NTT },
    { kind: "DATE", text: "15/03/2024" },
    { kind: "DOCUMENT_NUMBER", text: "So: 1234/2024/QD-ST" },
    { kind: "MONEY_AMOUNT", text: "150.000.000 dong" },
    { kind: "LEGAL_ARTICLE", text: "\u0110i\u1ec1u 1" },
    { kind: "LEGAL_ARTICLE", text: "\u0110i\u1ec1u 2" },
  ],
};

// ── Mandatory diacritic-sensitive authoritative tests ────────────

// Mandatory 1: Reference "Nguyễn Văn X" present in OCR "Nguyễn Văn X" → TRUE
{
  const m = evaluateReferenceAnchored("PERSON_NAME", refVn, NGUYEN_VAN_X);
  assert(m.exactRecall === 1, "Mandatory 1: PERSON_NAME 'Nguyễn Văn X' present in 'Nguyễn Văn X' → exactRecall=1. got " + m.exactRecall);
  assert(m.correct === 1, "Mandatory 1: correct=1. got " + m.correct);
  assert(m.missing === 0, "Mandatory 1: missing=0. got " + m.missing);
}

// Mandatory 2: Reference "Nguyễn Văn X" NOT present in OCR "Nguyen Van X" → FALSE
{
  const m = evaluateReferenceAnchored("PERSON_NAME", refVn, NGUYEN_VAN_X_ASC);
  assert(m.exactRecall === 0, "Mandatory 2: PERSON_NAME 'Nguyễn Văn X' NOT present in 'Nguyen Van X' → exactRecall=0. got " + m.exactRecall);
  assert(m.correct === 0, "Mandatory 2: correct=0. got " + m.correct);
  assert(m.missing === 1, "Mandatory 2: missing=1. got " + m.missing);
}


// Mandatory 4: Reference "Đường Nguyễn Tất Thành" NOT present in OCR "Duong Nguyen Tat Thanh" → FALSE
{
  const m = evaluateReferenceAnchored("ADDRESS", refVn, DUONG_NTT_ASC);
  assert(m.exactRecall === 0, "Mandatory 4: ADDRESS 'Đường Nguyễn Tất Thành' NOT present in 'Duong Nguyen Tat Thanh' → exactRecall=0. got " + m.exactRecall);
  assert(m.missing === 1, "Mandatory 4: missing=1. got " + m.missing);
}

// Mandatory 5: Canonically equivalent Unicode (NFD vs NFC) → match = TRUE
{
  // NFC: "Nguyễn" = U+004E U+0067 U+0075 U+0079 U+1EC5 (precomposed ễ)
  const nfc = "Nguy\u1ec5n V\u0103n X";
  // NFD: "Nguyễn" = N g u y e + U+0302 (combining circumflex) + U+0303 (combining tilde) n
  //      "Văn"   = V a + U+0306 (combining breve) n
  const nfd = "Nguye\u0302\u0303n Va\u0306n X";
  const a = normalizeForAuthoritativeMatch(nfc);
  const b = normalizeForAuthoritativeMatch(nfd);
  eq(a, b, "Mandatory 5: NFC and NFD Vietnamese strings equalize under authoritative NFC normalization");
  const m = evaluateReferenceAnchored("PERSON_NAME", { ...refVn, entities: [{ kind: "PERSON_NAME", text: nfc }] }, nfd);
  assert(m.exactRecall === 1, "Mandatory 5: NFD Vietnamese ref matches NFC ref → exactRecall=1. got " + m.exactRecall);
}

// Mandatory 6: Whitespace-only normalization difference → may match = TRUE
{
  const refA: PageReference = {
    benchmarkPageId: "P002",
    referenceStatus: "REFERENCE_VERIFIED",
    rawText: NGUYEN_VAN_X,
    entities: [{ kind: "PERSON_NAME", text: NGUYEN_VAN_X }],
  };
  const m = evaluateReferenceAnchored("PERSON_NAME", refA, "Nguy\u1ec5n   V\u0103n   X");
  assert(m.exactRecall === 1, "Mandatory 6: whitespace-only difference matches → exactRecall=1. got " + m.exactRecall);
  assert(m.correct === 1, "Mandatory 6: correct=1. got " + m.correct);
}

// ── Diagnostic-only: diacritic-insensitive containment still works ──
{
  assert(diagnosticDiacriticInsensitiveMatch(NGUYEN_VAN_X, NGUYEN_VAN_X_ASC) === true, "Diagnostic: 'Nguyễn Văn X' diag-matches 'Nguyen Van X' (informational only)");
  assert(diagnosticDiacriticInsensitiveMatch(CONG_TY_HOA_BINH, CONG_TY_ASC) === true, "Diagnostic: 'Công ty Hòa Bình' diag-matches 'Cong ty Hoa Binh'");
}

// ── Diagnostic MUST NOT affect authoritative metrics ──────────────
// If someone refactors evaluateReferenceAnchored to call stripDiacritics
// by accident, this test will detect it: authoritative exactRecall stays
// diacritic-sensitive (false) for ASCII-only text when the ref has diacritics.
{
  const refA: PageReference = {
    benchmarkPageId: "P003",
    referenceStatus: "REFERENCE_VERIFIED",
    rawText: NGUYEN_VAN_X,
    entities: [{ kind: "PERSON_NAME", text: NGUYEN_VAN_X }],
  };

// ── Three-tier contract: Tier A, Tier B, Tier C ──────────────────

// Tier A: REFERENCE_ANCHORED_RECALL — only exactRecall reported, precision null
{
  const refA: PageReference = {
    benchmarkPageId: "P004",
    referenceStatus: "REFERENCE_VERIFIED",
    rawText: NGUYEN_VAN_X + " and " + NGUYEN_VAN_X,
    entities: [{ kind: "PERSON_NAME", text: NGUYEN_VAN_X }],
  };
  const m = evaluateReferenceAnchored("PERSON_NAME", refA, NGUYEN_VAN_X);
  eq(m.measurementMode, "REFERENCE_ANCHORED_RECALL", "Tier A mode");
  assert(m.exactRecall === 1, "Tier A exactRecall = 1 when present. got " + m.exactRecall);
  assert(m.precision === null, "Tier A precision = null. got " + m.precision);
  assert(m.recall === null, "Tier A recall = null. got " + m.recall);
  assert(m.f1 === null, "Tier A f1 = null. got " + m.f1);
}

// Tier A: missing entity
{
  const refA: PageReference = {
    benchmarkPageId: "P005",
    referenceStatus: "REFERENCE_VERIFIED",
    rawText: NGUYEN_VAN_X,
    entities: [{ kind: "PERSON_NAME", text: NGUYEN_VAN_X }],
  };
  const m = evaluateReferenceAnchored("PERSON_NAME", refA, "no names here");
  assert(m.exactRecall === 0, "Tier A exactRecall = 0 when missing. got " + m.exactRecall);
  assert(m.missing === 1, "Tier A missing = 1. got " + m.missing);
}

// Tier B: AUTO_MEASURED for DATE — deterministic regex, no diacritics involved
{
  const m = evaluateAutoMeasured("DATE", refVn, "Date: 15/03/2024");
  eq(m.measurementMode, "AUTO_MEASURED", "Tier B mode");
  assert(m.recall === 1, "Tier B recall = 1. got " + m.recall);
  assert(m.precision === 1, "Tier B precision = 1. got " + m.precision);
}

// Tier B: missing entity
{
  const m = evaluateAutoMeasured("DATE", refVn, "no date here");
  assert(m.recall === 0, "Tier B recall = 0. got " + m.recall);
  assert(m.correct === 0, "Tier B correct = 0. got " + m.correct);
  assert(m.missing === 1, "Tier B missing = 1. got " + m.missing);
}

// Tier B: LEGAL_ARTICLE — diacritic-sensitive extras detection (ref has 2, model has 3)
{
  const m = evaluateAutoMeasured("LEGAL_ARTICLE", refVn, refVn.rawText + " \u0110i\u1ec1u 99. Extra article.\n");
  assert(m.humanReviewRequired === true, "Tier B humanReviewRequired = true on extras. got " + m.humanReviewRequired);
  assert(m.incorrect !== null && m.incorrect > 0, "Tier B incorrect > 0 on extras. got " + m.incorrect);
}

// Tier B: LEGAL_ARTICLE — diacritic-stripped OCR ("Dieu 99") is NOT considered
// a true match against the authoritative NFC ref "Điều 99". This proves
// Tier B matching is diacritic-sensitive too.
{
  const refA: PageReference = {
    benchmarkPageId: "P006",
    referenceStatus: "REFERENCE_VERIFIED",
    rawText: "\u0110i\u1ec1u 99",
    entities: [{ kind: "LEGAL_ARTICLE", text: "\u0110i\u1ec1u 99" }],
  };

// Tier C: collectHumanReviewRequired — an ASCII ref entity "Dieu 99" must NOT
// absorb a properly-diacritic OCR candidate "Điều 99" under the authoritative
// diacritic-sensitive contract → the candidate is flagged as EXTRA_LEGAL_ARTICLE.
{
  const refA: PageReference = {
    benchmarkPageId: "P007",
    referenceStatus: "REFERENCE_VERIFIED",
    rawText: "Dieu 99",
    entities: [{ kind: "LEGAL_ARTICLE", text: "Dieu 99" }],
  };
  const extras = collectHumanReviewRequired(refA, "\u0110i\u1ec1u 99");
  const has = extras.some((e) => e.kind === "EXTRA_LEGAL_ARTICLE");
  assert(has, "Tier C diacritic-sensitive: ref 'Dieu 99' (ASCII) + OCR 'Điều 99' (diacritic) → EXTRA_LEGAL_ARTICLE, not a match. extras=" + JSON.stringify(extras));
}

// Tier C: collectHumanReviewRequired — genuine extra "Điều 99" is still flagged
{
  const extras = collectHumanReviewRequired(refVn, refVn.rawText + " EXTRA \u0110i\u1ec1u 99.");
  const hasExtra = extras.some((e) => e.kind === "EXTRA_LEGAL_ARTICLE");
  assert(hasExtra, "Tier C: extra LEGAL_ARTICLE (with diacritics). extras=" + JSON.stringify(extras));
}

// INSUFFICIENT_EVIDENCE
{
  const m = evaluateAutoMeasured("LEGAL_ARTICLE", refVn, "");
  const applied = applyInsufficientEvidence(m, 0, 1);
  eq(applied.measurementMode, "INSUFFICIENT_EVIDENCE", "applyInsufficientEvidence overrides mode");
  assert(applied.precision === null, "INSUFFICIENT_EVIDENCE precision = null. got " + applied.precision);
  assert(applied.recall === null, "INSUFFICIENT_EVIDENCE recall = null. got " + applied.recall);
}

// evaluatePageLegalMetrics returns all 11 types
{
  const all = evaluatePageLegalMetrics(refVn, refVn.rawText);
  const types = Object.keys(all);
  for (const t of [
    "PERSON_NAME", "ORGANIZATION_NAME", "ADDRESS",
    "DATE", "DOCUMENT_NUMBER", "MONEY_AMOUNT", "LEGAL_ARTICLE",
    "LEGAL_CLAUSE_POINT", "LAND_PARCEL_NUMBER", "MAP_SHEET_NUMBER", "IDENTIFICATION_NUMBER",
  ]) {
    assert(types.includes(t), "evaluatePageLegalMetrics includes " + t);
  }
}

// stripDiacritics helper still exists and is non-authoritative
{
  const s = stripDiacritics("Nguyen Van X");
  assert(s === "nguyen van x", "stripDiacritics ASCII. got '" + s + "'");
  const s2 = stripDiacritics(NGUYEN_VAN_X);
  assert(s2 === "nguyen van x", "stripDiacritics Vietnamese. got '" + s2 + "'");
}

// referenceEntityPresent: diacritic-sensitive
{
  assert(referenceEntityPresent(NGUYEN_VAN_X, NGUYEN_VAN_X) === true, "refEntityPresent: 'Nguyễn Văn X' present in 'Nguyễn Văn X'");
  assert(referenceEntityPresent(NGUYEN_VAN_X, NGUYEN_VAN_X_ASC) === false, "refEntityPresent: 'Nguyen Van X' NOT present in 'Nguyễn Văn X' (diacritic-sensitive)");
  assert(referenceEntityPresent("Tran Thi Y", NGUYEN_VAN_X) === false, "refEntityPresent: 'Nguyễn Văn X' NOT present in unrelated text");
}

console.log("--- ocr-legal-evaluator.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);

  const m = evaluateAutoMeasured("LEGAL_ARTICLE", refA, "Dieu 99");
  assert(m.recall === 0, "Tier B diacritic-sensitive: ASCII 'Dieu 99' does NOT match ref 'Điều 99' → recall=0. got " + m.recall);
  assert(m.missing === 1, "Tier B diacritic-sensitive: missing=1. got " + m.missing);
}

  const m = evaluateReferenceAnchored("PERSON_NAME", refA, NGUYEN_VAN_X_ASC);
  assert(m.exactRecall === 0, "Diagnostic-isolation: ref with diacritics vs ASCII OCR → exactRecall=0 (not 1). got " + m.exactRecall);
}

// Mandatory 3: Reference "Công ty Hòa Bình" NOT present in OCR "Cong ty Hoa Binh" → FALSE
{
  const m = evaluateReferenceAnchored("ORGANIZATION_NAME", refVn, CONG_TY_ASC);
  assert(m.exactRecall === 0, "Mandatory 3: ORG 'Công ty Hòa Bình' NOT present in 'Cong ty Hoa Binh' → exactRecall=0. got " + m.exactRecall);
  assert(m.missing === 1, "Mandatory 3: missing=1. got " + m.missing);
}
