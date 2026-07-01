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
  // Matches a capitalized Vietnamese word, e.g. "Nguyễn", "Thảo", "Hải", "Lê"
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

      // Do not merge if current line or next line is a protected label (like "Địa chỉ:", "Kính gửi:")
      const labelRegex = /^(Kính gửi|Nguyên đơn|Bị đơn|Người đại diện|Địa chỉ|Nơi cư trú)\s*:/i;
      if (labelRegex.test(trimmedCurrent) || labelRegex.test(trimmedNext)) {
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

      // Rule 3: Smart Name Join (Vietnamese names, supporting multi-line joins up to 4 lines total)
      if (!shouldMerge) {
        // Find if this line ends with capitalized words (e.g. "Nguyễn")
        // and we want to look ahead at subsequent lines to see if they form a name when combined.
        // Let's do a smart lookahead up to 3 lines (current line plus up to 3 subsequent lines = 4 lines total)
        // first, check simple 2-line name join
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

        // Let's also support name join across 3 or 4 lines: e.g.
        // Line 1: Nguyễn
        // Line 2: Thị
        // Line 3: Thảo
        // If they are all single/double capitalized words, and together they form a name, we can merge them.
        if (!shouldMerge && suffix.length > 0) {
          // Let's see if we can look ahead: next, next+1, next+2...
          // We can check if lines are capitalized name parts.
          // For name split into single words, e.g. "Nguyễn", "Thị", "Thảo"
          let nameParts = [...suffix];
          let mergeCount = 0;
          let validLookahead = true;

          for (let k = 1; k <= 3; k++) {
            const lookaheadLine = lines[i + k];
            if (!lookaheadLine) {
              validLookahead = false;
              break;
            }
            const trimmedLookahead = lookaheadLine.trim();
            if (trimmedLookahead === "" || isHeading(lookaheadLine) || isListItem(lookaheadLine) || isLegalStructure(lookaheadLine)) {
              validLookahead = false;
              break;
            }

            const words = trimmedLookahead.split(/\s+/);
            const prefixWords = getCapitalizedPrefix(words);
            // If the whole line is capitalized words of a name part
            if (prefixWords.length > 0 && prefixWords.length === words.length) {
              nameParts = [...nameParts, ...prefixWords];
              mergeCount++;
              if (nameParts.length >= 2 && nameParts.length <= 6 && nameParts.join(" ").length <= 40) {
                // Check if we can commit this merge
                // If it's valid, we can set shouldMerge to true, but we need to merge multiple lines at once.
                // Or since the outer loop checks line-by-line, merging just the immediate next line (i+1) is sufficient,
                // because on the next iteration of the outer loop, the merged line (containing Nguyễn Thị) will be checked
                // against "Thảo", and they will merge then.
                // However, wait! If we do it step-by-step, then in this iteration, suffix of "Nguyễn" is ["Nguyễn"],
                // and prefix of "Thị" is ["Thị"]. The potentialName is ["Nguyễn", "Thị"] which has length 2 and <= 40 chars.
                // Thus, it will naturally merge in the 2-line check!
                // Wait, why did the user say "Tên người vẫn còn bị tách Nguyễn / Thị Thảo"?
                // Let's analyze why Nguyễn and Thị Thảo did not merge.
                // In Sample 1: "Nguyễn⏎Thị Thảo là người dân" -> merged to "Nguyễn Thị Thảo là người dân" successfully.
                // In civil_notice.txt:
                // Line 15: "Kính gửi: Ông Nguyễn"
                // Line 16: "Văn Hải, sinh năm 1980."
                // Wait! "Kính gửi: Ông Nguyễn" has "Kính gửi:" which is a protected label!
                // Wait, in lineMerge.ts:
                // `const labelRegex = /^(Kính gửi|Nguyên đơn|Bị đơn|Người đại diện|Địa chỉ|Nơi cư trú)\s*:/i;`
                // Because "Kính gửi: Ông Nguyễn" starts with "Kính gửi:", it is protected in lineMerge.ts!
                // Wait, no. "Kính gửi: Ông Nguyễn" was protected from lineMerge, which is correct (we don't want it to merge into the header).
                // But in personName.ts, "Kính gửi: Ông Nguyễn" and "Văn Hải, sinh năm 1980." did not merge.
                // Let's check: "Kính gửi: Ông Nguyễn" has suffix ["Ông", "Nguyễn"].
                // "Văn Hải, sinh năm 1980." has prefix ["Văn", "Hải"].
                // The potential name is ["Ông", "Nguyễn", "Văn", "Hải"] which has length 4 and is <= 40 chars.
                // But wait! Did it merge?
                // Let's check why civil_notice.txt failed:
                // `[Validator] Digit sequence mismatch! Orig digits: 43, Proc digits: 42. Rolling back.`
                // Ah! The validation failed and rolled back!
                // Why did it roll back? "Digit sequence mismatch! Orig digits: 43, Proc digits: 42. Rolling back."
                // Wait, where did a digit go?
                // Let's look at lines 23-24 of civil_notice.txt:
                // `Buộc bị đơn trả lại diện tích đất 150`
                // `m2 tại Buôn Trấp.`
                // In numberUnit.ts:
                // `200 \n m2 -> 200 m²`
                // In civil_notice.txt:
                // `150 \n m2 tại Buôn Trấp.` -> wait, does "m2 tại Buôn Trấp" start with a unit?
                // `m2` is a unit! So they should merge to `150 m² tại Buôn Trấp.`
                // But wait! Is there a digit change?
                // `150 m2` has digits: 1, 5, 0, 2 (4 digits).
                // `150 m²` has digits: 1, 5, 0 (3 digits).
                // Ah! The digit "2" from "m2" is replaced by "²" which is not a digit!
                // So the original text had the digit "2", and the processed text has no digit "2"!
                // So the digit count decreased by 1!
                // Yes! That's why the validator failed and rolled back the entire document!
                // Let's check `src/docFormatter/validator.ts`!
              }
            }
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