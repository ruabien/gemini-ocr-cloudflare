/**
 * Person name, Location, and Legal Phrase merging module.
 *
 * Implements:
 * - Rule: Smart Name Join (Vietnamese names like Nguyễn \n Thị Thảo, Hồ Thị Yến \n Ni)
 * - Rule: Smart Location Join (Krông Ana, \n tỉnh Đắk Lắk, thành phố \n Hồ Chí Minh)
 * - Rule: Smart Legal Phrase Join (tài / sản -> tài sản, quyền / sử dụng -> quyền sử dụng, etc.)
 */

import { isHeading } from "./heading";
import { isListItem } from "./listItem";
import { isLegalStructure } from "./legalStructure";

// Extensible list of legal phrase fragments (split parts)
export const LEGAL_PHRASE_PARTS = [
  ["tài", "sản"],
  ["quyền sở hữu nhà ở và tài", "sản"],
  ["quyền", "sử dụng"],
  ["thi hành", "án"],
  ["pháp", "luật"],
  ["lãi", "suất"],
  ["chứng", "nhận"],
  ["khởi", "kiện"],
  ["tố", "tụng"],
  ["nghĩa", "vụ"],
  ["yêu", "cầu"],
  ["cơ", "quan"],
  ["nhà", "nước"],
  ["thẩm", "quyền"],
];

const PERSON_TITLES = ["ông", "bà", "anh", "chị", "ông/bà", "bà/ông", "chị/anh", "anh/chị"];

const LOCATION_PREFIXES = [
  "tỉnh",
  "thành phố",
  "tp",
  "huyện",
  "quận",
  "thị xã",
  "tx",
  "thị trấn",
  "phường",
  "xã",
  "ấp",
  "thôn",
  "bản",
  "khu phố",
  "tổ",
  "nước",
  "quốc gia",
];

// Helper to check if a word is capitalized (handles Vietnamese accented chars using Unicode property escapes)
function isCapitalizedWord(word: string): boolean {
  return /^\p{Lu}\p{Ll}*$/u.test(word);
}

function getCapitalizedSuffix(words: string[]): string[] {
  const suffix: string[] = [];
  for (let i = words.length - 1; i >= 0; i--) {
    if (isCapitalizedWord(words[i])) {
      suffix.unshift(words[i]);
    } else {
      break;
    }
  }
  return suffix;
}

function getCapitalizedPrefix(words: string[]): string[] {
  const prefix: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (isCapitalizedWord(words[i])) {
      prefix.push(words[i]);
    } else {
      break;
    }
  }
  return prefix;
}

function isAllUpperCase(line: string): boolean {
  const letters = line.replace(/[^\p{L}]/gu, "");
  if (!letters) return false;
  return letters === letters.toUpperCase();
}

/**
 * Perform same-line cleanup of phrases containing slashes: "tài / sản" -> "tài sản"
 */
export function cleanSameLinePhrases(text: string): string {
  let cleaned = text;
  for (const [a, b] of LEGAL_PHRSE_REPLACEMENTS()) {
    cleaned = cleaned.replace(new RegExp(`${escapeRegex(a)}\\s*\\/\\s*${escapeRegex(b)}`, "gi"), `${a} ${b}`);
  }
  return cleaned;
}

// Generate replacement pairs dynamically to ensure "quyền sở hữu nhà ở và tài" + "sản" is checked
function LEGAL_PHRSE_REPLACEMENTS(): [string, string][] {
  // We want to sort longer parts first to avoid partial matches
  return [...LEGAL_PHRASE_PARTS].sort((x, y) => y[0].length - x[0].length) as [string, string][];
}

function escapeRegex(string: string): string {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
}

/**
 * Normalizes person names, locations, and legal phrases split across line breaks.
 */
