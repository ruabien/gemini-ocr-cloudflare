# LexOCR Synthetic Corpus — Canonical PHASE C1 Fixture

This directory contains the canonical 5-page synthetic corpus used to validate
the PHASE C1 corpus preparation tooling. It is fully tracked and contains **no
real data**.

## Layout

```
corpus-synthetic-fixture/
├── manifest.json                  # 5 REFERENCE_VERIFIED pages
├── corpus-review.json             # piiChecked=true for all 5 pages
├── pages/                         # tiny deterministic 64x64 synthetic PNGs
│   ├── clean-001.png
│   ├── poor-001.png
│   ├── minutes-001.png
│   ├── structured-001.png
│   └── difficult-001.png
├── references/                    # fictional Vietnamese legal text
│   └── *.ref.txt
└── annotations/
    ├── *.entities.json            # entity source annotations
    └── *.layout.json              # layout source annotations
```

## Categories

| Page ID | Category | Difficulty |
|---|---|---|
| `clean-001` | CLEAN_JUDGMENT | easy |
| `poor-001` | POOR_SCAN | hard |
| `minutes-001` | MINUTES_STATEMENTS | medium |
| `structured-001` | STRUCTURED_DOCUMENT | medium |
| `difficult-001` | DIFFICULT_LEGAL_PAGE | hard |

## Usage

```bash
# Validate (expect VALIDATION = PASS)
npx tsx scripts/benchmark/corpus-cli.ts validate \
  --manifest scripts/benchmark/corpus-synthetic-fixture/manifest.json \
  --root scripts/benchmark/corpus-synthetic-fixture

# Readiness (expect CORPUS_READY = YES)
npx tsx scripts/benchmark/corpus-cli.ts ready \
  --manifest scripts/benchmark/corpus-synthetic-fixture/manifest.json \
  --root scripts/benchmark/corpus-synthetic-fixture \
  --review scripts/benchmark/corpus-synthetic-fixture/corpus-review.json
```

## Content Notes

All names, addresses, dates, amounts, document numbers, and legal citations in
this fixture are **fictional**. They are used only to exercise the offline
validation, hashing, and readiness tooling.

The tiny PNGs are deterministic locally-generated images (no external assets,
no network, no real documents). They contain no readable text and no PII. They
exist solely to satisfy image-byte hashing and file/header validation.