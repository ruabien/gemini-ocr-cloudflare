/**
 * Paragraph management module.
 *
 * Implements Step 7:
 *   XÓA PARAGRAPH RỖNG.
 *   Nếu paragraph chỉ có space, tab, newline -> xóa.
 *   Giữ tối đa một dòng trống liên tiếp.
 */

/**
 * Removes empty paragraphs and preserves at most one consecutive empty line.
 * Also trims trailing and leading spaces from lines while maintaining paragraph breaks.
 */
export function cleanParagraphs(text: string): string {
  const lines = text.split(/\r?\n/);
  const result: string[] = [];
  let consecutiveEmptyCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if paragraph contains only spaces, tabs, or is empty
    if (trimmed === "") {
      consecutiveEmptyCount++;
      if (consecutiveEmptyCount === 1) {
        // Keep at most one empty line
        result.push("");
      }
    } else {
      consecutiveEmptyCount = 0;
      result.push(line);
    }
  }

  // Trim leading empty lines from result
  while (result.length > 0 && result[0] === "") {
    result.shift();
  }

  // Trim trailing empty lines from result
  while (result.length > 0 && result[result.length - 1] === "") {
    result.pop();
  }

  return result.join("\n");
}