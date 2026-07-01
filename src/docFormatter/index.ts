/**
 * Public entry point for the DOCX AI Clean pipeline.
 *
 * Order of operations (as described in the task):
 *   1. Smart line merging               (lineMerge.ts)
 *   2. Person name & location merging   (personName.ts)
 *   3. Number + unit merging            (numberUnit.ts)
 *   4. Empty paragraph cleanup          (paragraph.ts)
 *   5. Spacing & punctuation normalisation (spacing.ts)
 *   6. Validation (validator.ts) – caller may decide to rollback.
 */

import { mergeLines } from "./lineMerge";
import { mergeNamesAndLocations } from "./personName";
import { mergeNumbersAndUnits } from "./numberUnit";
import { cleanParagraphs } from "./paragraph";
import { normalizeSpacingAndPunctuation } from "./spacing";
import { validateProcessedText } from "./validator";

/**
 * Run the full cleaning pipeline.
 *
 * @param rawText The OCR‑extracted raw text.
 * @returns The cleaned text.  If validation fails, the original input is returned unchanged.
 */
export function clean(rawText: string): string {
  // 1. Merge broken lines according to legal‑structure aware rules
  let text = mergeLines(rawText);

  // 2. Merge person names and location fragments
  text = mergeNamesAndLocations(text);

  // 3. Merge numbers with their units (e.g. “770.000.000 đồng”, “200 m²”)
  text = mergeNumbersAndUnits(text);

  // 4. Remove empty paragraphs, keep at most one blank line
  text = cleanParagraphs(text);

  // 5. Normalise spaces and punctuation
  text = normalizeSpacingAndPunctuation(text);

  // 6. Validate – if the cleaned text deviates too much, fall back to original
  if (!validateProcessedText(text, rawText)) {
    // Validation failed – keep original to avoid data loss
    return rawText;
  }

  return text;
}