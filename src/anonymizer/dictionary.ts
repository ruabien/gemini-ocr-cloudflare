import { escapeRegExp } from "./detector";

export const defaultProvinceMappings = [
  { names: ["Hồ Chí Minh", "Ho Chi Minh"], code: "HCM" },
  { names: ["Hà Nội", "Ha Noi"], code: "HN" },
  { names: ["Đà Nẵng", "Da Nang"], code: "ĐN" },
  { names: ["Cần Thơ", "Can Tho"], code: "CT" },
  { names: ["Hải Phòng", "Hai Phong"], code: "HP" },
  { names: ["Đắk Lắk", "Dak Lak"], code: "ĐL" },
  { names: ["Nghệ An", "Nghe An"], code: "NA" },
  { names: ["Thái Bình", "Thai Binh"], code: "TB" },
  { names: ["Kiên Giang", "Kien Giang"], code: "KG" },
  { names: ["Phú Yên", "Phu Yen"], code: "PY" },
  { names: ["Đồng Nai", "Dong Nai"], code: "ĐNai" },
  { names: ["Bình Dương", "Binh Duong"], code: "BD" },
  { names: ["Long An", "Long An"], code: "LA" },
  { names: ["An Giang", "An Giang"], code: "AG" },
  { names: ["Tây Ninh", "Tay Ninh"], code: "TN" },
  { names: ["Quảng Nam", "Quang Nam"], code: "QN" },
  { names: ["Quảng Ngãi", "Quang Ngai"], code: "QNg" },
  { names: ["Khánh Hòa", "Khanh Hoa"], code: "KH" },
  { names: ["Lâm Đồng", "Lam Dong"], code: "LĐ" }
];

export interface AnonymizerDictionary {
  personMap: Map<string, string>;
  shortNameMap: Map<string, string>;
  provinceMap: Map<string, string>;
  communeMap: Map<string, string>;
}

/**
 * Anonymize a person name to format "Nguyễn Văn B" (or first letter if single word).
 */
export function anonymizeNameString(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length <= 1) {
    return name.length > 0 ? name[0] : "";
  }
  const lastWord = words[words.length - 1];
  const abbrev = lastWord.charAt(0);
  return words.slice(0, -1).join(" ") + " " + abbrev;
}

/**
 * Builds the person, short name, province, and commune maps.
 */
export function buildDictionary(text: string, detectedNames: Set<string>): AnonymizerDictionary {
  const personMap = new Map<string, string>();
  const shortNameMap = new Map<string, string>();
  const provinceMap = new Map<string, string>();
  const communeMap = new Map<string, string>();

  // 1. Build PersonMap and ShortNameMap
  for (const name of detectedNames) {
    const words = name.split(/\s+/);
    if (words.length > 1) {
      const anonymized = anonymizeNameString(name);
      personMap.set(name, anonymized);

      const lastWord = words[words.length - 1];
      const anonymizedLast = lastWord.charAt(0);
      shortNameMap.set(lastWord, anonymizedLast);
    } else if (words.length === 1) {
      const anonymized = name.charAt(0);
      shortNameMap.set(name, anonymized);
    }
  }

  // 2. Build ProvinceMap
  for (const mapping of defaultProvinceMappings) {
    for (const name of mapping.names) {
      const escapedName = escapeRegExp(name);
      // Case-insensitive regex check in text
      const regex = new RegExp(`\\b(?:tỉnh|thành\\s+phố|tp\\.?)\\s+${escapedName}\\b`, 'iu');
      if (regex.test(text)) {
        provinceMap.set(name, mapping.code);
      }
    }
  }

  // 3. Build CommuneMap
  // Scan text for xã/phường/thị trấn followed by capitalized words in a full address context
  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';
  const communeRegex = new RegExp(
    `${bBefore}(xã|phường|thị\\s+trấn)\\s+((?:\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*)+))(?=\\s*,\\s*(?:huyện|quận|thị\\s+xã|thành\\s+phố|tỉnh|tp|\\p{Lu}))`,
    'giu'
  );

  let match: RegExpExecArray | null;
  // Reset regex lastIndex just in case
  communeRegex.lastIndex = 0;
  while ((match = communeRegex.exec(text)) !== null) {
    const namePart = match[2].trim();
    const words = namePart.split(/\s+/);
    if (words.length < 2) continue;

    // Check if it is a placeholder like X, Y, Z
    const isPlaceholder = words.some((w: string) => /^[XYZ]$/i.test(w));
    if (isPlaceholder) continue;

    // Prevent 'dính chữ' by rejecting abnormally long non-Vietnamese words
    const hasLongWord = words.some((w: string) => w.length > 7);
    if (hasLongWord) continue;

    const abbreviation = words.map((w: string) => w.charAt(0)).join("");
    communeMap.set(namePart, abbreviation);
  }

  return {
    personMap,
    shortNameMap,
    provinceMap,
    communeMap
  };
}