import { AnonymizerDictionary } from "./dictionary";
import { escapeRegExp, titles } from "./detector";

/**
 * Preserve the case of the original string when replacing it with the replacement string.
 */
export function preserveCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original === original.toLowerCase()) {
    return replacement.toLowerCase();
  }
  return replacement;
}

/**
 * Replace names in the text based on personMap and shortNameMap.
 */
export function replaceNames(
  text: string,
  dictionary: AnonymizerDictionary,
  stats: { names: number }
): string {
  const sortedMultiWordNames = Array.from(dictionary.personMap.keys()).sort(
    (a, b) => b.length - a.length
  );

  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';

  // 1. Replace multi-word names
  for (const name of sortedMultiWordNames) {
    const anonymized = dictionary.personMap.get(name)!;
    const escapedName = escapeRegExp(name);
    const regex = new RegExp(`${bBefore}${escapedName}(?=[^\\p{L}\\p{N}]|$)`, 'giu');

    text = text.replace(regex, (matched) => {
      stats.names++;
      return preserveCase(matched, anonymized);
    });
  }

  // 1.5 The requirement: "Replacer chỉ được replace các key có trong personMap. Không được replace shortNameMap độc lập trên mọi text."
  // Wait, let's also restrict shortNameMap replacements: we already check that the short name belongs to a full name in personMap!
  // But wait! Is there any other place where shortNameMap is replaced independently?
  // Let's check how replaceNames works. Currently:
  // "Không được replace shortNameMap độc lập trên mọi text." -> meaning we must not do global replacement of shortNameMap keys unless they have a title directly preceding them.
  // Wait! Requirement 4 says:
  // "Replacer chỉ được replace các key có trong personMap. Không được replace shortNameMap độc lập trên mọi text.
  // Ví dụ sai:
  // "Các bên đương sự" -> "Các bên đương S"
  // "thống nhất" -> "thống N"
  // Nếu muốn replace shortNameMap, chỉ replace khi có danh xưng gần trước:
  // - ông Cúc -> ông C
  // - bà Cúc -> bà C
  // Không replace chữ Cúc đứng một mình nếu không nằm trong personMap đầy đủ."
  // This means that if we are replacing short names, we MUST have a title (danh xưng) near / preceding it, i.e., "ông Cúc" -> "ông C".
  // Let's make sure our check `belongsToPersonMap` is strictly correct and respects this.
  // Let's also check if there is any other replacement of shortNameMap. In replacer.ts, the only places are step 1 (multi-word names from personMap) and step 2 (single-word/short names when preceded by a title).
  // Wait, is there any other file that does name replacement? Let's check.

  // 2. Replace single-word names (short names) when preceded by a title
  if (dictionary.shortNameMap.size > 0) {
    const sortedTitles = [...titles].sort((a, b) => b.length - a.length);
    const titlesPattern = sortedTitles.map(t => escapeRegExp(t)).join("|");

    const sortedSingleWords = Array.from(dictionary.shortNameMap.keys()).sort(
      (a, b) => b.length - a.length
    );
    const singleWordsPattern = sortedSingleWords.map(w => escapeRegExp(w)).join("|");

    const regex = new RegExp(
      `${bBefore}(${titlesPattern})\\s+(${singleWordsPattern})(?=[^\\p{L}\\p{N}]|$)`,
      'giu'
    );

    text = text.replace(regex, (matched, titlePart, namePart) => {
      const key = sortedSingleWords.find(w => w.toLowerCase() === namePart.toLowerCase());
      // Check if we have this specific key mapped in personMap (by checking if any full name in personMap ends with the key / has this short name)
      // The requirement: "Nếu muốn replace shortNameMap, chỉ replace khi có danh xưng gần trước: ông Cúc -> ông C, bà Cúc -> bà C. Không replace chữ Cúc đứng một mình nếu không nằm trong personMap đầy đủ."
      // Let's verify if the key actually belongs to some full name that was detected and is in personMap (or if it was explicitly added as a detected person name).
      // Since all names in personMap are detected full names or single names, check if the shortNameMap entry's key is indeed part of some name in personMap.
      const belongsToPersonMap = Array.from(dictionary.personMap.keys()).some(fullName => {
        const words = fullName.split(/\s+/);
        return words.includes(key || "");
      });

      if (!belongsToPersonMap) {
        return matched;
      }

      const anonymized = key ? dictionary.shortNameMap.get(key) : null;
      if (anonymized) {
        stats.names++;
        return `${titlePart} ${preserveCase(namePart, anonymized)}`;
      }
      return matched;
    });
  }

  return text;
}