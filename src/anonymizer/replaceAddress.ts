import { AnonymizerDictionary, defaultProvinceMappings } from "./dictionary";
import { escapeRegExp } from "./detector";
import { preserveCase } from "./replacer";

export function replaceAddress(
  text: string,
  dictionary: AnonymizerDictionary,
  stats: { provinces: number; communes: number }
): string {
  // Address triggers / indicators
  const addressTriggers = [
    "Địa chỉ",
    "Nơi cư trú",
    "Thường trú",
    "Tạm trú",
    "Cùng nơi cư trú",
    "tọa lạc"
  ];

  // We should only replace address components in the zones following an address trigger until a newline or another sentinel boundary.
  // Wait, let's identify address zones.
  // "Chỉ replace trong vùng địa chỉ."
  // So we look for triggers, then extract/find the address string following it (often up to the end of the line, or until next marker).
  // Let's implement a parser that finds the index of triggers, and processes the text from the trigger until the end of line, or next section.
  // Or we can construct a regex that captures a trigger and then matches everything up to a newline or logical separator.
  // Let's do that: replace within trigger zones.
  // Triggers followed by colons/spaces:
  const triggersPattern = addressTriggers.map(t => escapeRegExp(t)).join("|");
  const addressZoneRegex = new RegExp(`(${triggersPattern})[:\\s]+([^\\n]+)`, 'giu');

  // Let's perform replacements inside the captured address zones.
  return text.replace(addressZoneRegex, (matched, trigger, addressBody) => {
    let updatedAddress = addressBody;

    // 1. Replace provinces/cities using dictionary/mappings
    for (const mapping of defaultProvinceMappings) {
      for (const name of mapping.names) {
        const escapedName = escapeRegExp(name);
        // Exclude prefixes like "UBND", "Viện KSND", "TAND", "Chủ tịch UBND", etc.
        // Wait, since we are only replacing inside the address body (which starts with "Địa chỉ:", "Nơi cư trú:", etc.), 
        // the chance of containing "UBND tỉnh..." is low, but we should still enforce that we don't replace when preceded by those.
        // Let's use lookbehind to make sure we don't have: UBND, TAND, Viện KSND, Chủ tịch UBND, Tòa án nhân dân, v.v.
        const forbiddenPrefixes = [
          "UBND", "Ủy ban nhân dân", "Uỷ ban nhân dân", 
          "TAND", "Tòa án nhân dân", "Tòa án",
          "Viện KSND", "Viện kiểm sát nhân dân", "Viện kiểm sát",
          "Chủ tịch", "Chủ tịch UBND", "Cộng hòa xã hội chủ nghĩa", "Cộng hòa"
        ];
        const forbiddenPattern = forbiddenPrefixes.map(p => escapeRegExp(p)).join("|");

        const regex = new RegExp(
          `(?<!(?:${forbiddenPattern})\\s+)\\b(tỉnh|thành\\s+phố|tp\\.?)\\s+${escapedName}\\b`,
          "giu"
        );

        updatedAddress = updatedAddress.replace(regex, (m: string, prefix: string) => {
          stats.provinces++;
          return `${prefix} ${preserveCase(name, mapping.code)}`;
        });
      }
    }

    // 2. Replace communes using communeMap
    const bBefore = '(?<=^|[^\\p{L}\\p{N}])';
    const communeKeys = Array.from(dictionary.communeMap.keys()).sort((a, b) => b.length - a.length);
    for (const communeName of communeKeys) {
      const abbreviation = dictionary.communeMap.get(communeName)!;
      const escapedCommune = escapeRegExp(communeName);
      
      const regex = new RegExp(
        `${bBefore}(xã|phường|thị\\s+trấn)\\s+(${escapedCommune})\\b`,
        "giu"
      );

      updatedAddress = updatedAddress.replace(regex, (m: string, prefix: string, matchedName: string) => {
        stats.communes++;
        return `${prefix} ${preserveCase(matchedName, abbreviation)}`;
      });
    }

    return `${trigger}: ${updatedAddress}`;
  });
}