# LexOCR OCR Model Benchmark — Operator Workspace

## Overview

This directory (`tmp/ocr-benchmark/`) is the operator workspace for the LexOCR OCR model benchmark harness.

**DO NOT commit the contents of `tmp/ocr-benchmark/`** — the directory is gitignored.

## Safe Templates

The following templates are **tracked** (NOT gitignored) and contain no secrets:

- `tmp/ocr-benchmark-manifest.template.json` — benchmark corpus manifest schema
- `tmp/ocr-benchmark-pricing.template.json` — model pricing schema
- `tmp/ocr-benchmark-readme.template.md` — this file

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
npm test
```

Includes all deterministic offline benchmark tests.

## Security

- No API keys in this workspace.
- No real personal data, CCCD, or case data in tracked files.
- All synthetic fixtures in `scripts/benchmark/ocr-model-benchmark.ts` are fictional.