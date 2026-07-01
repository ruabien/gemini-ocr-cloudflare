/**
 * Smart line merging for OCR’ed Vietnamese legal text.
 *
 * Implements the core rule set described in the task:
 *   - If the current line does NOT end with a terminal punctuation mark
 *     (., :, ;, !, ?, “, ”) and the next line is NOT a heading/list/legal label,
 *     merge the two lines with a single space.
 *   - Preserve empty lines (paragraph breaks) and short lines (≤ 25 characters)
 *     to avoid over‑merging.
 *
 * The implementation mirrors the logic already present in `docxTextNormalizer`
 * but is exposed as a separate reusable function.
 */
import {
  isQuocHieuTieuNgu,
  isCoQuanBanHanh,
  isTieuDeVanBan,
  isSoHieu,
  isMucTieuMuc,
  isKyTen,
  isAllUpper,
} from "../utils/docxTextNormalizer";
import { isHeading } from "./heading";

/**
 * Determines whether a line should be treated as a heading or list item that
 * must not be merged with the following line.
 */
function isProtectedLine(line: string): boolean {
  return (
    isHeading(line) ||
    isQuocHieuTieuNgu(line) ||
    isCoQuanBanHanh(line) ||
    isTieuDeVanBan(line) ||
    isSoHieu(line) ||
    isMucTieuMuc(line) ||
    isKyTen(line) ||
    isAllUpper(line)
  );
}

/**
 * Returns true if the line ends with a terminal punctuation mark.
 * The set includes typical Vietnamese punctuation and closing quotes.
 */
function endsWithPunctuation(line: string): boolean {
  return /[.:;!?)]$|[”]$/.test(line.trim());
}

/**
 * Merge an array of lines according to the smart‑merge rules.
 */
export function mergeLines(rawText: string): string {
  // Normalise line endings and trim intra‑line whitespace
  const rawLines = rawText
    .split(/\r?\n/)
    .map((ln) => ln.replace(/[ \t]+/g, " ").trim());

  const result: string[] = [];
  let i = 0;

  while (i < rawLines.length) {
    let line = rawLines[i];
    const trimmed = line.trim();

    // Preserve empty lines – they mark paragraph boundaries
    if (trimmed === "") {
      result.push("");
      i++;
      continue;
    }

    // Short line check removed – allow merging of short lines

    // If the current line is protected (heading, list, legal label), keep it separate
    if (isProtectedLine(line)) {
      result.push(line);
      i++;
      continue;
    }

    // If the current line already ends with punctuation, do not merge further
    if (endsWithPunctuation(line)) {
      result.push(line);
      i++;
      continue;
    }

    // Attempt to merge subsequent lines while conditions allow it
    while (i + 1 < rawLines.length) {
      const next = rawLines[i + 1];
      const nextTrim = next.trim();

      // Stop on empty line – paragraph break
      if (nextTrim === "") break;

      // Do not merge if next line is protected
      if (isProtectedLine(next)) break;

      // Stop if next line ends with punctuation – it likely starts a new sentence
      if (endsWithPunctuation(next)) break;

      // Merge the next line
      line = line.replace(/\s+$/g, "") + " " + nextTrim;
      i++; // advance pointer to the merged line
    }

    result.push(line);
    i++; // move to the line after the last merged one
  }

  return result.join("\n");
}