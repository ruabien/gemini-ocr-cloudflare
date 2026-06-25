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

const provinceMappings = [
  { names: ["Hồ Chí Minh", "Ho Chi Minh"], code: "HCM" },
  { names: ["Cần Thơ", "Can Tho"], code: "CT" },
  { names: ["Đắk Lắk", "Dak Lak"], code: "ĐL" },
  { names: ["Nghệ An", "Nghe An"], code: "NA" },
  { names: ["Thái Bình", "Thai Binh"], code: "TB" },
  { names: ["Kiên Giang", "Kien Giang"], code: "KG" },
  { names: ["Phú Yên", "Phu Yen"], code: "PY" }
];

const nameExclusions = [
  "cộng hòa",
  "xã hội",
  "chủ nghĩa",
  "việt nam",
  "ủy ban",
  "tòa án",
  "viện kiểm sát",
  "hội đồng xét xử",
  "công an",
  "ubnd",
  "công ty"
];

const titles = [
  "Ông/bà", "Ông/Bà", "ông/bà",
  "Nguyên đơn", "Bị đơn", "Bị can", "Bị cáo",
  "nguyên đơn", "bị đơn", "bị can", "bị cáo",
  "Ông", "Bà", "Anh", "Chị", "ông", "bà", "anh", "chị",
  "Thẩm phán", "Kiểm sát viên", "Thư ký", "Điều tra viên",
  "Người làm chứng", "người làm chứng", "Người bị hại", "người bị hại",
  "Người có quyền lợi, nghĩa vụ liên quan", "Người có quyền lợi nghĩa vụ liên quan",
  "Người đại diện", "người đại diện", "Đại diện", "đại diện"
];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function preserveCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original === original.toLowerCase()) {
    return replacement.toLowerCase();
  }
  return replacement;
}

function isValidName(name: string): boolean {
  name = name.trim();
  if (!name) return false;

  const words = name.split(/\s+/);
  if (words.length === 0) return false;

  const lastWord = words[words.length - 1];
  if (lastWord.length <= 1) return false;

  const lowerName = name.toLowerCase();
  for (const exclusion of nameExclusions) {
    if (lowerName.includes(exclusion)) {
      return false;
    }
  }

  return true;
}

function anonymizeNameString(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length <= 1) {
    return name.length > 0 ? name[0] : "";
  }
  const lastWord = words[words.length - 1];
  const abbrev = lastWord.charAt(0);
  return words.slice(0, -1).join(" ") + " " + abbrev;
}

function buildPersonNameMap(text: string): {
  multiWordNames: Map<string, string>;
  singleWordNames: Map<string, string>;
} {
  const multiWordNames = new Map<string, string>();
  const singleWordNames = new Map<string, string>();

  const candidates = new Set<string>();
  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';

  const sortedTitles = [...titles].sort((a, b) => b.length - a.length);
  const titlesPattern = sortedTitles.map(t => escapeRegExp(t)).join("|");
  const titleNameRegex = new RegExp(
    `${bBefore}(${titlesPattern})\\s+((?:\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*)*))`,
    'gu'
  );

  let match;
  while ((match = titleNameRegex.exec(text)) !== null) {
    const namePart = match[2].trim();
    if (isValidName(namePart)) {
      candidates.add(namePart);
    }
  }

  const commonSurnames = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ",
    "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"
  ];
  const surnamesPattern = commonSurnames.flatMap(s => [s, s.toUpperCase()]).join("|");
  const standaloneNameRegex = new RegExp(
    `${bBefore}(${surnamesPattern})\\s+((?:\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*)+))`,
    'gu'
  );

  standaloneNameRegex.lastIndex = 0;
  while ((match = standaloneNameRegex.exec(text)) !== null) {
    const surname = match[1];
    const rest = match[2];
    const fullName = `${surname} ${rest}`.trim();
    if (isValidName(fullName)) {
      candidates.add(fullName);
    }
  }

  for (const name of candidates) {
    const words = name.split(/\s+/);
    if (words.length > 1) {
      const anonymized = anonymizeNameString(name);
      multiWordNames.set(name, anonymized);
      
      const lastWord = words[words.length - 1];
      const anonymizedLast = lastWord.charAt(0);
      singleWordNames.set(lastWord, anonymizedLast);
    } else if (words.length === 1) {
      const anonymized = name.charAt(0);
      singleWordNames.set(name, anonymized);
    }
  }

  return { multiWordNames, singleWordNames };
}

