import { AnonymizerDictionary, defaultProvinceMappings } from "./dictionary";
import { escapeRegExp } from "./detector";
import { preserveCase } from "./replacer";

/**
 * Replace administrative units in legal text.
 * - Encode provinces/cities using their short codes.
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
  // 3. Replace commune/ward names with abbreviations and count them
  //    The regex only matches spaces/tabs (no newlines) to avoid spanning lines.
  // -------------------------------------------------------------------------
  const bBefore = "(?<=^|[^\\p{L}\\p{N}])";
  const communeRegex = new RegExp(
    `${bBefore}(xã|phường|thị[ \\t]+trấn)[ \\t]+((?:\\p{Lu}\\p{L}*(?:[ \\t]+\\p{Lu}\\p{L}*)+))`,
    "giu"
  );

  text = text.replace(communeRegex, (match, prefix, namePart) => {
    const words = namePart.trim().split(/[ \t]+/);
    // Skip placeholders like “X”, “Y”, “Z”
    const isPlaceholder = words.some((w: string) => /^[XYZ]$/i.test(w));
    if (isPlaceholder) {
      return match;
    }
    const abbreviation = words.map((w: string) => w.charAt(0)).join("");
    stats.communes++;
    return `${prefix} ${abbreviation}`;
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