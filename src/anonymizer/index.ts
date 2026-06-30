import { maskIdNumbers } from "./idMask";
import { maskPhoneNumbers } from "./phoneMask";

export interface AnonymizeResult {
  text: string;
  stats: {
    names: number;
    provinces: number;
    communes: number;
    idNumbers: number;
    phones: number;
  };
}

/**
 * Main anonymization pipeline for legal text - Minimal version for safety and speed.
 */
export function anonymizeLegalText(input: string): AnonymizeResult {
  const stats = {
    names: 0,
    provinces: 0,
    communes: 0,
    idNumbers: 0,
    phones: 0
  };

  if (!input) {
    return { text: "", stats };
  }

  let text = input;

  // 1. Mask ID numbers (CCCD, CMND, etc.)
  text = maskIdNumbers(text, stats);

  // 2. Mask phone numbers
  text = maskPhoneNumbers(text, stats);

  // 3. Extract and replace full names with titles (Ông/Bà/Anh/Chị) + 2-5 capitalized words
  const nameRegex = /(Ông|Bà|Anh|Chị|ông|bà|anh|chị)\s+(\p{Lu}\p{Ll}*(?:\s+\p{Lu}\p{Ll}*){1,4})(?=[^\p{L}\p{N}]|$)/gu;

  const shortNameMap = new Map<string, string>(); // shortName -> initial (e.g. Cúc -> C)
  const fullNames = new Set<string>(); // Keep track of full names to replace later without titles

  text = text.replace(nameRegex, (match, title, nameStr) => {
    stats.names++;
    const words = nameStr.trim().split(/\s+/);
    if (words.length <= 1) {
      return match;
    }
    const lastWord = words[words.length - 1];
    const replaceLast = lastWord.charAt(0).toUpperCase();
    
    shortNameMap.set(lastWord, replaceLast);
    fullNames.add(nameStr.trim());

    // Replace only the last word of match to preserve any internal whitespace/newlines
    const lastWordIndex = match.lastIndexOf(lastWord);
    return match.slice(0, lastWordIndex) + replaceLast;
  });

  // 3b. Detect full names without titles but followed by “– sinh năm” (bio pattern)
  const bioRegex = /(\p{Lu}\p{Ll}*(?:\s+\p{Lu}\p{Ll}*){1,4})\s*(?:–|-)\s*sinh\s+năm/gu;
  text = text.replace(bioRegex, (bioMatch, bioName) => {
    const words = bioName.trim().split(/\s+/);
    if (words.length <= 1) {
      return bioMatch;
    }
    const lastWord = words[words.length - 1];
    const replaceLast = lastWord.charAt(0).toUpperCase();
    
    // Update maps for later short‑name handling
    shortNameMap.set(lastWord, replaceLast);
    fullNames.add(bioName.trim());

    // Replace only the last word in bioName, preserving original spacing/newlines
    const lastWordIndex = bioMatch.lastIndexOf(lastWord);
    return bioMatch.slice(0, lastWordIndex) + replaceLast + bioMatch.slice(lastWordIndex + lastWord.length);
  });

  // 3c. Detect full names without titles but starting with common Vietnamese surnames
  const SURNAMES = "Nguyễn|Trần|Lê|Phạm|Hoàng|Huỳnh|Phan|Vũ|Võ|Đặng|Bùi|Đỗ|Hồ|Ngô|Dương|Lý|Vương|Trịnh|Lâm|Phùng|Mai|Tô|Hà|Tạ|Đinh|Cao|Đào|Lương|Trang|Hứa|Cổ|Diệp|Đới|Tống|Tiêu|Quách";
  const nameWithoutTitleRegex = new RegExp(`(?<!(?:đường|Đường|phố|Phố|phường|Phường|quận|Quận|huyện|Huyện|tỉnh|Tỉnh|thành\\s+phố|Thành\\s+phố|Thành\\s+Phố|xã|Xã|thôn|Thôn|ấp|Ấp|bản|Bản|tổ|Tổ|ngõ|Ngõ|ngách|Ngách|hẻm|Hẻm|số|Số|tòa|Tòa|viện|Viện|vụ|Vụ|cục|Cục|trường|Trường|lớp|Lớp|nhà|Nhà)\\s+)\\b(${SURNAMES})\\s+(\\p{Lu}\\p{Ll}*(?:\\s+\\p{Lu}\\p{Ll}*){1,3})(?=[^\\p{L}\\p{N}]|$)`, 'gu');
  text = text.replace(nameWithoutTitleRegex, (match, surname, rest) => {
    stats.names++;
    const fullNameStr = match.trim();
    const words = fullNameStr.split(/\s+/);
    if (words.length <= 1) {
      return match;
    }
    const lastWord = words[words.length - 1];
    const replaceLast = lastWord.charAt(0).toUpperCase();
    
    shortNameMap.set(lastWord, replaceLast);
    fullNames.add(fullNameStr);

    const lastWordIndex = match.lastIndexOf(lastWord);
    return match.slice(0, lastWordIndex) + replaceLast;
  });

  // 4. Replace full names that appear without titles (like in signatures)
  if (fullNames.size > 0) {
    const sortedFullNames = Array.from(fullNames).sort((a, b) => b.length - a.length);
    for (const fullName of sortedFullNames) {
      const words = fullName.split(/\s+/);
      const lastWord = words[words.length - 1];
      const replaceLast = lastWord.charAt(0).toUpperCase();
      
      const escapedFullName = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
      const fullNameRegex = new RegExp(escapedFullName + `(?=[^\\p{L}\\p{N}]|$)`, 'gu');
      
      text = text.replace(fullNameRegex, (match) => {
        stats.names++;
        const lastWordIndex = match.lastIndexOf(lastWord);
        return match.slice(0, lastWordIndex) + replaceLast;
      });
    }
  }

  // 5. Replace short names with titles
  if (shortNameMap.size > 0) {
    const titlePattern = "(Ông|Bà|Anh|Chị|ông|bà|anh|chị)";
    
    for (const [shortName, initial] of shortNameMap.entries()) {
      const escapedShortName = shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const shortNameRegex = new RegExp(`${titlePattern}\\s+${escapedShortName}(?=[^\\p{L}\\p{N}]|$)`, 'gu');
      
      text = text.replace(shortNameRegex, (match, title) => {
        stats.names++;
        return `${title} ${initial}`;
      });
    }
  }

  return { text, stats };
}