function replaceNamesByMap(
  text: string,
  nameMap: { multiWordNames: Map<string, string>; singleWordNames: Map<string, string> },
  stats: any
): string {
  const sortedMultiWordNames = Array.from(nameMap.multiWordNames.keys()).sort(
    (a, b) => b.length - a.length
  );

  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';

  for (const name of sortedMultiWordNames) {
    const anonymized = nameMap.multiWordNames.get(name)!;
    const escapedName = escapeRegExp(name);
    const regex = new RegExp(`${bBefore}${escapedName}(?=[^\\p{L}\\p{N}]|$)`, 'giu');
    
    text = text.replace(regex, (matched) => {
      stats.names++;
      return preserveCase(matched, anonymized);
    });
  }

  if (nameMap.singleWordNames.size > 0) {
    const sortedTitles = [...titles].sort((a, b) => b.length - a.length);
    const titlesPattern = sortedTitles.map(t => escapeRegExp(t)).join("|");
    
    const sortedSingleWords = Array.from(nameMap.singleWordNames.keys()).sort(
      (a, b) => b.length - a.length
    );
    const singleWordsPattern = sortedSingleWords.map(w => escapeRegExp(w)).join("|");

    const regex = new RegExp(
      `${bBefore}(${titlesPattern})\\s+(${singleWordsPattern})(?=[^\\p{L}\\p{N}]|$)`,
      'giu'
    );

    text = text.replace(regex, (matched, titlePart, namePart) => {
      const key = sortedSingleWords.find(w => w.toLowerCase() === namePart.toLowerCase());
      const anonymized = key ? nameMap.singleWordNames.get(key) : null;
      if (anonymized) {
        stats.names++;
        return `${titlePart} ${preserveCase(namePart, anonymized)}`;
      }
      return matched;
    });
  }

  return text;
}

function replaceProvinceNames(text: string, stats: any): string {
  for (const mapping of provinceMappings) {
    for (const name of mapping.names) {
      const escapedName = escapeRegExp(name);
      const regex = new RegExp(`\\b(tỉnh|thành phố|tp\\.?)\\s+${escapedName}(?=[^\\p{L}\\p{N}]|$)`, 'giu');
      text = text.replace(regex, (match, prefix) => {
        stats.provinces++;
        const matchedName = match.substring(match.toLowerCase().indexOf(name.toLowerCase()));
        const preservedCode = preserveCase(matchedName, mapping.code);
        return match.replace(new RegExp(`${escapedName}$`, 'iu'), preservedCode);
      });
    }
  }
  return text;
}

function replaceCommuneNames(text: string, stats: any): string {
  const mottos: string[] = [];
  const mottoRegex = /CỘNG HÒA\s+XÃ HỘI\s+CHỦ NGHĨA\s+VIỆT NAM/gi;
  text = text.replace(mottoRegex, (match) => {
    mottos.push(match);
    return `__MOTTO_${mottos.length - 1}__`;
  });

  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';
  const communeRegex = new RegExp(
    `${bBefore}(xã|phường|thị\\s+trấn)\\s+((?:\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*)+))`,
    'giu'
  );

  text = text.replace(communeRegex, (match, prefix, namePart) => {
    const words = namePart.trim().split(/\s+/);
    if (words.length < 2) {
      return match;
    }
    
    const isPlaceholder = words.some((w: string) => /^[XYZ]$/i.test(w));
    if (isPlaceholder) {
      return match;
    }

    const abbreviation = words.map((w: string) => w.charAt(0)).join("");
    stats.communes++;
    
    const preservedAbbrev = preserveCase(namePart, abbreviation);
    return `${prefix} ${preservedAbbrev}`;
  });

  text = text.replace(/__MOTTO_(\d+)__/g, (match, indexStr) => {
    const index = parseInt(indexStr, 10);
    return mottos[index];
  });

  return text;
}

function maskIdNumbers(text: string, stats: any): string {
  const regex = /(cccd|cmnd|căn\s+cước\s+công\s+dân|số\s+định\s+danh\s+cá\s+nhân)(?:\s+|:\s*|số\s+|-\s*)*(\d{9,12})\b/gi;
  return text.replace(regex, (match, prefix, digits) => {
    stats.idNumbers++;
    const maskedDigits = digits.slice(0, -3) + "***";
    return match.replace(digits, maskedDigits);
  });
}

function maskPhoneNumbers(text: string, stats: any): string {
  const regex = /(số\s+điện\s+thoại|điện\s+thoại|sđt)(?:\s+|:\s*|số\s+|-\s*)*(\d{9,12})\b/gi;
  return text.replace(regex, (match, prefix, digits) => {
    stats.phones++;
    const maskedDigits = digits.slice(0, -3) + "***";
    return match.replace(digits, maskedDigits);
  });
}

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
  const nameMap = buildPersonNameMap(text);
  text = replaceNamesByMap(text, nameMap, stats);
  text = replaceProvinceNames(text, stats);
  text = replaceCommuneNames(text, stats);
  text = maskIdNumbers(text, stats);
  text = maskPhoneNumbers(text, stats);

  return {
    text,
    stats
  };
}