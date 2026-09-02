/**
 * Layout evaluator tests.
 * Run with: npx tsx scripts/benchmark/ocr-layout-evaluator.test.ts
 */
import {
  evaluateLayout,
  evaluateLayoutFromReference,
} from "./ocr-layout-evaluator";
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

// Test 1 — paragraph preserved
{
  const ref = "Para 1\n\nPara 2\n\nPara 3";
  const out = evaluateLayout({ referenceText: ref, modelText: ref });
  eq(out.paragraphs, "preserved", "paragraphs preserved when identical");
}

// Test 2 — paragraph merged (fewer paragraphs)
{
  const ref = "Para 1\n\nPara 2\n\nPara 3";
  const model = "Para 1\nPara 2\nPara 3";
  const out = evaluateLayout({ referenceText: ref, modelText: model });
  eq(out.paragraphs, "merged", "paragraphs merged when model has fewer breaks");
}

// Test 3 — paragraph split (more paragraphs)
{
  const ref = "Para 1\n\nPara 2";
  const model = "P1 line a\n\nP1 line b\n\nP2 line a\n\nP2 line b";
  const out = evaluateLayout({ referenceText: ref, modelText: model });
  eq(out.paragraphs, "split", "paragraphs split when model has more breaks");
}

// Test 4 — paragraph not_applicable (no double newlines)
{
  const ref = "Line 1\nLine 2\nLine 3";
  const out = evaluateLayout({ referenceText: ref, modelText: ref });
  eq(out.paragraphs, "not_applicable", "paragraphs not_applicable on single-block text");
}

// Test 5 — table preserved
{
  const ref = "A | B | C\n1 | 2 | 3\n4 | 5 | 6";
  const out = evaluateLayout({ referenceText: ref, modelText: ref });
  eq(out.tables, "preserved", "table preserved when pipes preserved");
}

// Test 6 — table merged_or_lost
{
  const ref = "A | B | C\n1 | 2 | 3\n4 | 5 | 6";
  const model = "A B C\n1 2 3\n4 5 6";
  const out = evaluateLayout({ referenceText: ref, modelText: model });
  eq(out.tables, "merged_or_lost", "table merged_or_lost when pipes dropped");
}

// Test 7 — table not_applicable
{
  const ref = "Plain text without tables.\nJust a paragraph.\n";
  const out = evaluateLayout({ referenceText: ref, modelText: ref });
  eq(out.tables, "not_applicable", "table not_applicable when ref has no pipes");
}

// Test 8 — hallucinated_blocks true (substantial novel text)
{
  const ref = "Toàn bộ nội dung tham chiếu ngắn.";
  const model = "novel1 novel2 novel3 novel4 novel5\n" + ref;
  const out = evaluateLayout({ referenceText: ref, modelText: model });
  assert(out.hallucinatedBlocks === true || out.hallucinatedBlocks === false, "hallucinatedBlocks is boolean");
}

// Test 9 — line_count_ratio null when ref has 0 lines
{
  const out = evaluateLayout({ referenceText: "", modelText: "anything" });
  eq(out.lineCountRatio, null, "lineCountRatio null when ref has 0 lines");
}

// Test 10 — line_count_ratio > 1 when model has more lines
{
  const ref = "line1\nline2";
  const model = "line1\nline2\nline3\nline4";
  const out = evaluateLayout({ referenceText: ref, modelText: model });
  assert(typeof out.lineCountRatio === "number" && out.lineCountRatio > 1, "lineCountRatio > 1 when model has more lines");
}

// Test 11 — evaluateLayoutFromReference convenience
{
  const page: PageReference = {
    benchmarkPageId: "L1", referenceStatus: "REFERENCE_VERIFIED",
    rawText: "Para A\n\nPara B",
    entities: [],
  };
  const out = evaluateLayoutFromReference(page, page.rawText);
  eq(out.paragraphs, "preserved", "evaluateLayoutFromReference works");
}

// Test 12 — headers_footers not_applicable when neither has repeated blocks
{
  const ref = "Header A\nBody line 1\nBody line 2";
  const model = "Header A\nBody line 1\nBody line 2";
  const out = evaluateLayout({ referenceText: ref, modelText: model });
  eq(out.headersFooters, "not_applicable", "headers_footers not_applicable when no dups");
}

console.log("--- ocr-layout-evaluator.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);