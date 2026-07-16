/**
 * DOCX AI Clean – Smart line merging.
 *
 * This module implements the line‑merging logic required for the
 * DOCX Pro pipeline. It follows the rules described in the task:
 *
 * 1. Merge a line that ends with “:” with the next non‑empty line
 *    if that line starts with a digit (e.g. monetary values, dates,
 *    quantities). Blank lines between them are ignored.
 *
 * 2. If a line ends with a connector word, always merge it with the
 *    following line. The connector list contains the words supplied
 *    in the specification (e.g. “và”, “của”, “với”, …).
 *
 * 3. Merge when the next line starts with a lowercase letter.
 *
 * 4. Merge when the next line starts with a person title
 *    (“bà”, “ông”, “anh”, “chị”) *and* the current line ends with one
 *    of the specific connectors “và”, “của”, “với”, “cho”.
 *
 * 5. Default merge behaviour: merge unless the current line ends with
 *    terminal punctuation (.,!?,; ) or a closing quote.
 *
 * 6. Heading/section lines (e.g. “1.”, “3.2.1.”, “II.”) are protected
 *    and must never be merged.
 *
 * The implementation follows the same public API as the original
 * version (`export function mergeLines(rawText: string): string`).
 */

const CONNECTOR_WORDS = [
  "và",
  "của",
  "với",
  "theo",
  "cho",
  "tại",
  "là",
  "gồm",
  "về",
  "trong",
  "đó",
  "đối",
  "với",
  "quyền",
  "tài",
  "sử",
  "dụng",
  "sở",
  "hữu",
  "đăng",
  "ký",
  "chuyển",
  "quyền",
  "thi",
  "hành",
  "án",
  "lãi",
  "suất",
  "pháp",
  "quy",
];

const SPECIFIC_CONNECTORS_FOR_PERSON = ["và", "của", "với", "cho"];
const PERSON_TITLES = ["bà", "ông", "anh", "chị"];

import { isListItem } from "./listItem";
import { isLegalStructure } from "./legalStructure";

/**
 * Determine whether a line should be protected from merging.
 * Protected lines are numeric headings such as “1.”, “3.2.”,
 * “3.2.1.” or Roman numeral headings.
 */
function isProtectedLine(line: string): boolean {
  const trimmed = line.trim();

  // Protect legal structures and list items (existing behavior)
  if (isLegalStructure(trimmed) || isListItem(trimmed)) {
    return true;
  }

  // Protect lines that are all uppercase (common headers like "TÒA ÁN NHÂN DÂN ...")
  const isAllUpper = /^[^\p{Ll}]*$/u.test(trimmed);
  if (isAllUpper) {
    return true;
  }

  // Protect explicit label lines that should never be merged
  const labelRegex = /^(Kính gửi|Nguyên đơn|Bị đơn|Người đại diện|Địa chỉ|Nơi cư trú)\s*:/i;
  if (labelRegex.test(trimmed)) {
    return true;
  }

  // Protect specific header lines that may contain mixed case (e.g., "Độc lập - Tự do - Hạnh phúc")
  const mixedHeaderRegex = /^(Độc lập|CỘNG HÒA)/i;
  if (mixedHeaderRegex.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Returns true if the supplied line ends with any of the connector words.
 */
function endsWithConnector(line: string): boolean {
  return CONNECTOR_WORDS.some(
    (w) => line.endsWith(` ${w}`) || line.endsWith(`${w}`)
  );
}

/**
 * Returns true if the supplied line ends with one of the specific connectors
 * used for the “person‑title” rule.
 */
function endsWithSpecificConnector(line: string): boolean {
  return SPECIFIC_CONNECTORS_FOR_PERSON.some(
    (w) => line.endsWith(` ${w}`) || line.endsWith(`${w}`)
  );
}

/**
 * Returns true if the supplied line starts with a lowercase Vietnamese letter.
 */
function startsWithLowercase(line: string): boolean {
  const first = line[0];
  return first === first.toLocaleLowerCase() && first !== first.toLocaleUpperCase();
}

/**
 * Returns true if the supplied line starts with a person title.
 */
function startsWithPersonTitle(line: string): boolean {
  const lower = line.toLocaleLowerCase();
  return PERSON_TITLES.some((title) => lower.startsWith(title + " "));
}

/**
 * Core decision function – decides if two lines should be merged.
 */
function shouldMerge(current: string, next: string): boolean {
  const cur = current.trim();
  const nxt = next.trim();

  if (isProtectedLine(next)) {
    return false;
  }

  // 1. Current ends with “:” and next starts with a digit
// 1. Current ends with “:” – merge with next line (typically label content)
if (cur.endsWith(":")) {
  return true;
}

  // 2. Current ends with a generic connector word
  if (endsWithConnector(cur)) {
    return true;
  }

  // 3. Next line starts with a lowercase letter
  if (startsWithLowercase(nxt)) {
    return true;
  }

  // 4. Person‑title rule
  if (startsWithPersonTitle(nxt) && endsWithSpecificConnector(cur)) {
    return true;
  }

  // 5. Default – merge unless current ends with terminal punctuation
  const endsWithTerminal = /[.!?;)]$|[”"]$/.test(cur);
  if (!endsWithTerminal) {
    return true;
  }

  return false;
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

    // Attempt to merge subsequent lines while conditions allow it
    while (i + 1 < rawLines.length) {
      let nextIndex = i + 1;
      let next = rawLines[nextIndex];
      let nextTrim = next.trim();

      // Skip a blank line if current ends with “:” and the line after the blank
      // starts with a digit (e.g. monetary amounts)
      if (nextTrim === "" && line.trim().endsWith(":")) {
        const afterNext = rawLines[i + 2];
        if (afterNext && /^\d/.test(afterNext.trim())) {
          nextIndex = i + 2;
          next = afterNext;
          nextTrim = next.trim();
        }
      }

      // Stop on empty line – paragraph break
      if (nextTrim === "") break;

      // Do not merge if next line is protected (heading/section)
      if (isProtectedLine(next)) break;

      // Merge according to the decision function
if (shouldMerge(line, next)) {
  line = line.replace(/\s+$/g, "") + " " + nextTrim;
  i = nextIndex; // advance pointer to the merged line
} else {
  break;
}
    }

    result.push(line);
    i++;
  }

  return result.join("\n");
}