import { AnonymizerDictionary, defaultProvinceMappings } from "./dictionary";
import { escapeRegExp } from "./detector";
import { preserveCase } from "./replacer";

/**
 * Replace administrative units in legal text.
 * - Encode provinces/cities using short codes.
 * - Count commune occurrences and abbreviate them.
 * - Preserve specific absolute phrases.
 */
export function replaceAdministrativeUnits(
  text: string,
  dictionary: AnonymizerDictionary,
  stats: { provinces: number; communes: number }
): string {
  // -------------------------------------------------------------------------
  // 1. Protect specific phrases that must never be altered (absolute protection)
  // -------------------------------------------------------------------------
  const protectedPhrases: string[] = [];

  // Array of regexes for phrases that must stay unchanged
  const phraseRegexes: RegExp[] = [
    /CỘNG HÒA\s+XÃ HỘI\s+CHỦ NGHĨA\s+VIỆT\s+NAM/gi,
    /Độc lập\s*-\s*Tự do\s*-\s*Hạnh phúc/gi,
  ];

  phraseRegexes.forEach((re) => {
    text = text.replace(re, (match) => {
      protectedPhrases.push(match);
      return `__PROT_${protectedPhrases.length - 1}__`;
    });
  });

  // -------------------------------------------------------------------------
  // 2. Replace provinces/cities using defaultProvinceMappings
  // -------------------------------------------------------------------------
  for (const mapping of defaultProvinceMappings) {
    for (const name of mapping.names) {
      const escapedName = escapeRegExp(name);
      const regex = new RegExp(
        `\\b(tỉnh|thành phố|tp\\.?)\\s+${escapedName}(?=[^\\p{L}\\p{N}]|$)`,
        "giu"
      );
      text = text.replace(regex, (match) => {
        stats.provinces++;
        const matchedName = match.substring(
          match.toLowerCase().indexOf(name.toLowerCase())
        );
        const preservedCode = preserveCase(matchedName, mapping.code);
        return match.replace(new RegExp(`${escapedName}$`, "iu"), preservedCode);
      });
    }
  }

  // -------------------------------------------------------------------------
  // 3. Replace commune/ward names using the communeMap built from full address contexts.
  //    Only replace when the name is followed by a non‑letter (space, punctuation, end of string) to avoid dính chữ.
  //    This also preserves any trailing punctuation or whitespace via a lookahead.
  const bBefore = "(?<=^|[^\\p{L}\\p{N}])";

  // Helper to normalize Vietnamese text for robust key comparison
  const normalizeKey = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  };

  const normalizedCommuneMap = new Map<string, string>();
  for (const [key, value] of dictionary.communeMap.entries()) {
    normalizedCommuneMap.set(normalizeKey(key), value);
  }

  // Find all occurrences of administrative units and check if their normalized name exists in our map
  const communeRegex = new RegExp(
    `${bBefore}(xã|phường|thị[ \\t]+trấn)[ \\t]+((?:\\p{Lu}\\p{L}*(?:[ \\t]+\\p{Lu}\\p{L}*)*))(?=[^\\p{L}]|$)`,
    "giu"
  );

  text = text.replace(communeRegex, (matched, prefix, namePart) => {
    const normName = normalizeKey(namePart.trim());
    if (normalizedCommuneMap.has(normName)) {
      const abbreviation = normalizedCommuneMap.get(normName)!;
      stats.communes++;
      // Preserve original case/accents of the matched name when inserting abbreviation
      return `${prefix} ${preserveCase(namePart, abbreviation)}`;
    }
    return matched;
  });

  // -------------------------------------------------------------------------
  // 4. Restore protected phrases
  // -------------------------------------------------------------------------
  text = text.replace(/__PROT_(\d+)__/g, (m, idx) => {
    const index = parseInt(idx, 10);
    return protectedPhrases[index];
  });

  return text;
}