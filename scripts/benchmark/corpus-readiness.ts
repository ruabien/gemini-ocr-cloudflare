/**
 * LEXOCR OCR model benchmark — corpus readiness gate.
 *
 * Produces a deterministic readiness verdict.
 *  - CORPUS_READY = YES  (all hard requirements satisfied)
 *  - CORPUS_NOT_READY    (one or more hard failures)
 *
 * Hard failures (block readiness):
 *  - REFERENCE_DRAFT page
 *  - missing review entry
 *  - piiChecked=false
 *  - unacknowledged heuristic hit
 *  - missing input image
 *  - missing reference
 *  - missing required annotation
 *  - invalid manifest
 *  - unsupported image type
 *
 * Soft warnings (do NOT block readiness):
 *  - category imbalance
 *  - low referenceOccurrences (<5)
 *  - low pagesContainingEntity (<3)
 *  - weak layout coverage
 */
import { validateCorpus, type CorpusValidationResult } from "./corpus-validator";

export type ReadinessVerdict = "CORPUS_READY" | "CORPUS_NOT_READY";

export interface ReadinessReport {
  verdict: ReadinessVerdict;
  hash: string | null;
  hardFailureCount: number;
  softWarningCount: number;
  hardFailures: { code: string; message: string }[];
  softWarnings: { code: string; message: string }[];
  summary: CorpusValidationResult["summary"];
  asOf: string;
  schemaVersion: "1.0";
}

const HARD_FAILURE_CODES = new Set<string>([
  "MANIFEST_INVALID",
  "MISSING_PAGE_FILE",
  "MISSING_REFERENCE_FILE",
  "MISSING_ENTITY_ANNOTATION",
  "MISSING_LAYOUT_ANNOTATION",
  "INVALID_ENTITY_ANNOTATION_JSON",
  "INVALID_LAYOUT_ANNOTATION_JSON",
  "INVALID_LAYOUT_FIELD",
  "UNSUPPORTED_IMAGE_FORMAT",
  "REFERENCE_NOT_VERIFIED",
  "PII_NOT_CONFIRMED",
  "PII_HIT_NOT_ACKNOWLEDGED",
  "REFERENCE_CONTAINS_UNAPPROVED_MARKER",
  "MISSING_CORPUS_REVIEW",
  "CORPUS_REVIEW_INCOMPLETE",
  "LOAD_ERROR",
]);

/**
 * Compute the readiness verdict from a validation result.
 * Pure, deterministic function.
 */
export function computeReadiness(validation: CorpusValidationResult): ReadinessReport {
  const hardFailures = validation.errors.filter((e) => HARD_FAILURE_CODES.has(e.code));
  const softWarnings = validation.warnings;

  const verdict: ReadinessVerdict = hardFailures.length === 0
    ? "CORPUS_READY"
    : "CORPUS_NOT_READY";

  return {
    verdict,
    hash: validation.hash,
    hardFailureCount: hardFailures.length,
    softWarningCount: softWarnings.length,
    hardFailures: hardFailures.map((e) => ({ code: e.code, message: e.message })),
    softWarnings: softWarnings.map((w) => ({ code: w.code, message: w.message })),
    summary: validation.summary,
    asOf: "1970-01-01T00:00:00.000Z", // Deterministic, can be overridden at serialization
    schemaVersion: "1.0",
  };
}

/**
 * Convenience: validate then compute readiness in one call.
 */
export function checkReadiness(opts: {
  manifestPath: string;
  rootDir: string;
  reviewPath?: string;
}): ReadinessReport {
  const validation = validateCorpus(opts);
  return computeReadiness(validation);
}
