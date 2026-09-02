/**
 * Corpus validator tests.
 *
 * Covers:
 *  - canonical synthetic fixture: VALIDATION = PASS
 *  - manifest validity checks
 *  - missing files cause hard errors
 *  - negative tests are isolated (mutations happen in os.tmpdir copies)
 *  - PII acknowledgement logic
 *  - occurrence vs evidence diversity metrics
 */
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { validateCorpus } from "./corpus-validator";

let pass = 0, fail = 0; const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; } fail++; failures.push(name); console.error("FAIL: " + name);
}

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CANONICAL_FIXTURE = join(__dirname, "corpus-synthetic-fixture");

// ── Test 1: canonical synthetic fixture -> PASS ───────────────────

{
  const r = validateCorpus({
    manifestPath: join(CANONICAL_FIXTURE, "manifest.json"),
    rootDir: CANONICAL_FIXTURE,
  });
  assert(r.ok, "canonical synthetic fixture -> VALIDATION = PASS");
  assert(r.errors.length === 0, "canonical fixture has no errors");
  assert(r.hash !== null && (r.hash?.length ?? 0) === 64, "canonical fixture produces 64-char hash");
  assert(r.summary?.totalPages === 5, "canonical fixture has 5 pages");
  assert(r.summary?.verifiedReferenceCount === 5, "all 5 pages are REFERENCE_VERIFIED");
}

// ── Test 2: occurrence vs page diversity metrics ──────────────────

{
  const r = validateCorpus({
    manifestPath: join(CANONICAL_FIXTURE, "manifest.json"),
    rootDir: CANONICAL_FIXTURE,
  });
  const personOcc = r.summary?.referenceOccurrences.PERSON_NAME ?? 0;
  const personPages = r.summary?.pagesContainingEntity.PERSON_NAME ?? 0;
  assert(personOcc >= 5, `PERSON_NAME has referenceOccurrences=${personOcc} (>= 5)`);
  assert(personPages >= 3, `PERSON_NAME has pagesContainingEntity=${personPages} (>= 3)`);
}

// ── Helper: copy directory tree ───────────────────────────────────

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = ["manifest.json", "corpus-review.json"];
  for (const e of entries) {
    const srcFile = join(src, e);
    if (existsSync(srcFile)) copyFileSync(srcFile, join(dest, e));
  }
  const dirs = ["pages", "references", "annotations"];
  for (const d of dirs) {
    const srcDir = join(src, d);
    const destDir = join(dest, d);
    mkdirSync(destDir, { recursive: true });
    for (const f of readdirSync(srcDir)) {
      copyFileSync(join(srcDir, f), join(destDir, f));
    }
  }
}

// ── Negative test isolation: REFERENCE_DRAFT blocks readiness ──────

