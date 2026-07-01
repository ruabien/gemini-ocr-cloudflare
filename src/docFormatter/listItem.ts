/**
 * List Item detection module.
 */

export function isListItem(line: string): boolean {
  const trimmed = line.trim();
  
  // 1., 2., 3., 1.1., 1.2.1.
  if (/^\d+(?:\.\d+)*\.(?:\s|$)/.test(trimmed)) {
    return true;
  }
  
  // Roman numerals I., II., III.
  if (/^[IVXLCDM]+\.(?:\s|$)/i.test(trimmed)) {
    return true;
  }

  // a), b), c)
  if (/^[a-zđ]\)\s/i.test(trimmed)) {
    return true;
  }

  // a., b., c.
  if (/^[a-zđ]\.\s/i.test(trimmed)) {
    return true;
  }

  // -, +
  if (/^[-+]\s/.test(trimmed)) {
    return true;
  }

  return false;
}