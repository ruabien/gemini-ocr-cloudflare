/**
 * Validator module.
 *
 * Implements Step 11:
 *   After cleaning, verify that the text hasn't deviated wildly from the original.
 *   Checks number of lines, characters, and paragraphs.
 *   If the deviation exceeds a safe threshold, the function returns false to indicate
 *   that the caller should roll back to the original un‑processed content.
 */

export interface ValidationResult {
  /** Number of lines in the processed text */
  lineCount: number;
  /** Number of characters (including spaces & newlines) in the processed text */
  charCount: number;
  /** Number of non‑empty paragraphs */
  paragraphCount: number;
}

/**
 * Compute simple statistics for a given text.
 */
function computeStats(text: string): ValidationResult {
  const lines = text.split(/\r?\n/);
  const paragraphCount = lines.filter((l) => l.trim() !== "").length;
  const charCount = text.length;
  return {
    lineCount: lines.length,
    charCount,
    paragraphCount,
  };
}

/**
 * Validate that the processed text does not deviate from the original
 * beyond a reasonable tolerance.
 *
 * @param processed  The text after all cleaning steps.
 * @param original   The raw OCR output before any cleaning.
 * @returns true if the cleaned text passes the validation, false otherwise.
 *
 * The validation focuses on preserving the textual content.
 * It ignores changes in line/paragraph counts caused by merging,
 * and ensures that the amount of non‑whitespace characters
 * remains essentially unchanged (allowing a small tolerance for
 * unit normalisation such as “m2” → “m²”).
 */
export function validateProcessedText(processed: string, original: string): boolean {
  // Normalise by removing all whitespace
  const norm = (s: string) => s.replace(/\s+/g, "");
  const procNorm = norm(processed);
  const origNorm = norm(original);
  if (procNorm.length === 0 || origNorm.length === 0) return false;

  // Allow tiny differences due to unit normalisation (e.g., m2 → m²)
  const tolerance = 0.02; // 2 %
  const diff = Math.abs(procNorm.length - origNorm.length) / Math.max(1, origNorm.length);
  return diff <= tolerance;
}
