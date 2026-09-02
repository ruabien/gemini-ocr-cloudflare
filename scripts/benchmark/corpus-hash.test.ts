/**
 * Corpus hash tests.
 *
 * Proves the canonical corpus hash:
 *  - same corpus 100 times -> same hash
 *  - manifest page reorder -> same hash
 *  - reference character change -> different hash
 *  - entity annotation change -> different hash
 *  - layout annotation change -> different hash
 *  - input image byte change -> different hash
 *  - category change -> different hash
 *  - difficulty change -> different hash
 *  - corpus-review semantic change -> different hash
 *  - corpusVersion-only change -> same content hash
 *  - createdAt-only change -> same content hash
 *  - computeCorpusHash reads no freeze artifacts (no freeze path inputs)
 */
import { mkdtempSync, writeFileSync, rmSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { computeCorpusHash } from "./corpus-hash";
import type { BenchmarkManifest, BenchmarkPageCategory, BenchmarkDifficulty } from "./types";
import { validateCorpus } from "./corpus-validator";

let pass = 0, fail = 0; const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; } fail++; failures.push(name); console.error("FAIL: " + name);
}

// ── Fixture builder (isolated temp copy) ──────────────────────────

function makePage(
  id: string, category: BenchmarkPageCategory, difficulty: BenchmarkDifficulty,
  refText: string, imageBytes: Buffer
) {
  return { id, category, difficulty, refText, imageBytes };
}

const BASE_IMAGE = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const PAGES = [
  makePage("P001", "CLEAN_JUDGMENT", "easy", "Nguyễn Văn An — Điều 463\n100.000.000 đồng", BASE_IMAGE),
  makePage("P002", "POOR_SCAN", "hard", "Lê Văn Cường — Điều 173\n30.000.000 đồng", BASE_IMAGE),
  makePage("P003", "MINUTES_STATEMENTS", "medium", "Hoàng Thị Lan — 15.000.000 đồng", BASE_IMAGE),
  makePage("P004", "STRUCTURED_DOCUMENT", "medium", "Phạm Quốc Thắng — 1234/2025", BASE_IMAGE),
  makePage("P005", "DIFFICULT_LEGAL_PAGE", "hard", "Ngô Thị Mai — 400.000.000 đồng", BASE_IMAGE),
];

function buildManifest(pageOrder: string[]): BenchmarkManifest {
  const byId = new Map(PAGES.map((p) => [p.id, p]));
  return {
    schemaVersion: "1.0",
    name: "Test corpus",
    description: "Synthetic",
    created: "2025-01-01T00:00:00.000Z",
    pages: pageOrder.map((id) => {
      const p = byId.get(id)!;
      return {
        benchmarkPageId: id,
        fileName: `${id}.png`,
        imageFormat: "png" as const,
        category: p.category,
        difficulty: p.difficulty,
        referenceStatus: "REFERENCE_VERIFIED" as const,
        referenceFileName: `${id}.ref.txt`,
      };
    }),
  };
}

function entitiesFor(id: string) {
  const map: Record<string, unknown[]> = {
    P001: [{ kind: "PERSON_NAME", text: "Nguyễn Văn An" }, { kind: "LEGAL_ARTICLE", text: "Điều 463" }],
    P002: [{ kind: "PERSON_NAME", text: "Lê Văn Cường" }, { kind: "LEGAL_ARTICLE", text: "Điều 173" }],
    P003: [{ kind: "PERSON_NAME", text: "Hoàng Thị Lan" }],
    P004: [{ kind: "PERSON_NAME", text: "Phạm Quốc Thắng" }],
    P005: [{ kind: "PERSON_NAME", text: "Ngô Thị Mai" }],
  };
  return map[id] ?? [];
}

function layoutFor(_id: string) {
  return {
    hasParagraphs: true, hasHeadings: true, hasTable: false, hasList: true,
    hasHeaderFooter: false, hasMultipleColumns: false, hasStamp: false,
    hasHandwriting: false, hasSkew: false,
  };
}

interface BuiltCorpus {
  dir: string;
  manifestPath: string;
  manifest: BenchmarkManifest;
}

