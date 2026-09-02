/**
 * LEXOCR OCR model benchmark — three-tier legal-critical evaluator.
 *
 * Tiers:
 *  A. REFERENCE_ANCHORED_RECALL — PERSON_NAME / ORGANIZATION_NAME / ADDRESS.
 *     Only exactRecall is reported. Precision/F1 is NEVER fabricated.
 *  B. AUTO_MEASURED — DATE / MONEY_AMOUNT / DOCUMENT_NUMBER / LEGAL_ARTICLE /
 *     LEGAL_CLAUSE_POINT / LAND_PARCEL_NUMBER / MAP_SHEET_NUMBER /
 *     IDENTIFICATION_NUMBER. Deterministic extractors with documented regex
 *     contracts. Precision + recall + F1 are computed.
 *  C. HUMAN_REVIEW_REQUIRED — ambiguous extras / hallucinations. Emitted as a
 *     separate list, never auto-scored as precision.
 */
import {
  AUTO_MEASURED_TYPES,
  REFERENCE_ANCHORED_TYPES,
  type EntityMetric,
  type HumanReviewRequiredEntry,
  type PageReference,
} from "./types";

/**
 * Low-level diacritic-insensitive normalization. Intended ONLY for diagnostic
 * use (via {@link diagnosticDiacriticInsensitiveMatch}); it is NOT used by
 * any authoritative legal-critical matching function.
 *
 * Authoritative matching uses {@link normalizeForAuthoritativeMatch} which
 * preserves all Vietnamese diacritics.
 */
export function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * AUTHORITATIVE normalization for legal-critical exact matching.
 *
 * Contract (locked):
 *  - Unicode normalization: NFC (precomposed). Required so canonically
 *    equivalent forms (e.g. U+1EA5 vs U+00C2+U+0309) compare equal.
 *  - Vietnamese diacritics are PRESERVED. Two strings that differ only in
 *    the presence of diacritics (e.g. "Nguyễn" vs "Nguyen") are NOT equal.
 *  - Whitespace is collapsed to single spaces; leading/trailing trimmed.
 *  - Case is preserved (no lowercasing). Vietnamese convention already
 *    distinguishes the capital "Đ" / "đ" and diacritics, and case folding
 *    is outside the scope of legal-critical authoritative matching.
 *
 * This function does NOT introduce fuzzy matching.
 */
