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
  const origDigits = originalText.replace(/\D/g, "");
  const procDigits = processedText.replace(/\D/g, "");
  
  if (origDigits !== procDigits) {
    // If the sequence of digits is modified, something structural (like money, dates, numbers) was broken.
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