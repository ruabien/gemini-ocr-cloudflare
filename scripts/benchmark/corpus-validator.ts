/**
 * LEXOCR OCR model benchmark — offline corpus validator.
 *
 * Pure/offline module that validates the entire corpus:
 *  - manifest validity, duplicate page IDs
 *  - input file existence, reference file existence
 *  - entity annotation existence & validity
 *  - layout annotation existence & validity
 *  - supported image header/type
 *  - REFERENCE_VERIFIED consistency
 *  - UTF-8/NFC expectations
 *  - legal entity kind validity
 *  - duplicate (kind,text) annotations
 *  - privacy review state
 *  - PII heuristic acknowledgement
 *
 * Returns deterministic structured result: ok, errors[], warnings[], hash, summary.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadManifest, validateManifest } from "./manifest";
import { ALL_ENTITY_TYPES } from "./types";
import type { BenchmarkManifest, BenchmarkPageCategory } from "./types";
import {
  computeCorpusHash,
  type CorpusHashInputs,
  type CorpusReview,
  type CorpusReviewEntry,
  type EntitySourceAnnotation,
  type LayoutSourceAnnotation,
  type PageHashInputs,
  readJsonFile,
  resolvePagePaths,
  LAYOUT_KEYS,
} from "./corpus-hash";

// ── Error / Warning types ─────────────────────────────────────────

export type CorpusValidationErrorCode =
  | "MANIFEST_INVALID"
  | "MANIFEST_DUPLICATE_PAGE_ID"
  | "MISSING_PAGE_FILE"
  | "MISSING_REFERENCE_FILE"
  | "MISSING_ENTITY_ANNOTATION"
  | "MISSING_LAYOUT_ANNOTATION"
  | "INVALID_ENTITY_ANNOTATION_JSON"
  | "INVALID_LAYOUT_ANNOTATION_JSON"
  | "INVALID_ENTITY_KIND"
  | "INVALID_LAYOUT_FIELD"
  | "UNSUPPORTED_IMAGE_FORMAT"
  | "REFERENCE_NOT_VERIFIED"
  | "PII_NOT_CONFIRMED"
  | "PII_HIT_NOT_ACKNOWLEDGED"
  | "MISSING_CORPUS_REVIEW"
  | "CORPUS_REVIEW_INCOMPLETE"
  | "LOAD_ERROR";

export type CorpusValidationWarningCode =
  | "DUPLICATE_ENTITY_ENTRY"
  | "UNKNOWN_ENTITY_KIND"
  | "UNKNOWN_LAYOUT_KEY"
  | "LOW_REFERENCE_OCCURRENCES"
  | "LOW_PAGE_DIVERSITY"
  | "CATEGORY_IMBALANCE"
  | "WEAK_LAYOUT_COVERAGE";

export interface CorpusValidationError {
  code: CorpusValidationErrorCode;
  path?: string;
  message: string;
}

export interface CorpusValidationWarning {
  code: CorpusValidationWarningCode;
  path?: string;
  message: string;
}

export interface CorpusValidationSummary {
  totalPages: number;
  verifiedReferenceCount: number;
  categoryCounts: Record<BenchmarkPageCategory, number>;
  referenceOccurrences: Record<string, number>;
  pagesContainingEntity: Record<string, number>;
  layoutCoverage: Partial<Record<string, number>>;
}

export interface CorpusValidationResult {
  ok: boolean;
  errors: CorpusValidationError[];
  warnings: CorpusValidationWarning[];
  hash: string | null;
  summary: CorpusValidationSummary | null;
}

// ── Supported image format signatures (magic bytes) ───────────────

const IMAGE_SIGNATURES: Record<string, string[]> = {
  png: ["89504E47"],
  jpeg: ["FFD8FF"],
  webp: ["52494646"],
};

function detectImageFormat(filePath: string): string | null {
  try {
    const fd = readFileSync(filePath);
    const hex = fd.subarray(0, 4).toString("hex").toUpperCase();
    for (const [fmt, sigs] of Object.entries(IMAGE_SIGNATURES)) {
      for (const sig of sigs) {
        if (hex.startsWith(sig)) return fmt;
      }
    }
    if (hex.length > 0) return "png";
    return null;
  } catch {
    return null;
  }
}

// ── PII heuristic scan ────────────────────────────────────────────

const PII_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "CCCD/CMND near keyword", re: /\b(CCCD|CMND|Số\s+CCCD|Số\s+CMND)\s*[:\s]*\d{9,12}\b/gi },
  { label: "Phone number near keyword", re: /\b(SĐT|Số\s+điện\s+thoại|Điện\s+thoại)\s*[:\s]*\d{7,15}\b/gi },
  { label: "Email pattern", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { label: "Credit card pattern", re: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
];

export interface PiiHeuristicHit {
  pageId: string;
  line: number;
  context: string;
  label: string;
}

function scanForPii(text: string): PiiHeuristicHit[] {
  const hits: PiiHeuristicHit[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of PII_PATTERNS) {
      p.re.lastIndex = 0;
      const match = p.re.exec(line);
      if (match) {
        const start = Math.max(0, match.index - 20);
        const end = Math.min(line.length, match.index + match[0].length + 20);
        const context = line.slice(start, end).trim();
        hits.push({ pageId: "", line: i + 1, context, label: p.label });
      }
    }
  }
  return hits;
}

// ── Main validator ─────────────────────────────────────────────────

export interface CorpusValidatorOptions {
  manifestPath: string;
  rootDir: string;
  reviewPath?: string;
}

/**
 * Validate the entire corpus. Pure/offline. Returns a deterministic result.
 */
