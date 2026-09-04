/**
 * LEXOCR OCR model benchmark - deterministic C2-B1 entity-occurrence reconciliation.
 * Reconciles declared occurrence counts against authoritative reference text.
 * Allocation is independent per entity kind.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeForAuthoritativeMatch } from "./ocr-legal-evaluator";
import { getSourceAdjacentException } from "./corpus-reconciliation-policy";
import { readJsonFile, type EntitySourceAnnotation } from "./corpus-hash";
import type { BenchmarkManifest } from "./types";

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const LETTER = /[\p{L}]/u;
const DIGIT = /[\p{N}]/u;

function isLetterOrDigit(ch: string | undefined): boolean {
  return ch !== undefined && LETTER_OR_DIGIT.test(ch);
}

function isLetter(ch: string | undefined): boolean {
  return ch !== undefined && LETTER.test(ch);
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && DIGIT.test(ch);
}

function hasLetterDigitPrefix(text: string, position: number): boolean {
  return position === 0 || !isLetterOrDigit(text[position - 1]);
}

function hasLetterDigitSuffix(text: string, endPosition: number): boolean {
  return endPosition >= text.length || !isLetterOrDigit(text[endPosition]);
}

export interface ReconcileEntry {
  kind: string;
  text: string;
  declared: number;
  reconciled: number;
  matchedPositions: number[];
}

export interface ReconciliationInputFailure {
  input: "reference" | "entity annotation";
  reason: string;
}

export interface PerPageReconcileResult {
  benchmarkPageId: string;
  entries: number;
  declared: number;
  reconciled: number;
  mismatches: number;
  detail: ReconcileEntry[];
  inputFailures: ReconciliationInputFailure[];
}

export interface ReconcileResult {
  pages: PerPageReconcileResult[];
  totalEntries: number;
  totalDeclared: number;
  totalReconciled: number;
  totalMismatches: number;
  inputFailureCount: number;
}

/** Reconcile one entity kind using normalized-reference coordinates only. */
export function reconcileKind(
  pageId: string,
  kind: string,
  entities: EntitySourceAnnotation[],
  referenceText: string,
): ReconcileEntry[] {
  const normalizedReference = normalizeForAuthoritativeMatch(referenceText);
  const bySurface = new Map<string, { entry: EntitySourceAnnotation; declared: number }>();

  for (const entity of entities) {
    const normalizedSurface = normalizeForAuthoritativeMatch(entity.text);
    if (normalizedSurface.length === 0) {
      throw new Error(`Invalid reconciliation entity surface: ${pageId}/${kind} normalizes to empty text.`);
    }
    const existing = bySurface.get(normalizedSurface);
    if (existing) existing.declared += entity.occurrences ?? 1;
    else bySurface.set(normalizedSurface, { entry: entity, declared: entity.occurrences ?? 1 });
  }

  const surfaces = [...bySurface.entries()].sort(([a], [b]) => b.length - a.length || a.localeCompare(b));
  const allocated = new Array(normalizedReference.length).fill(false);
  const results: ReconcileEntry[] = [];

  for (const [normalizedSurface, { entry, declared }] of surfaces) {
    const matchedPositions: number[] = [];
    let reconciled = 0;
    let cursor = 0;
    while (cursor <= normalizedReference.length - normalizedSurface.length) {
      const position = normalizedReference.indexOf(normalizedSurface, cursor);
      if (position === -1) break;

      const prefixOk = hasLetterDigitPrefix(normalizedReference, position);
      const endPosition = position + normalizedSurface.length;
      const rawSuffixOk = hasLetterDigitSuffix(normalizedReference, endPosition);
      let suffixOk = rawSuffixOk;
      if (!rawSuffixOk) {
        const exception = getSourceAdjacentException(pageId, kind, normalizedSurface);
        if (exception?.allowAdjacentLetterSuffix) {
          const nextCharacter = normalizedReference[endPosition];
          suffixOk = isLetter(nextCharacter) && !isDigit(nextCharacter);
        }
      }

      let unallocated = true;
      for (let index = position; index < endPosition; index++) {
        if (allocated[index]) {
          unallocated = false;
          break;
        }
      }
      if (prefixOk && suffixOk && unallocated) {
        for (let index = position; index < endPosition; index++) allocated[index] = true;
        matchedPositions.push(position);
        reconciled++;
        cursor = endPosition;
      } else {
        cursor = position + 1;
      }
    }
    results.push({ kind, text: entry.text, declared, reconciled, matchedPositions });
  }
  return results;
}

