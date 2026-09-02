/**
 * Manifest loader + validator tests.
 * Run with: npx tsx scripts/benchmark/manifest.test.ts
 */
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadManifest, validateManifest } from "./manifest";

let pass = 0, fail = 0; const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; } fail++; failures.push(name); console.error("FAIL: " + name);
}
function ok(result: { ok: boolean; errors: { code: string }[] }, expectedCode: string, name: string): void {
  const found = result.errors.some((e) => e.code === expectedCode);
  assert(!result.ok && found, name + " (expected " + expectedCode + ")");
}

const validManifest = {
  schemaVersion: "1.0",
  name: "Test corpus",
  description: "Synthetic fixture",
  created: "2025-01-01T00:00:00.000Z",
  pages: [
    {
      benchmarkPageId: "P001", fileName: "p1.png", imageFormat: "png",
      category: "CLEAN_JUDGMENT", difficulty: "easy",
      referenceStatus: "REFERENCE_VERIFIED", referenceFileName: "p1.ref.txt",
    },
  ],
};

// Test 1 — valid manifest
{
  const r = validateManifest(validManifest);
  assert(r.ok, "valid manifest validates OK");
}

// Test 2 — wrong schemaVersion
{
  const r = validateManifest({ ...validManifest, schemaVersion: "2.0" });
  ok(r, "MANIFEST_SCHEMA_VERSION", "wrong schemaVersion -> MANIFEST_SCHEMA_VERSION");
}

// Test 3 — missing name
{
  const { name, ...rest } = validManifest;
  const r = validateManifest(rest);
  ok(r, "MANIFEST_MISSING_FIELD", "missing name -> MANIFEST_MISSING_FIELD");
}

// Test 4 — unknown category
{
  const r = validateManifest({
    ...validManifest,
    pages: [{ ...validManifest.pages[0], category: "NONSENSE" }],
  });
  ok(r, "MANIFEST_UNKNOWN_CATEGORY", "unknown category -> MANIFEST_UNKNOWN_CATEGORY");
}

// Test 5 — unknown difficulty
{
  const r = validateManifest({
    ...validManifest,
    pages: [{ ...validManifest.pages[0], difficulty: "impossible" }],
  });
  ok(r, "MANIFEST_UNKNOWN_DIFFICULTY", "unknown difficulty -> MANIFEST_UNKNOWN_DIFFICULTY");
}

// Test 6 — unknown image format
{
  const r = validateManifest({
    ...validManifest,
    pages: [{ ...validManifest.pages[0], imageFormat: "gif" }],
  });
  ok(r, "MANIFEST_UNKNOWN_IMAGE_FORMAT", "unknown image format -> MANIFEST_UNKNOWN_IMAGE_FORMAT");
}

// Test 7 — duplicate page id
{
  const r = validateManifest({
    ...validManifest,
    pages: [validManifest.pages[0], validManifest.pages[0]],
  });
  ok(r, "MANIFEST_DUPLICATE_PAGE_ID", "duplicate page id -> MANIFEST_DUPLICATE_PAGE_ID");
}

// Test 8 — REFERENCE_VERIFIED requires referenceFileName
{
  const r = validateManifest({
    ...validManifest,
    pages: [{ ...validManifest.pages[0], referenceStatus: "REFERENCE_VERIFIED", referenceFileName: null }],
  });
  ok(r, "MANIFEST_REFERENCE_FILE_REQUIRED", "REFERENCE_VERIFIED with null ref -> MANIFEST_REFERENCE_FILE_REQUIRED");
}

// Test 9 — loadManifest from disk
{
  const dir = mkdtempSync(join(tmpdir(), "lexocr-manifest-"));
  const file = join(dir, "m.json");
  writeFileSync(file, JSON.stringify(validManifest), "utf8");
  try {
    const m = loadManifest(file);
    assert(m.schemaVersion === "1.0" && m.pages.length === 1, "loadManifest round-trip");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Test 10 — loadManifest missing file
{
  let threw = false;
  try { loadManifest("/nonexistent/x.json"); } catch { threw = true; }
  assert(threw, "loadManifest throws on missing file");
}

// Test 11 — loadManifest malformed JSON
{
  const dir = mkdtempSync(join(tmpdir(), "lexocr-manifest-"));
  const file = join(dir, "m.json");
  writeFileSync(file, "{ nope", "utf8");
  try {
    let threw = false;
    try { loadManifest(file); } catch { threw = true; }
    assert(threw, "loadManifest throws on malformed JSON");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Test 12 — unknown reference status
{
  const r = validateManifest({
    ...validManifest,
    pages: [{ ...validManifest.pages[0], referenceStatus: "NOT_A_STATUS" }],
  });
  ok(r, "MANIFEST_UNKNOWN_REFERENCE_STATUS", "unknown reference status -> MANIFEST_UNKNOWN_REFERENCE_STATUS");
}

console.log("--- manifest.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);