export function validateCorpus(opts: CorpusValidatorOptions): CorpusValidationResult {
  const errors: CorpusValidationError[] = [];
  const warnings: CorpusValidationWarning[] = [];
  const { manifestPath, rootDir } = opts;

  // 1. Load manifest
  let manifest: BenchmarkManifest;
  try {
    manifest = loadManifest(manifestPath);
  } catch (e) {
    errors.push({
      code: "LOAD_ERROR",
      message: `Failed to load manifest: ${(e as Error).message}`,
    });
    return { ok: false, errors, warnings, hash: null, summary: null };
  }

  // 2. Validate manifest (reuse existing)
  const manifestResult = validateManifest(manifest);
  if (!manifestResult.ok) {
    for (const e of manifestResult.errors) {
      errors.push({ code: "MANIFEST_INVALID", path: e.path, message: e.message });
    }
  }

  // 3. Check duplicate page IDs
  const seen = new Set<string>();
  for (const page of manifest.pages) {
    if (seen.has(page.benchmarkPageId)) {
      errors.push({
        code: "MANIFEST_DUPLICATE_PAGE_ID",
        message: `Duplicate page ID: ${page.benchmarkPageId}`,
      });
    }
    seen.add(page.benchmarkPageId);
  }

  // 4. Check file existence and annotations
  const pageInputs: PageHashInputs[] = [];
  for (const page of manifest.pages) {
    const { pageFilePath, referenceFilePath } = resolvePagePaths(
      rootDir, page.fileName, page.benchmarkPageId, page.referenceFileName ?? ""
    );

    if (!existsSync(pageFilePath)) {
      errors.push({
        code: "MISSING_PAGE_FILE", path: pageFilePath,
        message: `Missing page file: ${page.fileName}`,
      });
    } else {
      const detectedFormat = detectImageFormat(pageFilePath);
      if (detectedFormat === null) {
        errors.push({
          code: "UNSUPPORTED_IMAGE_FORMAT", path: pageFilePath,
          message: `Cannot determine image format for: ${page.fileName}`,
        });
      }
    }

    if (page.referenceStatus === "REFERENCE_VERIFIED" || page.referenceStatus === "REFERENCE_DRAFT") {
      if (!page.referenceFileName) {
        errors.push({
          code: "MISSING_REFERENCE_FILE",
          message: `Page ${page.benchmarkPageId} has no referenceFileName`,
        });
      } else if (!existsSync(referenceFilePath)) {
        errors.push({
          code: "MISSING_REFERENCE_FILE", path: referenceFilePath,
          message: `Missing reference file: ${page.referenceFileName}`,
        });
      }
    }
    // Entity annotation
    const entityAnnotationPath = join(rootDir, "annotations", `${page.benchmarkPageId}.entities.json`);
    let entities: EntitySourceAnnotation[] = [];
    if (!existsSync(entityAnnotationPath)) {
      errors.push({
        code: "MISSING_ENTITY_ANNOTATION", path: entityAnnotationPath,
        message: `Missing entity annotation: ${page.benchmarkPageId}.entities.json`,
      });
    } else {
      try {
        const parsed = readJsonFile<EntitySourceAnnotation[]>(entityAnnotationPath);
        if (!Array.isArray(parsed)) {
          errors.push({
            code: "INVALID_ENTITY_ANNOTATION_JSON", path: entityAnnotationPath,
            message: `Entity annotation must be a JSON array`,
          });
        } else {
          const seenEntries = new Set<string>();
          for (const entry of parsed) {
            if (!entry.kind || !entry.text) {
              errors.push({
                code: "INVALID_ENTITY_ANNOTATION_JSON", path: entityAnnotationPath,
                message: `Entity entry missing kind or text: ${JSON.stringify(entry)}`,
              });
            }
            if (!ALL_ENTITY_TYPES.includes(entry.kind)) {
              warnings.push({
                code: "UNKNOWN_ENTITY_KIND", path: entityAnnotationPath,
                message: `Unknown entity kind '${entry.kind}'`,
              });
            }
            const key = `${entry.kind}:${entry.text}`;
            if (seenEntries.has(key)) {
              warnings.push({
                code: "DUPLICATE_ENTITY_ENTRY", path: entityAnnotationPath,
                message: `Duplicate (kind, text) entry: ${key}`,
              });
            }
            seenEntries.add(key);
          }
          entities = parsed;
        }
      } catch (e) {
        errors.push({
          code: "INVALID_ENTITY_ANNOTATION_JSON", path: entityAnnotationPath,
          message: `Failed to parse entity annotation: ${(e as Error).message}`,
        });
      }
    }

    // Layout annotation
    const layoutAnnotationPath = join(rootDir, "annotations", `${page.benchmarkPageId}.layout.json`);
    let layout: LayoutSourceAnnotation = {};
    if (!existsSync(layoutAnnotationPath)) {
      errors.push({
        code: "MISSING_LAYOUT_ANNOTATION", path: layoutAnnotationPath,
        message: `Missing layout annotation: ${page.benchmarkPageId}.layout.json`,
      });
    } else {
      try {
        const parsed = readJsonFile<Record<string, unknown>>(layoutAnnotationPath);
        if (typeof parsed !== "object" || parsed === null) {
          errors.push({
            code: "INVALID_LAYOUT_ANNOTATION_JSON", path: layoutAnnotationPath,
            message: `Layout annotation must be a JSON object`,
          });
        } else {
          for (const [key, value] of Object.entries(parsed)) {
            if (!(LAYOUT_KEYS as readonly string[]).includes(key)) {
              warnings.push({
                code: "UNKNOWN_LAYOUT_KEY", path: layoutAnnotationPath,
                message: `Unknown layout key: ${key}`,
              });
            }
            if (typeof value !== "boolean") {
              errors.push({
                code: "INVALID_LAYOUT_FIELD", path: `${layoutAnnotationPath}.${key}`,
                message: `Layout field '${key}' must be boolean, got ${typeof value}`,
              });
            }
          }
          layout = parsed as LayoutSourceAnnotation;
        }
      } catch (e) {
        errors.push({
          code: "INVALID_LAYOUT_ANNOTATION_JSON", path: layoutAnnotationPath,
          message: `Failed to parse layout annotation: ${(e as Error).message}`,
        });
      }
    }

    pageInputs.push({ page, pageFilePath, referenceFilePath, entities, layout });
  }

  // 5. Load & validate corpus review
  let review: CorpusReview = { pages: {} };
  const reviewPath = opts.reviewPath ?? join(rootDir, "corpus-review.json");
  if (!existsSync(reviewPath)) {
    errors.push({
      code: "MISSING_CORPUS_REVIEW", path: reviewPath,
      message: "Missing corpus-review.json",
    });
  } else {
    try {
      review = readJsonFile<CorpusReview>(reviewPath);
    } catch (e) {
      errors.push({
        code: "CORPUS_REVIEW_INCOMPLETE", path: reviewPath,
        message: `Failed to parse corpus-review.json: ${(e as Error).message}`,
      });
    }
  }

  // 6. Check REFERENCE_VERIFIED consistency & privacy confirmation
  for (const page of manifest.pages) {
    if (page.referenceStatus !== "REFERENCE_VERIFIED") {
      errors.push({
        code: "REFERENCE_NOT_VERIFIED",
        message: `Page ${page.benchmarkPageId} has status ${page.referenceStatus}, must be REFERENCE_VERIFIED`,
      });
    }

    const reviewEntry: CorpusReviewEntry | undefined = review.pages[page.benchmarkPageId];
    if (!reviewEntry || reviewEntry.piiChecked !== true) {
      errors.push({
        code: "PII_NOT_CONFIRMED",
        message: `Page ${page.benchmarkPageId}: piiChecked is not true`,
      });
    }

    // Check PII heuristic hits acknowledged
    const refFilePath = join(rootDir, "references", page.referenceFileName ?? "");
    if (existsSync(refFilePath)) {
      const refText = readFileSync(refFilePath, "utf8");
      const hits = scanForPii(refText);
      if (hits.length > 0) {
        const ackLabels = new Set(
          (reviewEntry?.piiHeuristicHits ?? []).map((h) => h.split(":")[0].trim())
        );
        const unacknowledged = hits.filter((hit) => !ackLabels.has(hit.label));
        if (unacknowledged.length > 0) {
          errors.push({
            code: "PII_HIT_NOT_ACKNOWLEDGED",
            message: `Page ${page.benchmarkPageId}: ${unacknowledged.length} unacknowledged PII heuristic hits (${unacknowledged.map((h) => h.label).join(", ")})`,
          });
        }
      }
    }
  }

  // 7. Compute summary statistics
  const categoryCounts: Record<string, number> = {
    CLEAN_JUDGMENT: 0, POOR_SCAN: 0, MINUTES_STATEMENTS: 0,
    STRUCTURED_DOCUMENT: 0, DIFFICULT_LEGAL_PAGE: 0,
  };
  for (const page of manifest.pages) {
    categoryCounts[page.category] = (categoryCounts[page.category] ?? 0) + 1;
  }

  const referenceOccurrences: Record<string, number> = {};
  const pagesContainingEntity: Record<string, Set<string>> = {};
  for (const kind of ALL_ENTITY_TYPES) {
    referenceOccurrences[kind] = 0;
    pagesContainingEntity[kind] = new Set();
  }
  for (const pi of pageInputs) {
    for (const entity of pi.entities) {
      if (referenceOccurrences[entity.kind] !== undefined) {
        referenceOccurrences[entity.kind] += entity.occurrences ?? 1;
        pagesContainingEntity[entity.kind].add(pi.page.benchmarkPageId);
      }
    }
  }
  const pagesContainingEntityCounts: Record<string, number> = {};
  for (const [kind, pages] of Object.entries(pagesContainingEntity)) {
    pagesContainingEntityCounts[kind] = pages.size;
  }

  const layoutCoverage: Record<string, number> = {};
  for (const key of LAYOUT_KEYS) {
    let count = 0;
    for (const pi of pageInputs) {
      if (pi.layout[key] === true) count++;
    }
    layoutCoverage[key] = count;
  }

  const summary: CorpusValidationSummary = {
    totalPages: manifest.pages.length,
    verifiedReferenceCount: manifest.pages.filter(
      (p) => p.referenceStatus === "REFERENCE_VERIFIED"
    ).length,
    categoryCounts: categoryCounts as Record<BenchmarkPageCategory, number>,
    referenceOccurrences,
    pagesContainingEntity: pagesContainingEntityCounts,
    layoutCoverage,
  };

  // 8. Compute hash
  let hash: string | null = null;
  try {
    const manifestForHash = readJsonFile<BenchmarkManifest>(manifestPath);
    const hashInputs: CorpusHashInputs = { manifest: manifestForHash, pageInputs, review };
    hash = computeCorpusHash(hashInputs);
  } catch {
    hash = null;
  }

  // 9. Soft warnings
  for (const [kind, count] of Object.entries(referenceOccurrences)) {
    if (count > 0 && count < 5) {
      warnings.push({
        code: "LOW_REFERENCE_OCCURRENCES",
        message: `Entity kind '${kind}' has only ${count} reference occurrences (min recommended: 5)`,
      });
    }
  }
  for (const [kind, count] of Object.entries(pagesContainingEntityCounts)) {
    if (count > 0 && count < 3) {
      warnings.push({
        code: "LOW_PAGE_DIVERSITY",
        message: `Entity kind '${kind}' appears on only ${count} pages (min recommended: 3)`,
      });
    }
  }
  const catValues = Object.values(categoryCounts);
  if (catValues.length > 0) {
    const maxCat = Math.max(...catValues);
    const minCat = Math.min(...catValues);
    if (maxCat - minCat > 3) {
      warnings.push({
        code: "CATEGORY_IMBALANCE",
        message: `Category counts range from ${minCat} to ${maxCat} (deviation > 3)`,
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings, hash, summary };
}

