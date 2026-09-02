# LexOCR OCR Model Benchmark — Reference Transcription Contract

## 1. Core Principle

The reference text is the **ground truth** for OCR quality evaluation. Every character matters. The transcription must faithfully reproduce the source image's visible text content without addition, omission, or correction.

## 2. Vietnamese Diacritics

- **PRESERVED.** NFC normalization is recommended. `Nguyễn ≠ Nguyen` is a HARD rule.
- All diacritics (tones, dấu hỏi, dấu ngã, dấu nặng, dấu sắc, dấu huyền) must match the source.
- The letter `Đ`/`đ` is distinct from `D`/`d`.

## 3. Capitalization

- Preserve visible case. Do not titlecase or lowercase.
- Legal documents often use mixed case; transcribe verbatim.

## 4. Whitespace

- Preserve visible whitespace (paragraph breaks, line breaks, indentation).
- Line breaks within a paragraph: `\n`.
- Paragraph breaks: `\n\n`.
- Do NOT normalise multiple spaces to single spaces if the source has multiple spaces.

## 5. Page Numbers

- Transcribe as visible. For single-page-per-corpus-entry design, page numbers are typically header/footer lines.
- Transcribe the page number verbatim, including any surrounding text.

## 6. Headers / Footers

- Transcribe verbatim, including document titles, organisation names, and page numbers.

## 7. Stamps

- If legible, transcribe the stamp text.
- If the stamp obscures underlying text, the underlying text wins.
- Mark with `[STAMP_OBSCURING]` if the stamp obstructs a region.

## 8. Handwritten Additions

- Transcribe as visible.
- If illegible: `[ILLEGIBLE]`.

## 9. Illegible Text

- Use `[ILLEGIBLE]` for genuinely unreadable regions.
- Do NOT guess.
- If a region is partially legible, transcribe the legible portion and mark the rest: `[PARTIALLY_ILLEGIBLE]`.

## 10. Tables

- Represent as pipe-separated rows: `col1 | col2 | col3`.
- Each row on its own line.
- If a table is too complex for pipe format, use `[TABLE_START]` / `[TABLE_END]` markers.

## 11. Checkboxes

- `[ ]` (empty) or `[X]` (checked).

## 12. Signatures

- Always `[SIGNATURE]` — never a real signature.

## 13. Abbreviations

- Preserve as visible (`QĐ`, `ST`, `HS`, `UBND`, `TT`, `ND`, `NĐ`, `CP`, `TAND`, `VKS`, `BLDS`, `BLHS`, `BLTTDS`, `BLTTHS`, etc.).

## 14. Source-Document Typos

- **PRESERVED.** Do NOT silently correct.
- If the reviewer wishes to flag a probable typo, add a note in `corpus-review.json` under the page's `notes` field.

## 15. Line Count

- The reference text's line count (non-empty lines) is compared to model output for `lineCountRatio` in layout evaluation.
- The operator must preserve the intended line structure.

## 16. Encoding

- **UTF-8 with NFC normalization.** All reference text files must be valid UTF-8.
- No BOM.
- No carriage return characters (`\r`). Use `\n` line endings.

## 17. Reference Text File Format

- File extension: `.ref.txt`.
- Plain text, no markup.
- Single file per page, placed in `references/<pageId>.ref.txt`.

## 18. Verification

- After transcription, verify the reference text against the source image.
- Check: diacritics, numbers, names, dates, legal citations, illegible regions, source typos.
- Update `referenceStatus` to `REFERENCE_VERIFIED` only after verification.