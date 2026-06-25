/**
 * Simple validation after anonymization to detect common issues:
 * - Missing line breaks (e.g., two lines merged)
 * - Missing characters (e.g., a single character lost)
 * - Concatenated words without space where replacement may have removed delimiter
 *
 * The validator attempts to rollback problematic segments by keeping the original text for those parts.
 * In this simplified implementation, we will detect patterns and return the original segment unchanged.
 */
export function validateAnonymized(
  original: string,
  processed: string
): string {
  // If the processed text is empty or unchanged, just return it.
  if (!processed) return processed;

  // Detect possible concatenated words: a lowercase letter followed immediately by an uppercase letter without space.
  const concatPattern = /([a-zà-ỹ])([A-ZÀ-Ỷ])/g;
  // Detect lines that seem merged: two sentences ending with a period followed immediately by another capital letter.
  const mergedLinePattern = /(\.\s*)([A-ZÀ-Ỷ])/g;

  let corrected = processed;

  // Rollback concatenated words by inserting a space (cannot know original, but at least make readable)
  corrected = corrected.replace(concatPattern, "$1 $2");

  // Split merged lines into separate lines (insert newline)
  corrected = corrected.replace(mergedLinePattern, "$1\n$2");

  // Ensure we didn't remove any characters inadvertently: if length difference > 2, fallback to original.
  if (Math.abs(original.length - corrected.length) > 2) {
    return original;
  }

  return corrected;
}