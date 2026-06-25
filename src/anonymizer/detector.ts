/**
 * Entity detection utilities for legal text anonymisation.
 * Detects person names using legal‑context titles and generic name patterns (no common surname list).
 */

export const titles = [
  "Ông/bà", "Ông/Bà", "ông/bà",
  "Nguyên đơn", "Bị đơn", "Bị can", "Bị cáo",
  "nguyên đơn", "bị đơn", "bị can", "bị cáo",
  "Ông", "Bà", "Anh", "Chị", "ông", "bà", "anh", "chị",
  "Thẩm phán", "Kiểm sát viên", "Thư ký", "Điều tra viên",
  "Người làm chứng", "người làm chứng",
  "Người bị hại", "người bị hại",
  "Người có quyền lợi, nghĩa vụ liên quan",
  "Người có quyền lợi nghĩa vụ liên quan",
  "Người đại diện", "người đại diện", "Đại diện", "đại diện"
];

export const nameExclusions = [
  "cộng hòa",
  "xã hội",
  "chủ nghĩa",
  "việt nam",
  "ủy ban",
  "tòa án",
  "viện kiểm sát",
  "hội đồng xét xử",
  "công an",
  "ubnd",
  "công ty",
  "nhân dân",
  "viện kiểm"
];

const addressPrefixes = [
  "xã", "phường", "thị trấn", "quận", "huyện", "tỉnh", "thành phố", "tp", "tp.",
  "đường", "phố", "ngõ", "ngách", "hẻm", "số", "ngày", "tháng", "năm", "tòa", "viện", "văn phòng",
  "thôn", "ấp", "bản", "tổ", "khóm", "khu phố"
];

/**
 * Escape a string for use in a RegExp.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if a candidate string is a valid person name.
 */
export function isValidName(name: string): boolean {
  name = name.trim();
  if (!name) return false;

  const words = name.split(/\s+/);
  if (words.length < 2) return false; // Most Vietnamese names have 2+ words

  // Check if any word is lowercase (all words must be capitalized)
  for (const word of words) {
    if (word.length > 0 && word[0] !== word[0].toUpperCase()) {
      return false;
    }
  }

  const lowerName = name.toLowerCase();
  for (const exclusion of nameExclusions) {
    if (lowerName.includes(exclusion)) {
      return false;
    }
  }

  // Check address prefixes
  const firstWord = words[0].toLowerCase();
  if (addressPrefixes.includes(firstWord)) {
    return false;
  }

  // Check prefix phrases (e.g. "thành phố", "thị trấn")
  for (const prefix of addressPrefixes) {
    if (lowerName.startsWith(prefix + " ")) {
      return false;
    }
  }

  return true;
}

/**
 * Detect candidate person names in the supplied text.
 * Returns a Set of unique name strings.
 */
export function detectNames(text: string): Set<string> {
  const candidates = new Set<string>();
  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';

  // 1. Detect names preceded by legal-context titles
  const sortedTitles = [...titles].sort((a, b) => b.length - a.length);
  const titlesPattern = sortedTitles.map(t => escapeRegExp(t)).join('|');
  const titleNameRegex = new RegExp(
    `${bBefore}(${titlesPattern})\\s+((?:\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*)*))`,
    'gu'
  );

  let match: RegExpExecArray | null;
  while ((match = titleNameRegex.exec(text)) !== null) {
    const namePart = match[2].trim();
    if (isValidName(namePart)) {
      candidates.add(namePart);
    }
  }

  // 2. Generic detection of capitalized word sequences (2 to 4 words)
  const genericRegex = new RegExp(
    `${bBefore}(\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*){1,3})(?=[^\\p{L}\\p{N}]|$)`,
    'gu'
  );

  genericRegex.lastIndex = 0;
  while ((match = genericRegex.exec(text)) !== null) {
    const namePart = match[1].trim();
    
    // Check preceding words to avoid matching address parts (e.g. "phường Hưng Lợi")
    const precedingText = text.substring(0, match.index).trimEnd();
    const precedingWords = precedingText.split(/\s+/);
    let hasAddressPrefix = false;
    
    if (precedingWords.length > 0) {
      const lastPrecedingWord = precedingWords[precedingWords.length - 1].toLowerCase();
      const lastTwoPrecedingWords = precedingWords.length >= 2 
        ? `${precedingWords[precedingWords.length - 2].toLowerCase()} ${lastPrecedingWord}` 
        : "";
        
      if (addressPrefixes.includes(lastPrecedingWord) || addressPrefixes.includes(lastTwoPrecedingWords)) {
        hasAddressPrefix = true;
      }
    }

    if (!hasAddressPrefix && isValidName(namePart)) {
      candidates.add(namePart);
    }
  }

  return candidates;
}