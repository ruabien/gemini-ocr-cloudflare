import { AnonymizerDictionary } from "./dictionary";
import { escapeRegExp } from "./detector";
import { preserveCase } from "./replacer";

export function replacePerson(
  text: string,
  dictionary: AnonymizerDictionary,
  stats: { names: number }
): string {
  // 1. Replace FULL NAME
  // Sort multi-word names from personMap by length descending
  const sortedNames = Array.from(dictionary.personMap.keys()).sort(
    (a, b) => b.length - a.length
  );

  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';

  for (const name of sortedNames) {
    const info = dictionary.personMap.get(name)!;
    const escapedName = escapeRegExp(name);
    const regex = new RegExp(`${bBefore}${escapedName}(?=[^\\p{L}\\p{N}]|$)`, 'giu');

    text = text.replace(regex, (matched) => {
      stats.names++;
      return preserveCase(matched, info.replaceFull);
    });
  }

  // 2. Replace SHORT NAME
  // "Chỉ replace khi có danh xưng." e.g., "ông Hồ" -> "ông H", "bà Cúc" -> "bà C"
  // "Không replace: hồ sơ, Hồ Chí Minh, hồ nước"
  const titles = [
    "Ông", "Bà", "Anh", "Chị", "ông", "bà", "anh", "chị",
    "Nguyên đơn", "Bị đơn", "Người đại diện", "Người liên quan", 
    "Người bị hại", "Bị can", "Bị cáo", "Người làm chứng"
  ];
  
  // Sort titles by length descending to match longest first
  const sortedTitles = [...titles].sort((a, b) => b.length - a.length);
  const titlesPattern = sortedTitles.map(t => escapeRegExp(t)).join("|");

  // Collect all unique lastNames from personMap
  const lastNamesSet = new Set<string>();
  for (const info of dictionary.personMap.values()) {
    lastNamesSet.add(info.lastName);
  }
  
  if (lastNamesSet.size > 0) {
    const sortedLastNames = Array.from(lastNamesSet).sort((a, b) => b.length - a.length);
    const lastNamesPattern = sortedLastNames.map(ln => escapeRegExp(ln)).join("|");

    // Match title followed by whitespace followed by lastName
    const regex = new RegExp(
      `${bBefore}(${titlesPattern})\\s+(${lastNamesPattern})(?=[^\\p{L}\\p{N}]|$)`,
      'giu'
    );

    text = text.replace(regex, (matched, titlePart, lastNamePart) => {
      // Find the mapping info for this last name from our personMap
      const matchedKey = sortedLastNames.find(ln => ln.toLowerCase() === lastNamePart.toLowerCase());
      if (!matchedKey) return matched;
      
      const foundInfo = Array.from(dictionary.personMap.values()).find(
        info => info.lastName.toLowerCase() === matchedKey.toLowerCase()
      );
      if (foundInfo) {
        stats.names++;
        return `${titlePart} ${preserveCase(lastNamePart, foundInfo.replaceLast)}`;
      }
      return matched;
    });
  }

  return text;
}