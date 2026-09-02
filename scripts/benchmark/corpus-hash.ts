/**
 * LEXOCR OCR model benchmark — corpus content hash.
 *
 * `computeCorpusHash()` produces a deterministic SHA-256 over canonicalised
 * corpus CONTENT (semantic inputs only).
 *
 * Properties:
 *  - Order-independent: manifest pages are sorted by benchmarkPageId.
 *  - Image-byte-dependent: SHA-256 of raw input image bytes is included.
 *  - Semantic-only: `corpusVersion`, `createdAt`, and freeze artifacts are
 *    NOT part of the hash. They belong to the freeze record (an OUTPUT).
 *  - Deterministic: same content -> same hash regardless of run count.
 *
 * The hash inputs are only immutable semantic corpus inputs:
 *  - canonical manifest/page metadata
 *  - exact input image-byte SHA-256
 *  - reference text (NFC)
 *  - entity source annotations
 *  - layout source annotations
 *  - corpus-review.json (privacy/review metadata)
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BenchmarkManifest } from "./types";
import { validateManifest } from "./manifest";

/** Canonical layout annotation keys. */
export const LAYOUT_KEYS = [
  "hasParagraphs", "hasHeadings", "hasTable", "hasList",
  "hasHeaderFooter", "hasMultipleColumns", "hasStamp",
  "hasHandwriting", "hasSkew",
] as const;

export type LayoutKey = (typeof LAYOUT_KEYS)[number];

/** Shape of `annotations/<pageId>.entities.json`. */
export interface EntitySourceAnnotation {
  kind: string;
  text: string;
  category?: string;
  occurrences?: number;
}

/** Shape of `annotations/<pageId>.layout.json`. */
export type LayoutSourceAnnotation = Partial<Record<LayoutKey, boolean>>;

/** Shape of `corpus-review.json`. */
export interface CorpusReviewEntry {
  piiChecked?: boolean;
  piiHeuristicHits?: string[];
  piiNotes?: string;
  notes?: string;
}

export interface CorpusReview {
  pages: Record<string, CorpusReviewEntry>;
  spotCheckNotes?: string;
}

/** Per-page inputs for the hash stream. */
export interface PageHashInputs {
  page: BenchmarkManifest["pages"][number];
  pageFilePath: string;
  referenceFilePath: string;
  entities: EntitySourceAnnotation[];
  layout: LayoutSourceAnnotation;
}

/** Root-level inputs for the hash stream. */
export interface CorpusHashInputs {
  manifest: BenchmarkManifest;
  pageInputs: PageHashInputs[];
  review: CorpusReview;
}

/** Compute SHA-256 of a Buffer and return the hex digest. */
function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Canonicalise an entity annotation for hashing. */
function canonicalEntity(e: EntitySourceAnnotation): string {
  const obj: Record<string, unknown> = { kind: e.kind, text: e.text };
  if (e.category !== undefined) obj.category = e.category;
  if (e.occurrences !== undefined) obj.occurrences = e.occurrences;
  return JSON.stringify(obj);
}

/** Canonicalise a layout annotation for hashing (sorted keys, booleans only). */
function canonicalLayout(l: LayoutSourceAnnotation): string {
  const sorted: Record<string, boolean> = {};
  for (const k of LAYOUT_KEYS) {
    if (typeof l[k] === "boolean") sorted[k] = l[k] as boolean;
  }
  return JSON.stringify(sorted);
}

/** Canonicalise a review entry for hashing. */
function canonicalReviewEntry(e: CorpusReviewEntry): string {
  const obj: Record<string, unknown> = {};
  if (e.piiChecked !== undefined) obj.piiChecked = e.piiChecked;
  if (e.piiHeuristicHits !== undefined) {
    obj.piiHeuristicHits = [...e.piiHeuristicHits].sort();
  }
  if (e.piiNotes !== undefined) obj.piiNotes = e.piiNotes;
  if (e.notes !== undefined) obj.notes = e.notes;
  return JSON.stringify(obj);
}

/** Canonicalise the full review object. */
function canonicalReview(r: CorpusReview): string {
  const pageIds = Object.keys(r.pages).sort();
  const entries: Record<string, string> = {};
  for (const id of pageIds) {
    const entry = r.pages[id];
    if (entry) entries[id] = canonicalReviewEntry(entry);
  }
  const obj: Record<string, unknown> = { pages: entries };
  if (r.spotCheckNotes !== undefined) obj.spotCheckNotes = r.spotCheckNotes;
  return JSON.stringify(obj);
}

/**
 * Build the canonical byte stream for a single page, then hash it.
 * Returns the hex SHA-256 digest of the page's canonical representation.
 */
function hashPage(inputs: PageHashInputs): string {
  const { page, pageFilePath, referenceFilePath, entities, layout } = inputs;
  const h = createHash("sha256");
  h.update(`benchmarkPageId:${page.benchmarkPageId}\n`);
  h.update(`category:${page.category}\n`);
  h.update(`difficulty:${page.difficulty}\n`);
  h.update(`imageFormat:${page.imageFormat}\n`);
  h.update(`fileName:${page.fileName}\n`);
  const imageBytes = readFileSync(pageFilePath);
  const imageSha = sha256(imageBytes);
  h.update(`INPUT_PAGE_BYTES:${imageSha}\n`);
  const refBytes = readFileSync(referenceFilePath);
  h.update(`REFERENCE_BYTES:${refBytes.toString("utf8")}\n`);
  const sortedEntities = [...entities].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    if (a.text !== b.text) return a.text < b.text ? -1 : 1;
    return 0;
  });
  for (const e of sortedEntities) h.update(`ENTITIES:${canonicalEntity(e)}\n`);
  h.update(`LAYOUT:${canonicalLayout(layout)}\n`);
  return h.digest("hex");
}

/**
 * Compute the canonical corpus hash.
 *
 * This function reads ONLY semantic corpus inputs (manifest, image files,
 * reference files, annotation files, corpus-review.json). It does NOT read
 * corpus-freeze.json, corpus-hash.txt, readiness-report.txt, or
 * corpus-versions/.
 */
export function computeCorpusHash(inputs: CorpusHashInputs): string {
  const { manifest, pageInputs, review } = inputs;
  const v = validateManifest(manifest);
  if (!v.ok) {
    throw new Error(
      `computeCorpusHash: invalid manifest -- ${v.errors.map((e) => e.code).join(", ")}`
    );
  }
  const sortedInputs = [...pageInputs].sort((a, b) => {
    const idA = a.page.benchmarkPageId;
    const idB = b.page.benchmarkPageId;
    if (idA < idB) return -1;
    if (idA > idB) return 1;
    return 0;
  });
  const h = createHash("sha256");
  for (const pi of sortedInputs) h.update(`PAGE:${hashPage(pi)}\n`);
  h.update(`CORPUS_REVIEW:${canonicalReview(review)}\n`);
  return h.digest("hex");
}

/** Read a JSON file and parse it. Throws on error. */
export function readJsonFile<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

/** Resolve standard file paths for a page. */
export function resolvePagePaths(
  rootDir: string,
  fileName: string,
  pageId: string,
  referenceFileName: string
): { pageFilePath: string; referenceFilePath: string } {
  return {
    pageFilePath: join(rootDir, "pages", fileName),
    referenceFilePath: join(rootDir, "references", referenceFileName),
  };
}
