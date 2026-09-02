# LexOCR OCR Model Benchmark — Human Review Checklist

## Purpose

This checklist is a structured guide for the human reviewer to confirm that each page's reference text and annotations are accurate, complete, and safe for inclusion in the benchmark corpus.

## How to Use

For each page, open the source image side-by-side with the candidate transcription and annotation files. Walk through the checklist items below. Record confirmation in `corpus-review.json` for that page.

---

## Per-Page Review

### A. Privacy and Safety

- [ ] Page contains no prohibited confidential data (visual review)
- [ ] PII heuristic scan produced no unacknowledged hits
- [ ] If real data was used, sanitisation preserves OCR difficulty
- [ ] Real signatures are not present (use `[SIGNATURE]` placeholders)
- [ ] Real CCCD/CMND numbers are not present
- [ ] Real phone numbers are not present
- [ ] Real private addresses are not present
- [ ] Real names of judges, clerks, parties, witnesses, victims, minors are not present

### B. Transcription Accuracy

- [ ] Transcription matches visible source character-by-character (at least 1 full paragraph reviewed)
- [ ] Vietnamese diacritics checked
- [ ] Capitalization preserved
- [ ] Whitespace preserved
- [ ] Page numbers transcribed as visible
- [ ] Headers/footers transcribed verbatim

### C. Numbers and Dates

- [ ] Dates checked (`DATE` entities)
- [ ] Money amounts checked (`MONEY_AMOUNT` entities)
- [ ] Document numbers checked (`DOCUMENT_NUMBER` entities)
- [ ] Land parcel numbers checked (`LAND_PARCEL_NUMBER` entities, if present)
- [ ] Map sheet numbers checked (`MAP_SHEET_NUMBER` entities, if present)
- [ ] Identification numbers checked (`IDENTIFICATION_NUMBER` entities, if present)

### D. Names and Addresses

- [ ] Person names checked (`PERSON_NAME` entities)
- [ ] Organisation names checked (`ORGANIZATION_NAME` entities)
- [ ] Addresses checked (`ADDRESS` entities)

### E. Legal Citations

- [ ] Legal articles checked (`LEGAL_ARTICLE` entities)
- [ ] Legal clause points checked (`LEGAL_CLAUSE_POINT` entities)

### F. Layout and Structure

- [ ] Tables correctly represented (pipe-separated rows or markers)
- [ ] Lists correctly represented
- [ ] Checkboxes correctly marked (`[ ]` / `[X]`)
- [ ] Multi-column layout correctly represented
- [ ] Stamps, handwriting, and skew documented in layout annotation

### G. Special Markers

- [ ] Illegible regions marked with `[ILLEGIBLE]`
- [ ] Signatures replaced with `[SIGNATURE]`
- [ ] Obvious source typos preserved (not silently corrected)
- [ ] Stamp-obscured regions marked with `[STAMP_OBSCURING]` if applicable

### H. Annotation Completeness

- [ ] All entities from the source are annotated in `annotations/<pageId>.entities.json`
- [ ] Entity kinds are valid (in `ALL_ENTITY_TYPES`)
- [ ] Entity text uses NFC and preserves diacritics
- [ ] No duplicate `(kind, text)` pairs in entity JSON
- [ ] Layout annotation file `annotations/<pageId>.layout.json` exists and is valid
- [ ] Layout annotation fields are all boolean

### I. Reviewer Confirmation

- [ ] `piiChecked: true` in `corpus-review.json` for this page
- [ ] All PII heuristic hits acknowledged with a decision
- [ ] `referenceStatus` can safely become `REFERENCE_VERIFIED`

---

## Second-Pass Focused Review (Legal-Critical)

After the full per-page review, perform a focused second pass on legal-critical fields:

- [ ] All `PERSON_NAME` entities across all pages reviewed
- [ ] All `LEGAL_ARTICLE` entities across all pages reviewed
- [ ] All `DOCUMENT_NUMBER` entities across all pages reviewed
- [ ] All `MONEY_AMOUNT` entities across all pages reviewed
- [ ] All `IDENTIFICATION_NUMBER` entities across all pages reviewed
- [ ] All `LEGAL_CLAUSE_POINT` entities across all pages reviewed

---

## Optional Spot-Check (10% Sample)

If a second reviewer is available:

- [ ] 5 randomly selected pages reviewed independently
- [ ] Discrepancies resolved
- [ ] Spot-check results recorded in `corpus-review.json` under `spotCheckNotes`

---

## Sign-Off

Only when all applicable items above are checked:

- Update `manifest.json` entry for the page: `referenceStatus: "REFERENCE_VERIFIED"`.
- Confirm `piiChecked: true` in `corpus-review.json` for the page.
- Run `npx tsx scripts/benchmark/corpus-cli.ts validate` and `... ready` to confirm.
- When all pages are `REFERENCE_VERIFIED` and readiness passes, proceed to freeze.