# LexOCR OCR Model Benchmark — Operator Workspace

## Overview

This directory (`tmp/ocr-benchmark/`) is the operator workspace for the LexOCR OCR model benchmark harness.

**DO NOT commit the contents of `tmp/ocr-benchmark/`** — the directory is gitignored.

## Safe Templates

The following templates are **tracked** (NOT gitignored) and contain no secrets:

- `tmp/ocr-benchmark-manifest.template.json` — benchmark corpus manifest schema
- `tmp/ocr-benchmark-pricing.template.json` — model pricing schema
- `tmp/ocr-benchmark-readme.template.md` — this file

## PHASE C1 Corpus Tooling (Offline, No Network)

The PHASE C1 tooling validates the corpus, computes its deterministic content
hash, and produces a readiness verdict. All tooling runs offline.

### Canonical Synthetic Fixture

A tracked 5-page synthetic fixture lives at
`scripts/benchmark/corpus-synthetic-fixture/`. It exists only to exercise the
tooling. It contains **no real data**.

```bash
# Validate the canonical fixture (expect VALIDATION = PASS)
npx tsx scripts/benchmark/corpus-cli.ts validate \
  --manifest scripts/benchmark/corpus-synthetic-fixture/manifest.json \
  --root scripts/benchmark/corpus-synthetic-fixture

# Check readiness (expect CORPUS_READY = YES)
npx tsx scripts/benchmark/corpus-cli.ts ready \
  --manifest scripts/benchmark/corpus-synthetic-fixture/manifest.json \
  --root scripts/benchmark/corpus-synthetic-fixture \
  --review scripts/benchmark/corpus-synthetic-fixture/corpus-review.json
```

### Operator Workflow (PHASE C2, Future)

When the operator builds the real 50-page corpus, they will:

1. Populate `tmp/ocr-benchmark/pages/`, `references/`, and `annotations/`.
2. Create `tmp/ocr-benchmark/manifest.json`.
3. Review and confirm via `tmp/ocr-benchmark/corpus-review.json`.
4. Run the corpus CLI commands (validate, ready, hash, freeze).
5. Archive the freeze record to `tmp/ocr-benchmark/corpus-versions/v1/`.

See `scripts/benchmark/OPERATOR_CORPUS_WORKFLOW.md` for the full workflow.

## Usage

### 1. Prepare corpus

Populate `tmp/ocr-benchmark/pages/` with page images and reference text files.
Create a manifest JSON at `tmp/ocr-benchmark/manifest.json` following the template.

### 2. Configure pricing

Copy `tmp/ocr-benchmark-pricing.template.json` to `tmp/ocr-benchmark/pricing.json`
and update the `asOf` date and model prices for the current Gemini pricing.

### 3. Run dry-run validation

```bash
npx tsx scripts/benchmark/ocr-model-benchmark.ts \
  --manifest tmp/ocr-benchmark/manifest.json \
  --pricing tmp/ocr-benchmark/pricing.json \
  --dryRun
```

### 4. Run live benchmark (PHASE C+, requires operator approval)

```bash
GEMINI_BENCH_KEY=your_key_here \
npx tsx scripts/benchmark/ocr-model-benchmark.ts \
  --manifest tmp/ocr-benchmark/manifest.json \
  --pricing tmp/ocr-benchmark/pricing.json
```

## Benchmark Tests

```bash
npm run test:benchmark:corpus   # PHASE C1 corpus tooling tests
npm run test:benchmark          # Existing benchmark tests
npm test                       # Full test suite
```

## Security

- No API keys in this workspace.
- No real personal data, CCCD, or case data in tracked files.
- All synthetic fixtures in `scripts/benchmark/corpus-synthetic-fixture/` and
  `scripts/benchmark/ocr-model-benchmark.ts` are fictional.
- `tmp/ocr-benchmark/` is fully gitignored; nothing inside is tracked.