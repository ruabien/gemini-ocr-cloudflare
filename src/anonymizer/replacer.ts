import { replacePerson } from "./replacePerson";
import type { AnonymizerDictionary } from "./dictionary";

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
 * Wrapper that replaces person names in the text.
 * It delegates to replacePerson which handles full name and short name replacement.
 */
export function replaceNames(
  text: string,
  dictionary: AnonymizerDictionary,
  stats: { names: number }
): string {
  return replacePerson(text, dictionary, stats);
}