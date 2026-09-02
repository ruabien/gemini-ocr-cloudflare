# LexOCR OCR Model Benchmark — Operator Corpus Workflow

## Overview

This document describes how the operator builds, validates, and freezes the benchmark corpus.

- **PHASE C1** (this session): build offline corpus preparation tooling. No real corpus.
- **PHASE C2** (future): operator populates the ~50-page real corpus, runs reviewer workflow, computes hash, pins freeze record, confirms `CORPUS_READY = YES`.

## Workspace Layout

```
tmp/ocr-benchmark/                          # gitignored (C2 operator workspace)
├── manifest.json                           # operator's real manifest
├── corpus-review.json                      # operator's privacy + review confirmation
├── corpus-freeze.json                      # machine-readable freeze record
├── corpus-hash.txt                         # SHA-256 hex output
├── readiness-report.txt                    # PHASE C readiness output
├── pages/                                  # real OCR input images
├── references/                             # real reference text files
├── annotations/                            # real annotation files
└── corpus-versions/                        # pinned freeze records
```

The `tmp/ocr-benchmark/` directory is **gitignored**. Do NOT force-add anything from it.

## PHASE C1 (Tooling)

```bash
npm run test:benchmark:corpus   # corpus tooling tests
npm run test:benchmark           # existing benchmark tests
npm test                        # full test suite

# Canonical synthetic fixture validation (must PASS)
npx tsx scripts/benchmark/corpus-cli.ts validate \
  --manifest scripts/benchmark/corpus-synthetic-fixture/manifest.json \
  --root scripts/benchmark/corpus-synthetic-fixture

# Canonical synthetic fixture readiness (must be CORPUS_READY = YES)
npx tsx scripts/benchmark/corpus-cli.ts ready \
  --manifest scripts/benchmark/corpus-synthetic-fixture/manifest.json \
  --root scripts/benchmark/corpus-synthetic-fixture \
  --review scripts/benchmark/corpus-synthetic-fixture/corpus-review.json
```

## PHASE C2 (Operator Populates Real Corpus)

### 1. Prepare pages, references, annotations

Manual work, ~50 pages across 5 categories:

| Category | Target | Notes |
|---|---|---|
| `CLEAN_JUDGMENT` | 10 | Publicly available judgments |
| `POOR_SCAN` | 10 | Photocopies, faded scans, low-quality |
| `MINUTES_STATEMENTS` | 10 | Biên bản (synthetic + real) |
| `STRUCTURED_DOCUMENT` | 10 | Notices, decisions, forms |
| `DIFFICULT_LEGAL_PAGE` | 10 | Stamps, handwriting, skew, tables |

### 2. Validate (offline, no network)

```bash
npx tsx scripts/benchmark/corpus-cli.ts validate \
  --manifest tmp/ocr-benchmark/manifest.json \
  --root tmp/ocr-benchmark
```

### 3. Review and confirm

Follow `HUMAN_REVIEW_CHECKLIST.md`. Update `corpus-review.json`.

### 4. Compute hash

```bash
npx tsx scripts/benchmark/corpus-cli.ts hash \
  --manifest tmp/ocr-benchmark/manifest.json \
  --root tmp/ocr-benchmark \
  --out tmp/ocr-benchmark/corpus-hash.txt
```

### 5. Check readiness

```bash
npx tsx scripts/benchmark/corpus-cli.ts ready \
  --manifest tmp/ocr-benchmark/manifest.json \
  --root tmp/ocr-benchmark \
  --review tmp/ocr-benchmark/corpus-review.json \
  --out tmp/ocr-benchmark/readiness-report.txt
```

### 6. If CORPUS_READY = YES → freeze

```bash
npx tsx scripts/benchmark/corpus-cli.ts freeze \
  --manifest tmp/ocr-benchmark/manifest.json \
  --root tmp/ocr-benchmark \
  --review tmp/ocr-benchmark/corpus-review.json \
  --out tmp/ocr-benchmark/corpus-freeze.json
```

### 7. Archive freeze

```bash
mkdir -p tmp/ocr-benchmark/corpus-versions/v1
copy tmp/ocr-benchmark/corpus-freeze.json tmp/ocr-benchmark/corpus-versions/v1/
copy tmp/ocr-benchmark/corpus-hash.txt tmp/ocr-benchmark/corpus-versions/v1/
copy tmp/ocr-benchmark/readiness-report.txt tmp/ocr-benchmark/corpus-versions/v1/
```

### 8. Dry-run validation with real corpus (existing harness)

```bash
npx tsx scripts/benchmark/ocr-model-benchmark.ts \
  --manifest tmp/ocr-benchmark/manifest.json \
  --pricing tmp/ocr-benchmark/pricing.json \
  --dryRun
```

## Repinning the Corpus (No Silent Repin)

If a reference error is discovered after pinning:

1. Increment `corpusVersion` in `corpus-freeze.json`.
2. Renew readiness review (`piiChecked` re-confirmed for any changed pages).
3. Re-run `npx tsx scripts/benchmark/corpus-cli.ts ready ...`.
4. Re-pin `corpus-hash.txt` and `corpus-freeze.json`.
5. Archive the new version in `corpus-versions/`.

> Note: `corpusHash` identifies corpus **content**. `corpusVersion` is part of the freeze record, NOT part of the hash. The same content always yields the same hash regardless of version.

## Privacy / Pre-Commit Audit

Before committing any tracked files, manually inspect staged content:

```bash
git diff --staged
```

Search for patterns that would indicate real PII:

- `CCCD`, `CMND`, `SĐT`, `Số điện thoại`
- `\b\d{9,12}\b` (long digit runs)
- Real party names, case numbers, signatures

The canonical synthetic fixture uses only fictional Unicode-escaped data. No real data should appear in tracked files.

## PHASE D Blockers

PHASE D MUST NOT begin until ALL of these are true:

1. C1 tooling exists and passes all tests.
2. C2 is complete: 50 real corpus pages with `REFERENCE_VERIFIED` status.
3. `corpus-review.json` has `piiChecked=true` for every page.
4. `corpus-freeze.json` exists with `corpusHash` matching current computed hash.
5. `npx tsx scripts/benchmark/corpus-cli.ts ready ...` exits 0 with `CORPUS_READY = YES`.
6. The operator has explicitly toggled to ACT mode for PHASE D in a new session.
7. `GEMINI_BENCH_KEY` is available (or operator confirms dry-run-first rehearsal).

## Security

- No API keys in this workspace.
- No real personal data, CCCD, or case data in tracked files.
- All synthetic fixtures in `scripts/benchmark/corpus-synthetic-fixture/` are fictional.
- The real corpus lives only in the gitignored `tmp/ocr-benchmark/`.