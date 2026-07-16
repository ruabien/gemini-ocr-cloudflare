/**
 * Validator module for DOCX AI Clean.
 *
 * Ensures the document cleaner does not corrupt crucial information.
 * Rollback triggers:
 * - Output is empty when input is not.
 * - Loss of digits/numbers.
 * - Modification to dates.
 * - Significant (anomalous) loss of non-whitespace alphanumeric content.
 *
 * It explicitly ignores line count reduction since line merging is a core goal.
 */

export function validateProcessedText(processedText: string, originalText: string): boolean {
  if (originalText.trim().length > 0 && processedText.trim().length === 0) {
    console.warn("[Validator] Output is empty. Rolling back.");
    return false;
  }

  // Check digit count
  // We ignore changes where 'm2'/'m3' are normalized to 'm²'/'m³', or where 'm?'/'m\'' are converted to 'm²'.
  // To align the comparison, we normalize both original and processed to a common form without '2', '3', '?', '\'', '²', '³' in the context of 'm' units, or simply ignore the superscript characters and corresponding original digits.
  // Actually, a simpler and robust way: replace any 'm²' / 'm³' / 'm2' / 'm3' / 'm?' / 'm\'' in BOTH original and processed texts with a placeholder 'm' (or 'mU') before extracting digits.
  const cleanForDigitCheck = (str: string) => {
    return str
      .replace(/\bm2\b/gi, "m")
      .replace(/\bm3\b/gi, "m")
      .replace(/\bm²\b/gi, "m")
      .replace(/\bm³\b/gi, "m")
      .replace(/\bm\?\b/gi, "m")
      .replace(/\bm'\b/gi, "m")
      .replace(/\D/g, "");
  };

  const origDigits = cleanForDigitCheck(originalText);
  const procDigits = cleanForDigitCheck(processedText);

  if (origDigits !== procDigits) {
    // If the sequence of digits is modified (apart from superscript handling), something structural (like money, dates, numbers) was broken.
    console.warn(`[Validator] Digit sequence mismatch! Orig digits: ${origDigits.length}, Proc digits: ${procDigits.length}. Rolling back.`);
    return false;
  }

  // Check total non-whitespace alphanumeric content
  const origAlphaNum = originalText.replace(/[\W_]/g, "");
  const procAlphaNum = processedText.replace(/[\W_]/g, "");

  // Sometimes normalization trims some strange spaces or punctuation, but raw characters shouldn't be lost significantly.
  if (procAlphaNum.length < origAlphaNum.length * 0.95) {
    console.warn(`[Validator] Significant alphanumeric loss! Orig: ${origAlphaNum.length}, Proc: ${procAlphaNum.length}. Rolling back.`);
    return false;
  }

  // Count lines for logging
  const origLines = originalText.split(/\r?\n/).length;
  const procLines = processedText.split(/\r?\n/).length;
  const mergedLineCount = origLines - procLines;

  console.log(`[Validator OK] In length: ${originalText.length}, Out length: ${processedText.length}, Merged lines: ${mergedLineCount > 0 ? mergedLineCount : 0}`);
  
  return true;
}