{
  const tmp = mkdtempSync(join(tmpdir(), "lexocr-val-"));
  try {
    copyTree(CANONICAL_FIXTURE, tmp);
    const manifestPath = join(tmp, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { pages: { benchmarkPageId: string; referenceStatus: string }[] };
    manifest.pages[0].referenceStatus = "REFERENCE_DRAFT";
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    const r = validateCorpus({ manifestPath, rootDir: tmp });
    assert(!r.ok, "REFERENCE_DRAFT page -> validation FAILS");
    assert(r.errors.some((e) => e.code === "REFERENCE_NOT_VERIFIED"), "REFERENCE_NOT_VERIFIED error reported");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

// ── Negative test isolation: piiChecked=false blocks readiness ─────

{
  const tmp = mkdtempSync(join(tmpdir(), "lexocr-val-"));
  try {
    copyTree(CANONICAL_FIXTURE, tmp);
    const reviewPath = join(tmp, "corpus-review.json");
    const review = JSON.parse(readFileSync(reviewPath, "utf8")) as { pages: Record<string, { piiChecked: boolean }> };
    review.pages["clean-001"].piiChecked = false;
    writeFileSync(reviewPath, JSON.stringify(review, null, 2), "utf8");
    const r = validateCorpus({ manifestPath: join(tmp, "manifest.json"), rootDir: tmp });
    assert(!r.ok, "piiChecked=false -> validation FAILS");
    assert(r.errors.some((e) => e.code === "PII_NOT_CONFIRMED"), "PII_NOT_CONFIRMED error reported");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

// ── Negative test isolation: removed annotation blocks readiness ───

{
  const tmp = mkdtempSync(join(tmpdir(), "lexocr-val-"));
  try {
    copyTree(CANONICAL_FIXTURE, tmp);
    rmSync(join(tmp, "annotations", "clean-001.entities.json"));
    const r = validateCorpus({ manifestPath: join(tmp, "manifest.json"), rootDir: tmp });
    assert(!r.ok, "missing entity annotation -> validation FAILS");
    assert(r.errors.some((e) => e.code === "MISSING_ENTITY_ANNOTATION"), "MISSING_ENTITY_ANNOTATION error reported");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

// ── Negative test isolation: changed image bytes -> different hash ─

{
  const tmp = mkdtempSync(join(tmpdir(), "lexocr-val-"));
  try {
    copyTree(CANONICAL_FIXTURE, tmp);
    const pageFile = join(tmp, "pages", "clean-001.png");
    const original = readFileSync(pageFile);
    const mutated = Buffer.from(original);
    mutated[mutated.length - 1] = mutated[mutated.length - 1] ^ 0xFF;
    writeFileSync(pageFile, mutated);
    const r = validateCorpus({ manifestPath: join(tmp, "manifest.json"), rootDir: tmp });
    assert(r.hash !== null, "hash still computed after byte change");
    const rCanon = validateCorpus({
      manifestPath: join(CANONICAL_FIXTURE, "manifest.json"),
      rootDir: CANONICAL_FIXTURE,
    });
    assert(r.hash !== rCanon.hash, "byte change -> different hash");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

// ── Test 6–13: Reference purity — fail-closed marker grammar ──────

{
  const PURE_BODY = "Nguyễn Văn An — Điều 463\n100.000.000 đồng\n";

  // Helper: create a temp corpus with a single reference file
  function purityTestRef(
    pageId: string,
    refContent: string,
    status: "REFERENCE_VERIFIED" | "REFERENCE_DRAFT" = "REFERENCE_VERIFIED"
  ): {
    tmp: string;
    manifestPath: string;
    rootDir: string;
  } {
    const tmp = mkdtempSync(join(tmpdir(), "lexocr-purity-"));
    copyTree(CANONICAL_FIXTURE, tmp);
    writeFileSync(join(tmp, "references", "clean-001.ref.txt"), refContent, "utf8");
    if (status !== "REFERENCE_VERIFIED") {
      const manifestPath = join(tmp, "manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        pages: { benchmarkPageId: string; referenceStatus: string }[];
      };
      manifest.pages[0].referenceStatus = status;
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    }
    return { tmp, manifestPath: join(tmp, "manifest.json"), rootDir: tmp };
  }

  // Test 6: All 8 contract-approved markers pass
  for (const marker of [
    "[STAMP_OBSCURING]",
    "[ILLEGIBLE]",
    "[PARTIALLY_ILLEGIBLE]",
    "[TABLE_START]",
    "[TABLE_END]",
    "[ ]",
    "[X]",
    "[SIGNATURE]",
  ] as const) {
    const { tmp, manifestPath, rootDir } = purityTestRef("clean-001", marker + "\n" + PURE_BODY);
    try {
      const r = validateCorpus({ manifestPath, rootDir });
      assert(r.ok, `purity guard: approved marker '${marker}' passes validation`);
      const purityErrors = r.errors.filter((e) => e.code === "REFERENCE_CONTAINS_UNAPPROVED_MARKER");
      assert(purityErrors.length === 0, `purity guard: approved marker '${marker}' produces no purity error`);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }

  // Test 7: [DRAFT] standalone marker line fails
  {
    const { tmp, manifestPath, rootDir } = purityTestRef("clean-001", "[DRAFT]\n" + PURE_BODY);
    try {
      const r = validateCorpus({ manifestPath, rootDir });
      assert(!r.ok, "purity guard: [DRAFT] standalone marker line -> validation FAILS");
      assert(r.errors.some((e) => e.code === "REFERENCE_CONTAINS_UNAPPROVED_MARKER"), "purity guard: [DRAFT] produces REFERENCE_CONTAINS_UNAPPROVED_MARKER");
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }

  // Test 8: [OPERATOR NOTE] fails
  {
    const { tmp, manifestPath, rootDir } = purityTestRef("clean-001", "[OPERATOR NOTE]\n" + PURE_BODY);
    try {
      const r = validateCorpus({ manifestPath, rootDir });
      assert(!r.ok, "purity guard: [OPERATOR NOTE] -> FAILS");
      assert(r.errors.some((e) => e.code === "REFERENCE_CONTAINS_UNAPPROVED_MARKER"), "purity guard: [OPERATOR NOTE] produces REFERENCE_CONTAINS_UNAPPROVED_MARKER");
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }
// Test 9: [ X] (space before X, not contract's [X]) fails closed
  {
    const { tmp, manifestPath, rootDir } = purityTestRef("clean-001", "[ X]\n" + PURE_BODY);
    try {
      const r = validateCorpus({ manifestPath, rootDir });
      assert(!r.ok, "purity guard: [ X] (space before X) -> FAILS closed");
      assert(r.errors.some((e) => e.code === "REFERENCE_CONTAINS_UNAPPROVED_MARKER"), "purity guard: [ X] produces REFERENCE_CONTAINS_UNAPPROVED_MARKER");
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }

  // Test 10: Workflow metadata hidden by leading whitespace is still caught
  {
    const { tmp, manifestPath, rootDir } = purityTestRef("clean-001", "  [DRAFT]\n" + PURE_BODY);
    try {
      const r = validateCorpus({ manifestPath, rootDir });
      assert(!r.ok, "purity guard: whitespace-hidden [DRAFT] -> FAILS");
      assert(r.errors.some((e) => e.code === "REFERENCE_CONTAINS_UNAPPROVED_MARKER"), "purity guard: whitespace-hidden [DRAFT] produces REFERENCE_CONTAINS_UNAPPROVED_MARKER");
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }

  // Test 11: Ordinary source text with inline brackets (e.g. "Trang [1] / [4]") passes
  {
    const { tmp, manifestPath, rootDir } = purityTestRef("clean-001", "Trang [1] / [4] — Nội dung thật\n");
    try {
      const r = validateCorpus({ manifestPath, rootDir });
      assert(r.ok, "purity guard: ordinary source text with inline brackets [1] [4] passes");
      assert(r.errors.length === 0 || !r.errors.some((e) => e.code === "REFERENCE_CONTAINS_UNAPPROVED_MARKER"), "purity guard: no purity error on inline brackets");
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }

  // Test 12: REFERENCE_DRAFT reference with unapproved marker still fails (file-format invariant)
  {
    const { tmp, manifestPath, rootDir } = purityTestRef("clean-001", "[DRAFT — awaiting verification]\n" + PURE_BODY, "REFERENCE_DRAFT");
    try {
      const r = validateCorpus({ manifestPath, rootDir });
      assert(!r.ok, "purity guard: REFERENCE_DRAFT + unapproved marker -> FAILS");
      assert(r.errors.some((e) => e.code === "REFERENCE_CONTAINS_UNAPPROVED_MARKER"), "purity guard: REFERENCE_DRAFT + unapproved marker produces REFERENCE_CONTAINS_UNAPPROVED_MARKER");
      // Also still has REFERENCE_NOT_VERIFIED for the draft status
      assert(r.errors.some((e) => e.code === "REFERENCE_NOT_VERIFIED"), "purity guard: REFERENCE_DRAFT also produces REFERENCE_NOT_VERIFIED");
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }

  // Test 13: [TABLE] (not contract-approved, no underscore) fails closed
  {
    const { tmp, manifestPath, rootDir } = purityTestRef("clean-001", "[TABLE]\n" + PURE_BODY);
    try {
      const r = validateCorpus({ manifestPath, rootDir });
      assert(!r.ok, "purity guard: [TABLE] (no underscore) -> FAILS closed");
      assert(r.errors.some((e) => e.code === "REFERENCE_CONTAINS_UNAPPROVED_MARKER"), "purity guard: [TABLE] produces REFERENCE_CONTAINS_UNAPPROVED_MARKER");
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }
}

{
  const tmp = mkdtempSync(join(tmpdir(), "lexocr-val-"));
  try {
    copyTree(CANONICAL_FIXTURE, tmp);
    const refFile = join(tmp, "references", "clean-001.ref.txt");
    const original = readFileSync(refFile, "utf8");
    writeFileSync(refFile, original + "\nMỘT SỐ THAY ĐỔI NHỎ", "utf8");
    const r = validateCorpus({ manifestPath: join(tmp, "manifest.json"), rootDir: tmp });
    const rCanon = validateCorpus({
      manifestPath: join(CANONICAL_FIXTURE, "manifest.json"),
      rootDir: CANONICAL_FIXTURE,
    });
    assert(r.hash !== rCanon.hash, "reference change -> different hash");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

// ── Negative test isolation: changed category -> different hash ─────

{
  const tmp = mkdtempSync(join(tmpdir(), "lexocr-val-"));
  try {
    copyTree(CANONICAL_FIXTURE, tmp);
    const manifestPath = join(tmp, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { pages: { benchmarkPageId: string; category: string }[] };
    manifest.pages[0].category = "POOR_SCAN";
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    const r = validateCorpus({ manifestPath, rootDir: tmp });
    const rCanon = validateCorpus({
      manifestPath: join(CANONICAL_FIXTURE, "manifest.json"),
      rootDir: CANONICAL_FIXTURE,
    });
    assert(r.hash !== rCanon.hash, "category change -> different hash");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

console.log("--- corpus-validator.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);
