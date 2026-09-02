/**
 * LEXOCR OCR model benchmark — layout evaluator.
 *
 * Produces categorical (non-numeric) layout observations on a per-page basis.
 * Bounded rubric — never a 1–100 score.
 *
 * Observed dimensions:
 *  - "tables": "preserved" | "merged_or_lost" | "not_applicable"
 *  - "headers_footers": "preserved" | "duplicated_or_dropped" | "not_applicable"
 *  - "paragraphs": "preserved" | "merged" | "split" | "not_applicable"
 *  - "lists": "preserved" | "linearized" | "not_applicable"
 *  - "hallucinated_blocks": true | false
 *  - "line_count_ratio": number (modelLines / refLines), null if ref has 0
 */
import type { PageReference } from "./types";

export interface LayoutSignals {
  referenceText: string;
  modelText: string;
}

export type LayoutObservation = Record<string, string | number | boolean | null>;

/** Count lines in a normalized text. */
function countLines(text: string): number {
  return text.split("\n").filter((l) => l.trim().length > 0).length;
}

/** Detect table-like structures in a normalized text (pipe-separated rows). */
function hasTable(text: string): boolean {
  const lines = text.split("\n");
  const tabularLines = lines.filter((l) => l.includes("|")).length;
  return tabularLines >= 2;
}

/** Detect list-like structures (lines starting with a number followed by `.` or `)`). */
function listLineCount(text: string): number {
  return text
    .split("\n")
    .filter((l) => /^\s*\d+[.)]\s/.test(l)).length;
}

/** Detect repeated headers/footers (model duplicates a line block). */
function hasRepeatedBlocks(text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const seen = new Set<string>();
  let dupes = 0;
  for (const l of lines) {
    if (seen.has(l)) dupes++;
    else seen.add(l);
  }
  return dupes >= 2;
}

/**
 * Evaluate layout for a single page.
 */
export function evaluateLayout(signals: LayoutSignals): LayoutObservation {
  const ref = signals.referenceText;
  const hyp = signals.modelText;

  const tables = hasTable(ref)
    ? hasTable(hyp)
      ? "preserved"
      : "merged_or_lost"
    : "not_applicable";

  const refLines = countLines(ref);
  const hypLines = countLines(hyp);
  const lineCountRatio = refLines > 0 ? hypLines / refLines : null;

  const refLists = listLineCount(ref);
  const hypLists = listLineCount(hyp);
  const lists =
    refLists === 0
      ? "not_applicable"
      : hypLists >= refLists
        ? "preserved"
        : "linearized";

  const paragraphCountRef = ref.split(/\n{2,}/).length;
  const paragraphCountHyp = hyp.split(/\n{2,}/).length;
  const paragraphs =
    paragraphCountRef <= 1 && paragraphCountHyp <= 1
      ? "not_applicable"
      : paragraphCountHyp === paragraphCountRef
        ? "preserved"
        : paragraphCountHyp > paragraphCountRef
          ? "split"
          : "merged";

  const refHeadersFooters = hasRepeatedBlocks(ref);
  const hypHeadersFooters = hasRepeatedBlocks(hyp);
  const headersFooters =
    !refHeadersFooters && !hypHeadersFooters
      ? "not_applicable"
      : refHeadersFooters === hypHeadersFooters
        ? "preserved"
        : "duplicated_or_dropped";

  // Hallucinated block heuristic: a substantial block of model text not
  // present in the reference (rough, not fabricated as a precise metric).
  const refWords = new Set(ref.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const hypWords = hyp.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const novel = hypWords.filter((w) => !refWords.has(w)).length;
  const hallucinatedBlocks = refWords.size > 0 && novel / hypWords.length > 0.3;

  return {
    tables,
    headersFooters,
    paragraphs,
    lists,
    hallucinatedBlocks,
    lineCountRatio,
  };
}

/** Convenience: evaluate from a PageReference. */
export function evaluateLayoutFromReference(
  reference: PageReference,
  modelText: string
): LayoutObservation {
  return evaluateLayout({ referenceText: reference.rawText, modelText });
}

﻿
