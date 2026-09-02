/**
 * LEXOCR OCR model benchmark — quality evaluator.
 *
 * Provides:
 *  - Character Error Rate (CER) via Levenshtein distance.
 *  - Word Error Rate (WER) via tokenized Levenshtein distance.
 *  - Normalization mirroring the production post-processing pipeline
 *    (cleanOcrPageText from shared/ocrPostProcessing.ts).
 *  - Malformed-output classification. MALFORMED_MODEL_OUTPUT is a first-
 *    class failure — the benchmark NEVER repairs malformed output.
 */
import { cleanOcrPageText } from "../../shared/ocrPostProcessing";
import { stripAiIntroLine } from "./canonicalContract";


export interface LevenshteinResult {
  distance: number;
  /** substitutions */
  substitutions: number;
  /** deletions */
  deletions: number;
  /** insertions */
  insertions: number;
}

/**
 * Compute Levenshtein distance between two arrays of comparable items.
 * Cost model: substitution = 1, insertion = 1, deletion = 1.
 */
export function levenshteinDistance<T>(a: readonly T[], b: readonly T[]): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}


/**
 * Compute Levenshtein distance with an edit-script breakdown (S/D/I counts).
 */
export function levenshteinWithBreakdown<T>(
  a: readonly T[],
  b: readonly T[]
): LevenshteinResult {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  let i = n;
  let j = m;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions++;
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      deletions++;
      i--;
    } else {
      insertions++;
      j--;
    }
  }

  return { distance: dp[n][m], substitutions, deletions, insertions };
}


/** Normalize a string for CER/WER comparison. */
export function normalizeForComparison(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u00A0\u200B\uFEFF]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

/** Tokenize a normalized string into words for WER. */
export function tokenizeForWer(text: string): string[] {
  const normalized = normalizeForComparison(text);
  return normalized
    .split(/[\s,.;:!?()[\]{}"']+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Character array for CER (code points, not UTF-16 units). */
export function charArray(text: string): string[] {
  return Array.from(normalizeForComparison(text));
}

/**
 * Compute CER. Returns null when the reference has no characters.
 * CER = (S + D + I) / N where N = reference char count.
 */
export function computeCer(reference: string, hypothesis: string): number | null {
  const refChars = charArray(reference);
  const hypChars = charArray(hypothesis);
  if (refChars.length === 0) return null;
  const { distance } = levenshteinWithBreakdown(refChars, hypChars);
  return distance / refChars.length;
}

/**
 * Compute WER. Returns null when the reference has no words.
 * WER = (S + D + I) / N_words.
 */
export function computeWer(reference: string, hypothesis: string): number | null {
  const refWords = tokenizeForWer(reference);
  const hypWords = tokenizeForWer(hypothesis);
  if (refWords.length === 0) return null;
  const { distance } = levenshteinWithBreakdown(refWords, hypWords);
  return distance / refWords.length;
}

// ── Malformed-output classification ─────────────────────────────

export type MalformedClassification =
  | "OK"
  | "MALFORMED_MODEL_OUTPUT"
  | "GEMINI_FAILURE"
  | "BOTH_FAILED";

export interface ClassifyResponseInput {
  httpStatus: number | null;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  fallbackUsed?: boolean;
  fallbackSucceeded?: boolean;
}

/**
 * Classify a Gemini response.
 *
 * - `GEMINI_FAILURE`: non-2xx HTTP status or network error.
 * - `MALFORMED_MODEL_OUTPUT`: HTTP 200 but no usable text in the canonical
 *   response contract (`candidates[0].content.parts[0].text`). The benchmark
 *   NEVER repairs this into a successful OCR result.
 * - `BOTH_FAILED`: Gemini failed AND the OCR.space fallback also failed.
 * - `OK`: usable text present.
 */
export function classifyResponse(input: ClassifyResponseInput): MalformedClassification {
  const status = input.httpStatus;
  if (status === null || status < 200 || status >= 300) {
    if (input.fallbackUsed) {
      return input.fallbackSucceeded ? "MALFORMED_MODEL_OUTPUT" : "BOTH_FAILED";
    }
    return "GEMINI_FAILURE";
  }

  const text = input.candidates?.[0]?.content?.parts?.[0]?.text;
  const hasUsableText = typeof text === "string" && text.trim().length > 0;

  if (!hasUsableText) {
    return "MALFORMED_MODEL_OUTPUT";
  }
  return "OK";
}


/**
 * Apply the production post-processing chain to model text.
 * Mirrors `OcrScanner.tsx`: strip AI-intro line, then `cleanOcrPageText`.
 */
export function applyCanonicalPostProcessing(
  rawModelText: string,
  pageIndex?: number
): string {
  const stripped = stripAiIntroLine(rawModelText);
  return cleanOcrPageText(stripped, { pageIndex });
}