export function mergeNamesAndLocations(text: string): string {
  // First, clean same-line patterns like "tài / sản"
  const preCleanedText = cleanSameLinePhrases(text);
  
  const lines = preCleanedText.split(/\r?\n/);
  const result: string[] = [];

  let i = 0;
  while (i < lines.length) {
    let current = lines[i];
    const trimmedCurrent = current.trim();

    if (trimmedCurrent === "" || isHeading(current) || isListItem(current) || isLegalStructure(current) || isAllUpperCase(trimmedCurrent)) {
      result.push(current);
      i++;
      continue;
    }

    // Try to merge with subsequent lines
    while (i + 1 < lines.length) {
      const next = lines[i + 1];
      const trimmedNext = next.trim();

      // Safe conditions: do not merge if next line is empty, heading, list item, legal structure, or starts with a list/section number
      if (
        trimmedNext === "" ||
        isHeading(next) ||
        isListItem(next) ||
        isLegalStructure(next) ||
        /^\d+(\.\d+)*\./.test(trimmedNext)
      ) {
        break;
      }

      let shouldMerge = false;
      let mergedText = "";

      // Rule: Smart Legal Phrase Join (Cross-line)
      for (const [a, b] of LEGAL_PHRSE_REPLACEMENTS()) {
        const cleanA = a.replace(/\s+/g, "\\s+");
        const cleanB = b.replace(/\s+/g, "\\s+");
        // Matches A followed by optional slash and spaces at the end of line
        const aRegex = new RegExp(`\\b${cleanA}\\s*\\/?\\s*$`, "i");
        // Matches B preceded by optional slash and spaces at the start of line
        const bRegex = new RegExp(`^\\s*\\/?\\s*${cleanB}\\b`, "i");

        if (aRegex.test(trimmedCurrent) && bRegex.test(trimmedNext)) {
          const firstPart = current.trimEnd().replace(aRegex, "");
          const secondPart = trimmedNext.replace(bRegex, "");
          mergedText = `${firstPart} ${a} ${b} ${secondPart}`.replace(/\s+/g, " ").trim();
          shouldMerge = true;
          break;
        }
      }

      // Rule 3: Smart Name Join (Vietnamese names)
      if (!shouldMerge) {
        const currentWords = trimmedCurrent.split(/\s+/);
        const nextWords = trimmedNext.split(/\s+/);

        const suffix = getCapitalizedSuffix(currentWords);
        const prefix = getCapitalizedPrefix(nextWords);

        if (suffix.length > 0 && prefix.length > 0) {
          const potentialName = [...suffix, ...prefix];
          const nameLength = potentialName.join(" ").length;
          // A Vietnamese name normally consists of 2 to 5 words, max 6 words. Length should not exceed 40 characters.
          if (potentialName.length >= 2 && potentialName.length <= 6 && nameLength <= 40) {
            shouldMerge = true;
          }
        }
      }

      // Rule 6: Prefix (Title) + Person Name
      if (!shouldMerge) {
        const titleRegex = new RegExp(`\\b(${PERSON_TITLES.join("|")})\\s*$`, "i");
        const nextFirstWordMatch = trimmedNext.match(/^\p{L}+/u);
        if (titleRegex.test(trimmedCurrent) && nextFirstWordMatch && isCapitalizedWord(nextFirstWordMatch[0])) {
          shouldMerge = true;
        }
      }

      // Rule 4: Location (Địa danh) - Ending with comma and next starting with location prefix or capitalized word
      if (!shouldMerge && trimmedCurrent.endsWith(",")) {
        const wordBeforeComma = trimmedCurrent.slice(0, -1).trim();
        const lastWordMatch = wordBeforeComma.match(/\p{L}+$/u);
        if (lastWordMatch && isCapitalizedWord(lastWordMatch[0])) {
          const nextFirstWordMatch = trimmedNext.match(/^\p{L}+/u);
          if (nextFirstWordMatch) {
            const nextFirstWord = nextFirstWordMatch[0].toLowerCase();
            const isNextLocPrefix = LOCATION_PREFIXES.includes(nextFirstWord);
            const isNextCapitalized = isCapitalizedWord(nextFirstWordMatch[0]);
            if (isNextLocPrefix || isNextCapitalized) {
              shouldMerge = true;
            }
          }
        }
      }

      // Rule 5: Location Prefix + Location Name
      if (!shouldMerge) {
        const locPrefixRegex = new RegExp(`\\b(${LOCATION_PREFIXES.join("|")})$`, "i");
        const nextFirstWordMatch = trimmedNext.match(/^\p{L}+/u);
        if (locPrefixRegex.test(trimmedCurrent) && nextFirstWordMatch && isCapitalizedWord(nextFirstWordMatch[0])) {
          shouldMerge = true;
        }
      }

      if (shouldMerge) {
        if (mergedText) {
          current = mergedText;
        } else {
          current = current.trimEnd() + " " + trimmedNext;
        }
        i++;
      } else {
        break;
      }
    }

    result.push(current);
    i++;
  }

  return result.join("\n");
}