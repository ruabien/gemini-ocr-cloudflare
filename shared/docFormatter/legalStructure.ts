/**
 * Legal Structure module.
 *
 * Implements Rule 6: Legal Structure protection.
 * Ensures we do not merge legal document structural components:
 * - Roman numerals (I., II., III., ...)
 * - Numbered items (1., 2., 3., 3.2., 3.2.1., 9.2.1.)
 * - Điều 1, Khoản 1, Chương I, Mục 1, Phần
 * - Quyết định, Nhận định, Án phí, Nơi nhận, Người ký
 */

const PROTECTED_PREFIXES = [
  "Điều",
  "Khoản",
  "Chương",
  "Mục",
  "Phần",
  "Quyết định",
  "Nhận định",
  "Án phí",
  "Nơi nhận",
  "Người ký",
  "Thứ",
];

/**
 * Returns true if a line starts with a protected structure element.
 */
export function isLegalStructure(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Regex mục số: ^\d+(\.\d+)*\.
  if (/^\d+(?:\.\d+)*\./.test(trimmed)) {
    return true;
  }

  // Roman numerals (I., II., III., ...)
  if (/^[IVXLCDM]+\./i.test(trimmed)) {
    return true;
  }

  // Prefix followed by space or number or end of line
  const lower = trimmed.toLowerCase();
  for (const prefix of PROTECTED_PREFIXES) {
    const plower = prefix.toLowerCase();
    if (lower === plower || lower.startsWith(plower + " ") || lower.startsWith(plower + ".") || lower.startsWith(plower + ":")) {
      return true;
    }
  }

  return false;
}