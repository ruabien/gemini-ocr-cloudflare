/**
 * Heading detection module.
 *
 * Implements Step 10:
 *   Recognizes headings like:
 *   - QUYẾT ĐỊNH
 *   - BẢN ÁN
 *   - BIÊN BẢN
 *   - THÔNG BÁO
 *   - PHẦN ...
 *   - CHƯƠNG ...
 *   - MỤC ...
 *   - Điều 1, Điều 2, ...
 *
 * This detection is used:
 *   1. To prevent merging a line into these headings, or merging them into other lines (Step 2).
 *   2. To let the DOCX Generator apply Heading styles (Step 10).
 */

const HEADING_EXACT_KEYWORDS = [
  "QUYẾT ĐỊNH",
  "BẢN ÁN",
  "BIÊN BẢN",
  "THÔNG BÁO",
  "KẾT LUẬN",
  "NHẬN ĐỊNH",
  "ÁN PHÍ",
];

const HEADING_PREFIX_KEYWORDS = [
  "PHẦN",
  "CHƯƠNG",
  "MỤC",
];

/**
 * Checks if a line matches the heading criteria.
 */
export function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const upper = trimmed.toUpperCase();

  // Check exact keywords (ignoring trailing whitespace or punctuation, e.g. "QUYẾT ĐỊNH.")
  for (const kw of HEADING_EXACT_KEYWORDS) {
    if (upper === kw || upper.startsWith(kw + " ") || upper.startsWith(kw + ".") || upper.startsWith(kw + ":")) {
      return true;
    }
  }

  // Check prefix keywords (e.g., "PHẦN I", "CHƯƠNG II", "MỤC 1")
  for (const kw of HEADING_PREFIX_KEYWORDS) {
    if (upper === kw || upper.startsWith(kw + " ") || upper.startsWith(kw + ".") || upper.startsWith(kw + ":")) {
      return true;
    }
  }

  // Check "Điều 1", "Điều 2", etc.
  // Match "Điều" followed by a number (and optional dot/space/text)
  if (/^Điều\s+\d+/i.test(trimmed)) {
    return true;
  }

  // Check Roman numerals: I., II., III.
  if (/^[IVXLCDM]+\.(?:\s|$)/i.test(trimmed)) {
    return true;
  }

  // Check Arabic numerals: 1., 2., 3.
  if (/^\d+\.(?:\s|$)/.test(trimmed)) {
    return true;
  }

  return false;
}