const REFERENCE_VERIFIED = "REFERENCE_VERIFIED";

function failureReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reconcile every manifest page with a verified reference. Missing/unreadable
 * inputs fail closed and are represented as reconciliation mismatches.
 */
export function reconcileCorpus(manifest: BenchmarkManifest, rootDir: string): ReconcileResult {
  const pages: PerPageReconcileResult[] = [];
  let totalEntries = 0;
  let totalDeclared = 0;
  let totalReconciled = 0;
  let totalMismatches = 0;
  let inputFailureCount = 0;

  for (const page of manifest.pages) {
    if (page.referenceStatus !== REFERENCE_VERIFIED) continue;
    const pageId = page.benchmarkPageId;
    const referencePath = join(rootDir, "references", `${pageId}.ref.txt`);
    const entitiesPath = join(rootDir, "annotations", `${pageId}.entities.json`);
    const inputFailures: ReconciliationInputFailure[] = [];
    let referenceText: string | undefined;
    let entities: EntitySourceAnnotation[] | undefined;

    try {
      referenceText = readFileSync(referencePath, "utf8");
    } catch (error) {
      inputFailures.push({ input: "reference", reason: failureReason(error) });
    }
    try {
      const parsed = readJsonFile<unknown>(entitiesPath);
      if (!Array.isArray(parsed)) throw new Error("Entity annotation must be a JSON array.");
      entities = parsed as EntitySourceAnnotation[];
    } catch (error) {
      inputFailures.push({ input: "entity annotation", reason: failureReason(error) });
    }

    if (inputFailures.length > 0) {
      pages.push({ benchmarkPageId: pageId, entries: 0, declared: 0, reconciled: 0, mismatches: 1, detail: [], inputFailures });
      totalMismatches++;
      inputFailureCount += inputFailures.length;
      continue;
    }

    const byKind = new Map<string, EntitySourceAnnotation[]>();
    for (const entity of entities!) {
      const kindEntities = byKind.get(entity.kind) ?? [];
      kindEntities.push(entity);
      byKind.set(entity.kind, kindEntities);
    }

    const detail: ReconcileEntry[] = [];
    let pageDeclared = 0;
    let pageReconciled = 0;
    let pageMismatches = 0;
    try {
      for (const [kind, kindEntities] of byKind) {
        for (const entry of reconcileKind(pageId, kind, kindEntities, referenceText!)) {
          detail.push(entry);
          pageDeclared += entry.declared;
          pageReconciled += entry.reconciled;
          if (entry.declared !== entry.reconciled) pageMismatches++;
        }
      }
    } catch (error) {
      inputFailures.push({ input: "entity annotation", reason: failureReason(error) });
      pageMismatches = 1;
      inputFailureCount++;
    }

    pages.push({ benchmarkPageId: pageId, entries: detail.length, declared: pageDeclared, reconciled: pageReconciled, mismatches: pageMismatches, detail, inputFailures });
    totalEntries += detail.length;
    totalDeclared += pageDeclared;
    totalReconciled += pageReconciled;
    totalMismatches += pageMismatches;
  }
  return { pages, totalEntries, totalDeclared, totalReconciled, totalMismatches, inputFailureCount };
}

export function formatReconcileReport(result: ReconcileResult): string {
  const lines = ["--- corpus reconcile ---"];
  for (const page of result.pages) {
    lines.push(`  ${page.benchmarkPageId.padEnd(10)} entries=${String(page.entries).padStart(3)} declared=${String(page.declared).padStart(3)} reconciled=${String(page.reconciled).padStart(3)} mismatches=${page.mismatches}`);
    for (const failure of page.inputFailures) {
      lines.push(`    [INPUT FAILURE] pageId=${page.benchmarkPageId} input=${failure.input} reason=${failure.reason}`);
    }
  }
  lines.push("");
  lines.push(`TOTAL_ENTITY_ENTRIES            = ${result.totalEntries}`);
  lines.push(`TOTAL_DECLARED_OCCURRENCES     = ${result.totalDeclared}`);
  lines.push(`TOTAL_RECONCILED_OCCURRENCES   = ${result.totalReconciled}`);
  lines.push(`TOTAL_RECONCILIATION_MISMATCHES = ${result.totalMismatches}`);
  lines.push(`TOTAL_RECONCILIATION_INPUT_FAILURES = ${result.inputFailureCount}`);
  return lines.join("\n");
}