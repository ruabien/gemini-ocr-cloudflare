/**
 * Person name and Location (địa danh) merging module.
 *
 * Implements:
 * - Step 3: Nối tên người (e.g. Nguyễn \n Thị -> Nguyễn Thị, Phạm Xuân \n Trường -> Phạm Xuân Trường)
 * - Step 4: Nối địa danh (e.g. Krông Ana, \n tỉnh Đắk Lắk -> Krông Ana, tỉnh Đắk Lắk)
 * - Step 6: Nối câu có tên người (e.g. bà Nguyễn \n Thị Thảo -> bà Nguyễn Thị Thảo)
 */
import { isHeading } from "./heading";

// Vietnamese upper case character range including all accented uppercase letters
const VN_UPPER_CHAR = "A-ZĐÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ";
const VN_LOWER_CHAR = "a-zđáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ";

// Regex patterns matching capitalized Vietnamese words
const capWordPat = `[${VN_UPPER_CHAR}][${VN_LOWER_CHAR}]*`;

// Common title prefixes for persons (e.g. "bà", "ông", "anh", "chị")
const PERSON_TITLES = ["ông", "bà", "anh", "chị", "ông/bà", "bà/ông", "chị/anh", "anh/chị"];

// Common location prefixes
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

/**
 * Normalizes person names and locations that are split across line breaks.
 *
 * This function processes the text line-by-line and merges them if they meet name/location join criteria.
 */
export function mergeNamesAndLocations(text: string): string {
  const lines = text.split(/\r?\n/);
  const result: string[] = [];

  let i = 0;
  while (i < lines.length) {
    let current = lines[i];
    const trimmedCurrent = current.trim();

    if (trimmedCurrent === "" || isHeading(current)) {
      result.push(current);
      i++;
      continue;
    }

    // Try to merge with subsequent lines
    while (i + 1 < lines.length) {
      const next = lines[i + 1];
      const trimmedNext = next.trim();

      if (trimmedNext === "" || isHeading(next)) {
        break;
      }

      let shouldMerge = false;

      // Rule 3: Person Name - Line ending with capitalized word/name and next starting with capitalized word/name
      // e.g. "Nguyễn" + "Thị Thảo" or "Phạm Xuân" + "Trường"
      const currentLastWordMatch = trimmedCurrent.match(new RegExp(`(${capWordPat})$`));
      const nextFirstWordMatch = trimmedNext.match(new RegExp(`^(${capWordPat})`));

      if (currentLastWordMatch && nextFirstWordMatch) {
        shouldMerge = true;
      }

      // Rule 6: Prefix + Person Name
      // e.g., "bà Nguyễn" + "Thị Thảo"
      if (!shouldMerge) {
        // Rule 6: Prefix + Person Name (e.g., "bà Nguyễn" + "Thị Thảo")
        const titleRegex = new RegExp(`\\b(${PERSON_TITLES.join("|")})\\s+(${capWordPat})$`, "i");
        const titleOnlyRegex = new RegExp(`^(${PERSON_TITLES.join("|")})$`, "i");
        if (titleRegex.test(trimmedCurrent) && nextFirstWordMatch) {
          shouldMerge = true;
        } else if (titleOnlyRegex.test(trimmedCurrent) && nextFirstWordMatch) {
          // Current line is just a title prefix; merge with following name line
          shouldMerge = true;
        }
      }

      // Rule 4: Location (Địa danh) - Ending with comma and next starting with location prefix or capitalized word
      // e.g., "Krông Ana," + "tỉnh Đắk Lắk"
      if (!shouldMerge && trimmedCurrent.endsWith(",")) {
        const wordBeforeComma = trimmedCurrent.slice(0, -1).trim();
        const lastWordOfCurrentMatch = wordBeforeComma.match(new RegExp(`(${capWordPat})$`));

        if (lastWordOfCurrentMatch) {
            // Rule 4: Location (Địa danh) – after a comma, merge if next line starts with a location prefix or a capitalized word
            const firstWordOfNextMatchUnicode = trimmedNext.match(new RegExp(`^([${VN_UPPER_CHAR}${VN_LOWER_CHAR}]+)`));
            if (firstWordOfNextMatchUnicode) {
              const nextFirstWord = firstWordOfNextMatchUnicode[1].toLowerCase();
              const isNextLocPrefix = LOCATION_PREFIXES.includes(nextFirstWord);
              const isNextCapitalized = new RegExp(`^${capWordPat}`).test(trimmedNext);
              if (isNextLocPrefix || isNextCapitalized) {
                shouldMerge = true;
              }
            }
        }
      }

      // Rule 4: Location Prefix + Location Name
      // e.g., "thành phố" + "Hồ Chí Minh"
      if (!shouldMerge) {
        const locPrefixRegex = new RegExp(`\\b(${LOCATION_PREFIXES.join("|")})$`, "i");
        if (locPrefixRegex.test(trimmedCurrent) && nextFirstWordMatch) {
          shouldMerge = true;
        }
      }

      if (shouldMerge) {
        current = current.trimEnd() + " " + trimmedNext;
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