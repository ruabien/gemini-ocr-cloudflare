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

  // 3. Simple name replacement based on title (Ông/Bà/Anh/Chị) + 2-5 capitalized words
  // Regex matches title followed by 2 to 5 words where each word starts with a capital letter
  const nameRegex = /(Ông|Bà|Anh|Chị|ông|bà|anh|chị)\s+(\p{Lu}\p{Ll}*(?:\s+\p{Lu}\p{Ll}*){1,4})(?=[^\p{L}\p{N}]|$)/gu;

  text = text.replace(nameRegex, (match, title, nameStr) => {
    stats.names++;
    const words = nameStr.trim().split(/\s+/);
    if (words.length <= 1) {
      return match;
    }
    const lastWord = words[words.length - 1];
    const replaceLast = lastWord.charAt(0).toUpperCase();
    const replaceFull = words.slice(0, -1).join(" ") + " " + replaceLast;
    return `${title} ${replaceFull}`;
  });

  return { text, stats };
}
