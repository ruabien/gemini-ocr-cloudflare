# LexOCR OCR Model Benchmark — PHASE C Schema Notes

## 1. No types.ts Schema Change

PHASE C does NOT modify `types.ts`. All existing types (`BenchmarkManifest`, `BenchmarkPageEntry`, `PageReference`, `ReferenceEntityEntry`, `EntityMetric`, `ALL_ENTITY_TYPES`, etc.) remain unchanged.

## 2. Sidecar Annotations

PHASE C introduces two per-page annotation files that live alongside the manifest and reference files. These are **not** part of `types.ts`.

### `annotations/<pageId>.entities.json`

A JSON array of entity annotations. Each entry:

```json
{ "kind": "PERSON_NAME", "text": "Nguyễn Văn X" }
```

Optional fields:
- `category` (string) — human-readable hint (`"judgment_date"`, `"decision_number"`).
- `occurrences` (number) — if the same value appears multiple times on the same page, this field records the count. Default is 1.

**Important:** `occurrences` is corpus metadata ONLY. It is NEVER expanded into multiple `ReferenceEntityEntry` objects. The loader that builds a `PageReference` for the evaluator produces **one** entry per distinct `(kind, text)` pair. This prevents count-inflation from defeating the `n>=5` evidence threshold.

### `annotations/<pageId>.layout.json`

A JSON object with boolean fields describing the source page's visible characteristics:

```json
{
  "hasParagraphs": true, "hasHeadings": true, "hasTable": false,
  "hasList": true, "hasHeaderFooter": false, "hasMultipleColumns": false,
  "hasStamp": true, "hasHandwriting": false, "hasSkew": false
}
```

These describe SOURCE PAGE characteristics, NOT model output scoring. `hasMultipleColumns` is ONLY reported here — it is NOT a `LayoutObservation` key.

## 3. Occurrence vs Evidence Diversity

The corpus tooling reports **two** distinct metrics:

| Metric | Description |
|---|---|
| `referenceOccurrences` | Sum of `occurrences` (default 1) across the corpus for a given entity kind |
| `pagesContainingEntity` | Number of unique pages containing at least one occurrence of that entity kind |

Readiness warns separately:
- Low occurrence count: `referenceOccurrences < 5`
- Low page diversity: `pagesContainingEntity < 3`

## 4. Evaluator Limitation

The existing `applyInsufficientEvidence()` function in `ocr-legal-evaluator.ts` uses `refCount` (the number of entity entries in the reference) as its evidence threshold. This is evaluator-level only.

**PHASE D's decision layer** must additionally inspect `pagesContainingEntity` before drawing a model-routing or default-model conclusion. Five repetitions on one page do NOT provide the same evidentiary diversity as five independent pages.

The evaluator is NOT modified in C1. This limitation is documented here and will be addressed in PHASE D.

## 5. Corpus Hash

`computeCorpusHash()` in `corpus-hash.ts` produces a deterministic SHA-256 over canonicalised corpus content.

**Hash inputs (only semantic corpus content):**
- Manifest metadata (page IDs, categories, difficulties, image formats, file names)
- Input image bytes (SHA-256 of raw file content)
- Reference text (NFC)
- Entity source annotations (distinct values, sorted)
- Layout source annotations (sorted keys)
- `corpus-review.json` (privacy/review metadata)

**Not in hash:**
- `corpus-freeze.json` (the freeze record is an OUTPUT of hashing)
- `corpus-hash.txt`
- `readiness-report.txt`
- `corpus-version` (belongs to the freeze record, not content)
- `createdAt` (belongs to the freeze record, not content)

**Properties:**
- Order-independent: manifest pages are sorted by `benchmarkPageId` before hashing
- Image-byte-dependent: replacing an image while keeping the filename changes the hash
- Version-invariant: same content → same hash regardless of `corpusVersion`

## 6. Freeze Record

The freeze record (`corpus-freeze.json`) is an OUTPUT produced AFTER hashing and readiness. It contains:

```json
{
  "schemaVersion": "1.0",
  "corpusVersion": 1,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "totalPages": 50,
  "verifiedReferenceCount": 50,
  "categoryCounts": { ... },
  "legalCriticalCoverage": { ... },
  "layoutCoverage": { ... },
  "corpusHash": "sha256..."
}
```

Freeze lifecycle: `semantic corpus → compute hash → readiness → freeze → corpus-freeze.json`.

## 7. Privacy Review Model

PII heuristic detection is a **review trigger**, not proof of privacy. Human confirmation in `corpus-review.json` is authoritative.

- Heuristic hits are warnings requiring acknowledgement.
- `piiChecked: true` per page is required for `CORPUS_READY = YES`.
- Reviewed synthetic/test values do NOT block readiness.
- Unreviewed heuristic hits block readiness.

## 8. Layout Source Annotation vs LayoutObservation

| Aspect | Layout Source Annotations | LayoutObservation |
|---|---|---|
| Source | Human-verified page characteristics | Model output comparison |
| Fields | `hasParagraphs`, `hasHeadings`, `hasTable`, `hasList`, `hasHeaderFooter`, `hasMultipleColumns`, `hasStamp`, `hasHandwriting`, `hasSkew` | `tables`, `headersFooters`, `paragraphs`, `lists`, `hallucinatedBlocks`, `lineCountRatio` |
| Purpose | Corpus selection coverage | Per-page layout evaluation |
| File | `annotations/<pageId>.layout.json` | Computed in `ocr-layout-evaluator.ts` |

## 9. Page ID Scheme

Opaque page IDs follow the pattern: `<category>-<NNN>`. Examples:
- `clean-001` … `clean-010`
- `poor-001` … `poor-010`
- `minutes-001` … `minutes-010`
- `structured-001` … `structured-010`
- `difficult-001` … `difficult-010`

No real names, case numbers, or CCCD in page IDs.