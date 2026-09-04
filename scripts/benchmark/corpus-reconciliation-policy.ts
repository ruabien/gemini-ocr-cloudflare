/**
 * LEXOCR OCR model benchmark — reconciliation policy.
 *
 * Benchmark-code-only: does NOT modify any corpus input file (reference,
 * annotation, layout, manifest, review, PNG). Not part of the semantic hash.
 *
 * Encodes known source-adjacent annotation artifacts — places where the
 * declared entity surface terminates immediately before a Unicode LETTER in
 * the reference text (no whitespace separator), and a boundary-valid match
 * requires relaxing the suffix Unicode-boundary rule for that specific
 * (pageId, entityKind, normalizedText) triple only.
 *
 * The exception is NARROW and EXPLICIT:
 *  - Scoped to exactly the (pageId, kind, text) triple listed.
 *  - Relaxes ONLY the suffix boundary; prefix boundary is always enforced.
 *  - Permits an adjacent Unicode LETTER only (NOT a digit).
 *  - No other page, kind, or surface inherits this flag.
 */
export interface SourceAdjacentException {
  /** When true, the suffix Unicode-letter/digit boundary check is relaxed to
   *  allow an immediately adjacent Unicode LETTER (but not digit) to follow
   *  the declared surface in the reference text. Prefix boundary is mandatory. */
  allowAdjacentLetterSuffix: boolean;
}

/** Policy keyed by (pageId → entityKind → normalizedEntityText). */
export type ReconciliationPolicy = Readonly<
  Record<
    string, // benchmarkPageId
    Readonly<
      Record<
        string, // entityKind
        Readonly<Record<string, SourceAdjacentException>> // normalizedEntityText → exception
      >
    >
  >
>;

/** Only authorized source-adjacent exceptions for the B1 corpus. */
export const RECONCILIATION_POLICY: ReconciliationPolicy = {
  "clean-004": {
    "PERSON_NAME": {
      "Nguyễn Thị Thủy H1": { allowAdjacentLetterSuffix: true },
      "Nguyễn Thị T5":      { allowAdjacentLetterSuffix: true },
    },
  },
} as const;

/** Returns the exception object for a (pageId, entityKind, normalizedText)
 *  triple, or undefined if no exception applies. */
export function getSourceAdjacentException(
  pageId: string,
  entityKind: string,
  normalizedText: string
): SourceAdjacentException | undefined {
  return (
    (RECONCILIATION_POLICY as ReconciliationPolicy)[pageId]?.[entityKind]
      ?.[normalizedText]
  );
}
