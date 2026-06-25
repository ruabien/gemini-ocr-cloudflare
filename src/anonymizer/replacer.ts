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