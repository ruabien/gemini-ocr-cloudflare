export interface AnonymizeResult {
  text: string;
  stats: {
    names: number;
    provinces: number;
    idNumbers: number;
    phones: number;
  };
}

const organizationBlacklist = [
  "Tòa án nhân dân",
  "Viện kiểm sát nhân dân",
  "Cơ quan Cảnh sát điều tra",
  "Công an",
  "Ủy ban nhân dân",
  "Công ty",
  "Doanh nghiệp",
  "Hợp tác xã",
  "Thẩm phán",
  "Kiểm sát viên",
  "Thư ký",
  "Điều tra viên",
];

function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const provinceReplacements = [
  { names: ["Đắk Lắk", "Dak Lak"], code: "ĐL" },
  { names: ["Nghệ An", "Nghe An"], code: "NA" },
  { names: ["Thái Bình", "Thai Binh"], code: "TB" },
  { names: ["Hồ Chí Minh", "Ho Chi Minh"], code: "HCM" },
  { names: ["Cần Thơ", "Can Tho"], code: "CT" }
];

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const titles = [
  "Ông/bà", "Ông/Bà", "ông/bà",
  "Nguyên đơn", "Bị đơn", "Bị can", "Bị cáo",
  "nguyên đơn", "bị đơn", "bị can", "bị cáo",
  "Ông", "Bà", "Anh", "Chị", "ông", "bà", "anh", "chị"
];

function isOrganization(name: string): boolean {
  const lowered = name.toLowerCase();
  return organizationBlacklist.some(org => lowered.includes(org.toLowerCase()));
}

export function anonymizeLegalText(input: string): AnonymizeResult {
  const original = typeof input === "string" ? input : "";
  let text = original;

  const stats = {
    names: 0,
    provinces: 0,
    idNumbers: 0,
    phones: 0
  };

  if (!text.trim()) {
    return { text, stats };
  }

  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';
  const bAfter = '(?=$|[^\\p{L}\\p{N}])';

  // 1. Names Anonymization (with title/danh xưng)
  const titlesPattern = titles.map(t => t.replace("/", "\\/")).join("|");
  const nameRegex = new RegExp(
    `(${bBefore})(${titlesPattern})\\s+((?:\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*)*))`,
    'gu'
  );

  text = text.replace(nameRegex, (match, before, title, namePart) => {
    const trimmedName = namePart.trim();
    if (isOrganization(trimmedName)) return match;
    
    const words = trimmedName.split(/\s+/);
    if (words.length === 0) return match;

    let anonymizedName = "";
    if (words.length === 1) {
      anonymizedName = words[0].charAt(0);
    } else {
      const lastWord = words[words.length - 1];
      const abbrev = lastWord.charAt(0);
      anonymizedName = words.slice(0, -1).join(" ") + " " + abbrev;
    }
    stats.names++;
    return `${before}${title} ${anonymizedName}`;
  });

  // 2. Provinces/Cities Anonymization
  const prefixes = ["tỉnh", "Tỉnh", "thành phố", "Thành phố", "TP.", "TP", "Tp."];
  const sortedPrefixes = [...prefixes].sort((a, b) => b.length - a.length);
  const prefixPattern = sortedPrefixes.map(p => escapeRegExp(p)).join('|');

  for (const replacement of provinceReplacements) {
    for (const name of replacement.names) {
      const escapedName = escapeRegExp(name);
      const provinceRegex = new RegExp(
        `(${bBefore})(${prefixPattern})\\s+(${escapedName})${bAfter}`,
        'gu'
      );
      text = text.replace(provinceRegex, (match, before, prefix) => {
        stats.provinces++;
        return `${before}${prefix} ${replacement.code}`;
      });
    }
  }

  // 3. CCCD / CMND / SĐT Anonymization
  const idLabels = [
    "CCCD", "CMND", "Căn cước công dân", "Số định danh cá nhân", "Định danh cá nhân", "Hộ chiếu",
    "Số điện thoại", "Điện thoại", "SĐT"
  ];
  const idLabelsPattern = idLabels.map(l => l.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const idRegex = new RegExp(
    `(${bBefore})(${idLabelsPattern})(\\s*(?:số\\s+|của\\s+)?[:.-]?\\s*)(\\d{4,})`,
    'giu'
  );

  text = text.replace(idRegex, (match, before, label, sep, digits) => {
    const isPhone = /điện\s*thoại|SĐT/i.test(label);
    const masked = digits.slice(0, -3) + "***";
    if (isPhone) {
      stats.phones++;
    } else {
      stats.idNumbers++;
    }
    return `${before}${label}${sep}${masked}`;
  });

  return { text, stats };
}