export function normalizeForAuthoritativeMatch(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Non-authoritative DIAGNOSTIC: diacritic-insensitive containment.
 *
 * This MAY be used only for diagnostic reporting (e.g. "would this match
 * if diacritics were ignored?") and MUST NOT affect any authoritative
 * metric: not exactRecall, not precision, not recall, not f1, not
 * humanReviewRequired, not PASS/FAIL, not model recommendation.
 */
export function diagnosticDiacriticInsensitiveMatch(
  referenceText: string,
  candidate: string
): boolean {
  return stripDiacritics(referenceText).includes(stripDiacritics(candidate));
}

/**
 * AUTHORITATIVE reference-entity presence check (diacritic-sensitive, NFC).
 *
 * Tier A and Tier C reference checks use this function. Vietnamese
 * diacritics are preserved: "Nguyễn Văn X" is NOT considered present in
 * text that contains only "Nguyen Van X".
 *
 * Whitespace is normalized via {@link normalizeForAuthoritativeMatch} so
 * "Nguyễn   Văn   X" matches "Nguyễn Văn X" (whitespace-only difference
 * is part of the approved normalization contract).
 */
export function referenceEntityPresent(referenceText: string, candidate: string): boolean {
  const normRef = normalizeForAuthoritativeMatch(referenceText);
  const normCand = normalizeForAuthoritativeMatch(candidate);
  if (normCand.length === 0) return false;
  return normRef.includes(normCand);
}

// ── Auto-measured extractors (documented regex contracts) ───────

export interface ExtractorContract {
  type: string;
  regex: RegExp;
  /** Optional transform to canonical form before matching. */
  normalize?: (match: string) => string;
  knownAmbiguity?: string;
}

export const EXTRACTOR_CONTRACTS: Record<string, ExtractorContract> = {
  DATE: {
    type: "DATE",
    regex:
      /\b(?:ngày\s*)?(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b|ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/gi,
    knownAmbiguity:
      "Leading zeros optional; 'ngày' prefix optional; some references omit 'ngày'.",
  },
  MONEY_AMOUNT: {
    type: "MONEY_AMOUNT",
    regex: /\b\d{1,3}(?:\.\d{3})+(?:,\d+)?\s*(?:VNĐ|đồng|Đ|D)?\b|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:triệu|tỷ)\b/gi,
    knownAmbiguity:
      "Period vs comma thousand separators in Vietnamese; 'triệu'/'tỷ' abbreviations.",
  },
  DOCUMENT_NUMBER: {
    type: "DOCUMENT_NUMBER",
    regex:
      /\b(?:Số|QĐ|Quyết định số|BN|Bản án số|HC|HS số|TB số)[^\n]{1,80}?\b|\b[A-ZĐ]{1,5}[/\-]\d{1,6}(?:[/\-][A-Z]{0,5})?\b/gi,
    knownAmbiguity:
      "Document-number prefixes vary by agency; harness uses an extensible allowlist.",
  },
  LEGAL_ARTICLE: {
    type: "LEGAL_ARTICLE",
    regex: /(?:^|[\s.,;:])(Điều)\s+\d+(?:\.\d+)?/giu,
    knownAmbiguity: "Case-insensitive ('Điều 1' vs 'điều 1'); section ranges counted as multiple.",
  },
  LEGAL_CLAUSE_POINT: {
    type: "LEGAL_CLAUSE_POINT",
    regex: /\b(?:Khoản|Điểm)\s+\d+(?:[a-z])?\b/gi,
    knownAmbiguity: "'Khoản 2 Điều 1' — both must be present together.",
  },
  LAND_PARCEL_NUMBER: {
    type: "LAND_PARCEL_NUMBER",
    regex: /\b(?:thửa|thửa đất|thửa ruộng)\s*(?:số)?\s*\d+\b|\b\d+\s*[A-Z]\b/gi,
    knownAmbiguity: "Reference context window required (page-level).",
  },
  MAP_SHEET_NUMBER: {
    type: "MAP_SHEET_NUMBER",
    regex: /\b(?:tờ\s*|tờ bản đồ số|tờ BĐ số)\s*\d+(?:\.\d+)?\b/gi,
    knownAmbiguity: "Variants: 'tờ 12', 'tờ bản đồ số 12'.",
  },
  IDENTIFICATION_NUMBER: {
    type: "IDENTIFICATION_NUMBER",
    regex:
      /\b(?:CCCD|CMND|Số CMND|Số CCCD)[:\s]*\d{9,12}\b|\b\d{9,12}\b/gi,
    knownAmbiguity: "Bare-digit ambiguity with phone/money; context window required.",
  },
};

/** Extract candidate entity strings from model output for a given type. */
export function extractCandidates(type: string, modelText: string): string[] {
  const contract = EXTRACTOR_CONTRACTS[type];
  if (!contract) return [];
  const matches = modelText.match(contract.regex) ?? [];
  return matches.map((m) => (contract.normalize ? contract.normalize(m) : m.trim()));
}

﻿

// ── Tier A: reference-anchored exact recall ─────────────────────

/**
 * Evaluate a reference-anchored entity type (PERSON_NAME / ORGANIZATION_NAME /
 * ADDRESS). Only exactRecall is computed; precision / recall / f1 are null.
 */
export function evaluateReferenceAnchored(
  type: string,
  reference: PageReference,
  modelText: string
): EntityMetric {
  const refEntities = reference.entities.filter((e) => e.kind === type);
  const refCount = refEntities.length;

  let correct = 0;
  let missing = 0;
  for (const ref of refEntities) {
    const present = referenceEntityPresent(modelText, ref.text);
    if (present) correct++;
    else missing++;
  }

  const exactRecall = refCount > 0 ? correct / refCount : null;

  return {
    measurementMode: "REFERENCE_ANCHORED_RECALL",
    refCount,
    correct,
    incorrect: null,
    missing,
    exactRecall,
    precision: null,
    recall: null,
    f1: null,
    humanReviewRequired: false,
  };
}

// ── Tier B: deterministic precision + recall ────────────────────

/**
 * Evaluate an auto-measured entity type. Computes precision / recall / f1 when
 * both reference and extracted counts are well-defined. Otherwise nulls.
 */
export function evaluateAutoMeasured(
  type: string,
  reference: PageReference,
  modelText: string
): EntityMetric {
  const refEntities = reference.entities.filter((e) => e.kind === type);
  const refCount = refEntities.length;
  const extracted = extractCandidates(type, modelText);
  const extractedCount = extracted.length;

  // Match reference entities to extracted candidates (authoritative NFC,
  // diacritic-sensitive — see normalizeForAuthoritativeMatch).
  const unmatchedRef = refEntities.filter(
    (r) =>
      !extracted.some(
        (c) => normalizeForAuthoritativeMatch(c) === normalizeForAuthoritativeMatch(r.text)
      )
  );
  const missing = unmatchedRef.length;

  // Extras = extracted that match no reference entity (potential hallucinations).
  // These are flagged separately via humanReviewRequired when ambiguous.
  const extras = extracted.filter(
    (c) =>
      !refEntities.some(
        (r) => normalizeForAuthoritativeMatch(r.text) === normalizeForAuthoritativeMatch(c)
      )
  );

  const correct = refCount - missing;
  const incorrect = extras.length;

  const precision = extractedCount > 0 ? correct / extractedCount : null;
  const recall = refCount > 0 ? correct / refCount : null;
  let f1: number | null = null;
  if (precision !== null && recall !== null && precision + recall > 0) {
    f1 = (2 * precision * recall) / (precision + recall);
  }

  return {
    measurementMode: "AUTO_MEASURED",
    refCount,
    correct,
    incorrect,
    missing,
    exactRecall: null,
    precision,
    recall,
    f1,
    humanReviewRequired: extras.length > 0,
  };
}

// ── Tier C: human-review-required extras ───────────────────────

/**
 * Collect human-review-required entries:
 *  - Extra (hallucinated) candidates for auto-measured types.
 *  - Extra person/org/address candidates not in the reference for anchored types.
 */
export function collectHumanReviewRequired(
  reference: PageReference,
  modelText: string
): HumanReviewRequiredEntry[] {
  const out: HumanReviewRequiredEntry[] = [];

  for (const type of AUTO_MEASURED_TYPES) {
    const refEntities = reference.entities.filter((e) => e.kind === type);
    const extracted = extractCandidates(type, modelText);
    for (const c of extracted) {
      const matchesRef = refEntities.some(
        (r) => normalizeForAuthoritativeMatch(r.text) === normalizeForAuthoritativeMatch(c)
      );
      if (!matchesRef) {
        out.push({ kind: `EXTRA_${type}`, candidate: c });
      }
    }
  }

  for (const type of REFERENCE_ANCHORED_TYPES) {
    const refEntities = reference.entities.filter((e) => e.kind === type);
    // For anchored types we do not have a deterministic extractor, so we can
    // only flag explicit reference-entity candidates that are NOT present.
    // Here we emit a flag only when a reference entity is missing (would be
    // manually reviewed). No fabricated precision.
    for (const r of refEntities) {
      const present = referenceEntityPresent(modelText, r.text);
      if (!present) {
        out.push({
          kind: `MISSING_${type}`,
          candidate: r.text,
          referenceText: reference.rawText,
        });
      }
    }
  }

  return out;
}


/**
 * Evaluate all entity types for a single page and return a map keyed by type.
 * Only REFERENCE_VERIFIED pages should be scored (caller enforces).
 */
export function evaluatePageLegalMetrics(
  reference: PageReference,
  modelText: string
): Record<string, EntityMetric> {
  const result: Record<string, EntityMetric> = {};

  for (const type of REFERENCE_ANCHORED_TYPES) {
    result[type] = evaluateReferenceAnchored(type, reference, modelText);
  }
  for (const type of AUTO_MEASURED_TYPES) {
    result[type] = evaluateAutoMeasured(type, reference, modelText);
  }
  return result;
}

/**
 * Mark a metric as INSUFFICIENT_EVIDENCE when occurrence count is too low.
 * Returns a new metric with measurementMode overridden and all numeric fields
 * nulled if `refCount < minOccurrences`.
 */
export function applyInsufficientEvidence(
  metric: EntityMetric,
  refCount: number,
  minOccurrences: number
): EntityMetric {
  if (refCount < minOccurrences) {
    return {
      measurementMode: "INSUFFICIENT_EVIDENCE",
      refCount,
      correct: null,
      incorrect: null,
      missing: null,
      exactRecall: null,
      precision: null,
      recall: null,
      f1: null,
      humanReviewRequired: metric.humanReviewRequired,
    };
  }
  return metric;
}