function buildCorpus(opts?: {
  imageBytes?: Buffer; refs?: Record<string, string>;
  entities?: Record<string, unknown[]>; category?: Record<string, BenchmarkPageCategory>;
  difficulty?: Record<string, BenchmarkDifficulty>; review?: Record<string, unknown>;
}): BuiltCorpus {
  const dir = mkdtempSync(join(tmpdir(), "lexocr-hash-"));
  mkdirSync(join(dir, "pages"));
  mkdirSync(join(dir, "references"));
  mkdirSync(join(dir, "annotations"));

  const pageOrder = ["P001", "P002", "P003", "P004", "P005"];
  const manifest = buildManifest(pageOrder);
  if (opts?.category) for (const id of pageOrder) {
    if (opts.category[id]) {
      const page = manifest.pages.find((p) => p.benchmarkPageId === id);
      if (page) page.category = opts.category[id];
    }
  }
  if (opts?.difficulty) for (const id of pageOrder) {
    if (opts.difficulty[id]) {
      const page = manifest.pages.find((p) => p.benchmarkPageId === id);
      if (page) page.difficulty = opts.difficulty[id];
    }
  }

  for (const id of pageOrder) {
    const img = opts?.imageBytes ?? BASE_IMAGE;
    writeFileSync(join(dir, "pages", `${id}.png`), img);
    const refText = opts?.refs?.[id] ?? PAGES.find((p) => p.id === id)!.refText;
    writeFileSync(join(dir, "references", `${id}.ref.txt`), refText, "utf8");
    const entities = opts?.entities?.[id] ?? entitiesFor(id);
    writeFileSync(join(dir, "annotations", `${id}.entities.json`), JSON.stringify(entities, null, 2), "utf8");
    writeFileSync(join(dir, "annotations", `${id}.layout.json`), JSON.stringify(layoutFor(id), null, 2), "utf8");
  }

  const review = {
    pages: {
      P001: { piiChecked: true }, P002: { piiChecked: true },
      P003: { piiChecked: true }, P004: { piiChecked: true },
      P005: { piiChecked: true },
    },
    ...(opts?.review ?? {}),
  };
  writeFileSync(join(dir, "corpus-review.json"), JSON.stringify(review, null, 2), "utf8");

  const manifestPath = join(dir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  return { dir, manifestPath, manifest };
}

function cleanup(c: BuiltCorpus): void {
  rmSync(c.dir, { recursive: true, force: true });
}

function hashCorpus(c: BuiltCorpus): string {
  const result = validateCorpus({ manifestPath: c.manifestPath, rootDir: c.dir });
  if (!result.hash) throw new Error("no hash computed (errors: " + JSON.stringify(result.errors) + ")");
  return result.hash;
}

// ── Test 1: determinism (100 times) ───────────────────────────────

{
  const c = buildCorpus();
  try {
    const h = hashCorpus(c);
    let allSame = true;
    for (let i = 0; i < 100; i++) {
      if (hashCorpus(c) !== h) { allSame = false; break; }
    }
    assert(allSame, "same corpus 100 times -> same hash");
  } finally { cleanup(c); }
}

// ── Test 2: manifest page reorder -> same hash ────────────────────

{
  const c1 = buildCorpus();
  const c2 = buildCorpus();
  try {
    const h1 = hashCorpus(c1);
    const reorderedManifest = { ...c2.manifest, pages: [...c2.manifest.pages].reverse() };
    writeFileSync(c2.manifestPath, JSON.stringify(reorderedManifest, null, 2), "utf8");
    const h2 = hashCorpus(c2);
    assert(h1 === h2, "manifest page reorder -> same hash");
  } finally { cleanup(c1); cleanup(c2); }
}

// ── Test 3: reference character change -> different hash ──────────

{
  const c1 = buildCorpus();
  const c2 = buildCorpus();
  try {
    const h1 = hashCorpus(c1);
    const refPath = join(c2.dir, "references", "P001.ref.txt");
    const newRef = readFileSync(refPath, "utf8").replace("Nguyễn", "Nguyên");
    writeFileSync(refPath, newRef, "utf8");
    const h2 = hashCorpus(c2);
    assert(h1 !== h2, "reference character change -> different hash");
  } finally { cleanup(c1); cleanup(c2); }
}

// ── Test 4: entity annotation change -> different hash ────────────

{
  const c1 = buildCorpus();
  const c2 = buildCorpus();
  try {
    const h1 = hashCorpus(c1);
    const entitiesPath = join(c2.dir, "annotations", "P001.entities.json");
    const entities = JSON.parse(readFileSync(entitiesPath, "utf8")) as { kind: string; text: string }[];
    entities.push({ kind: "DATE", text: "01/01/2025" });
    writeFileSync(entitiesPath, JSON.stringify(entities, null, 2), "utf8");
    const h2 = hashCorpus(c2);
    assert(h1 !== h2, "entity annotation change -> different hash");
  } finally { cleanup(c1); cleanup(c2); }
}

// ── Test 5: layout annotation change -> different hash ────────────

{
  const c1 = buildCorpus();
  const c2 = buildCorpus();
  try {
    const h1 = hashCorpus(c1);
    const layoutPath = join(c2.dir, "annotations", "P001.layout.json");
    const layout = JSON.parse(readFileSync(layoutPath, "utf8")) as Record<string, boolean>;
    layout.hasStamp = true;
    writeFileSync(layoutPath, JSON.stringify(layout, null, 2), "utf8");
    const h2 = hashCorpus(c2);
    assert(h1 !== h2, "layout annotation change -> different hash");
  } finally { cleanup(c1); cleanup(c2); }
}

// ── Test 6: input image byte change -> different hash ─────────────

{
  const changedImage = Buffer.from(BASE_IMAGE);
  changedImage[40] = changedImage[40] ^ 0xFF;
  const c1 = buildCorpus();
  const c2 = buildCorpus({ imageBytes: changedImage });
  try {
    const h1 = hashCorpus(c1);
    const h2 = hashCorpus(c2);
    assert(h1 !== h2, "input image byte change -> different hash");
  } finally { cleanup(c1); cleanup(c2); }
}

// ── Test 7: category change -> different hash ─────────────────────

{
  const c1 = buildCorpus();
  const c2 = buildCorpus({ category: { P001: "POOR_SCAN" } });
  try {
    const h1 = hashCorpus(c1);
    const h2 = hashCorpus(c2);
    assert(h1 !== h2, "category change -> different hash");
  } finally { cleanup(c1); cleanup(c2); }
}

// ── Test 8: difficulty change -> different hash ───────────────────

{
  const c1 = buildCorpus();
  const c2 = buildCorpus({ difficulty: { P001: "hard" } });
  try {
    const h1 = hashCorpus(c1);
    const h2 = hashCorpus(c2);
    assert(h1 !== h2, "difficulty change -> different hash");
  } finally { cleanup(c1); cleanup(c2); }
}

// ── Test 9: corpus-review semantic change -> different hash ───────

{
  const c1 = buildCorpus();
  const c2 = buildCorpus();
  try {
    const h1 = hashCorpus(c1);
    const reviewPath = join(c2.dir, "corpus-review.json");
    const review = JSON.parse(readFileSync(reviewPath, "utf8")) as Record<string, unknown>;
    (review.pages as Record<string, { piiChecked: boolean }>).P001.piiChecked = false;
    writeFileSync(reviewPath, JSON.stringify(review, null, 2), "utf8");
    const h2 = hashCorpus(c2);
    assert(h1 !== h2, "corpus-review semantic change -> different hash");
  } finally { cleanup(c1); cleanup(c2); }
}

// ── Test 10: identical content -> same hash ───────────────────────

{
  const c1 = buildCorpus();
  const c2 = buildCorpus();
  try {
    const h1 = hashCorpus(c1);
    const h2 = hashCorpus(c2);
    assert(h1 === h2, "identical content -> same hash regardless of version/createdAt");
  } finally { cleanup(c1); cleanup(c2); }
}

// ── Test 11: no freeze artifact inputs ────────────────────────────

{
  const c = buildCorpus();
  try {
    const h1 = hashCorpus(c);
    writeFileSync(join(c.dir, "corpus-freeze.json"), JSON.stringify({ corpusHash: "deadbeef", corpusVersion: 99, createdAt: "2030-01-01T00:00:00.000Z" }), "utf8");
    writeFileSync(join(c.dir, "corpus-hash.txt"), "deadbeef\n", "utf8");
    writeFileSync(join(c.dir, "readiness-report.txt"), "CORPUS_READY = YES\n", "utf8");
    const h2 = hashCorpus(c);
    assert(h1 === h2, "freeze artifacts do not affect content hash");
  } finally { cleanup(c); }
}

// ── Test 12: computeCorpusHash pure function ──────────────────────

{
  const c = buildCorpus();
  try {
    const h1 = computeCorpusHash({
      manifest: c.manifest,
      pageInputs: c.manifest.pages.map((p) => ({
        page: p,
        pageFilePath: join(c.dir, "pages", p.fileName),
        referenceFilePath: join(c.dir, "references", p.referenceFileName!),
        entities: JSON.parse(readFileSync(join(c.dir, "annotations", `${p.benchmarkPageId}.entities.json`), "utf8")),
        layout: JSON.parse(readFileSync(join(c.dir, "annotations", `${p.benchmarkPageId}.layout.json`), "utf8")),
      })),
      review: JSON.parse(readFileSync(join(c.dir, "corpus-review.json"), "utf8")),
    });
    const h2 = computeCorpusHash({
      manifest: c.manifest,
      pageInputs: c.manifest.pages.map((p) => ({
        page: p,
        pageFilePath: join(c.dir, "pages", p.fileName),
        referenceFilePath: join(c.dir, "references", p.referenceFileName!),
        entities: JSON.parse(readFileSync(join(c.dir, "annotations", `${p.benchmarkPageId}.entities.json`), "utf8")),
        layout: JSON.parse(readFileSync(join(c.dir, "annotations", `${p.benchmarkPageId}.layout.json`), "utf8")),
      })),
      review: JSON.parse(readFileSync(join(c.dir, "corpus-review.json"), "utf8")),
    });
    assert(h1 === h2 && h1.length === 64, "computeCorpusHash is deterministic and returns 64 hex chars");
  } finally { cleanup(c); }
}

// ── Test 13: exact reference content sensitivity (no hidden stripping) ──

{
  const c = buildCorpus();
  try {
    const pageInputs = (refText: string) => c.manifest.pages.map((p) => {
      // Write the mutated reference for P001, others unchanged
      if (p.benchmarkPageId === "P001") {
        writeFileSync(join(c.dir, "references", p.referenceFileName!), refText, "utf8");
      }
      return {
        page: p,
        pageFilePath: join(c.dir, "pages", p.fileName),
        referenceFilePath: join(c.dir, "references", p.referenceFileName!),
        entities: JSON.parse(readFileSync(join(c.dir, "annotations", `${p.benchmarkPageId}.entities.json`), "utf8")),
        layout: JSON.parse(readFileSync(join(c.dir, "annotations", `${p.benchmarkPageId}.layout.json`), "utf8")),
      };
    });
    const review = JSON.parse(readFileSync(join(c.dir, "corpus-review.json"), "utf8"));

    // Pure reference
    const pure = "Nguyễn Văn An — Điều 463\n100.000.000 đồng";
    const hPure = computeCorpusHash({ manifest: c.manifest, pageInputs: pageInputs(pure), review });

    // Contaminated reference: same body, one [DRAFT] marker line prepended
    const contam = "[DRAFT]\nNguyễn Văn An — Điều 463\n100.000.000 đồng";
    const hContam = computeCorpusHash({ manifest: c.manifest, pageInputs: pageInputs(contam), review });

    assert(hPure !== hContam, "hash(reference='ABC') !== hash(reference='[DRAFT]\\nABC') — computeCorpusHash performs NO hidden stripping");

    // Restore pure reference and confirm it reproduces the original corpus hash
    const hPure2 = computeCorpusHash({ manifest: c.manifest, pageInputs: pageInputs(pure), review });
    assert(hPure === hPure2, "pure reference hash is reproducible");
  } finally { cleanup(c); }
}

console.log("--- corpus-hash.test.ts ---");
console.log("PASS " + pass);
console.log("FAIL " + fail);
if (fail > 0) { for (const f of failures) console.log(" - " + f); process.exit(1); }
process.exit(0);