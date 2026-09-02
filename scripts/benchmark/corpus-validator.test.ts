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

// ── Negative test isolation: changed reference -> different hash ───

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
