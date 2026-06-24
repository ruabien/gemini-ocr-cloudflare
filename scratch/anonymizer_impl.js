/**
 * Local implementation of anonymizer for testing.
 */

const provinceMap = {
  "Hồ Chí Minh": "HCM",
  "Hà Nội": "HN",
  "Đà Nẵng": "ĐN",
  "Cần Thơ": "CT",
  "Hải Phòng": "HP",
  "Đắk Lắk": "ĐL",
  "Nghệ An": "NA",
  "Thái Bình": "TB",
  "Kiên Giang": "KG",
  "Đồng Nai": "ĐNai",
  "Bình Dương": "BD",
  "Long An": "LA",
  "An Giang": "AG",
  "Tây Ninh": "TN",
  "Quảng Nam": "QN",
  "Quảng Ngãi": "QNg",
  "Khánh Hòa": "KH",
  "Lâm Đồng": "LĐ"
};

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

const titles = [
  "Ông/bà",
  "Ông/Bà",
  "ông/bà",
  "Nguyên đơn",
  "Bị đơn",
  "Bị can",
  "Bị cáo",
  "nguyên đơn",
  "bị đơn",
  "bị can",
  "bị cáo",
  "Ông",
  "Bà",
  "Anh",
  "Chị",
  "ông",
  "bà",
  "anh",
  "chị"
];

function isOrganization(name) {
  const lowered = name.toLowerCase();
  return organizationBlacklist.some(org => lowered.includes(org.toLowerCase()));
}

function anonymizeLegalText(input) {
  let text = input;
  let stats = {
    names: 0,
    provinces: 0,
    idNumbers: 0,
    phones: 0
  };

  // Unicode-aware word boundaries
  const boundaryBefore = '(?<=^|[^\\pi{L}\\pi{N}])';
  const boundaryAfter = '(?=$|[^\\pi{L}\\pi{N}])';

  // But wait! JS regular expression with property escapes: we use \p{L} and \p{N} directly with the 'u' flag.
  // In RegExp constructor, we write \\p{L} and \\p{N}.
  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';
  const bAfter = '(?=$|[^\\p{L}\\p{N}])';

  // 1. Names Anonymization (with title/danh xưng)
  // We match a title followed by one or more spaces and a sequence of capitalized words.
  // A capitalized word starts with a Unicode uppercase letter \p{Lu} and is followed by Unicode letters \p{L}*.
  // Wait, let's make sure it handles single-letter capital initials too (like "B", "H", etc.) so they are matched.
  // Yes, \p{Lu}\p{L}* handles it.
  const titlesPattern = titles.map(t => t.replace("/", "\\/")).join("|");
  const nameRegex = new RegExp(
    `(${bBefore})(?:(${titlesPattern}))\\s+((?:\\p{Lu}\\p{L}*(?:\\s+|$))+)`,
    'gu'
  );

  // First pass: find and replace all names with titles, and collect the full names
  const collectedFullNames = new Set();

  text = text.replace(nameRegex, (match, before, title, namePart) => {
    const trimmedName = namePart.trim();
    if (isOrganization(trimmedName)) {
      return match;
    }

    const words = trimmedName.split(/\s+/);
    if (words.length === 0) return match;

    // Collect the full name if it has >= 2 words for the second pass
    if (words.length >= 2) {
      collectedFullNames.add(trimmedName);
    }

    // Mask name
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

  // Second pass: replace any occurrence of the collected full names that are not preceded by a title
  // Sort full names by length descending to match longer names first
  const sortedFullNames = Array.from(collectedFullNames).sort((a, b) => b.length - a.length);
  for (const fullName of sortedFullNames) {
    // Escape name for regex
    const escapedName = fullName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Replace standalone occurrences of the name
    const pattern = new RegExp(`(${bBefore})(${escapedName})(${bAfter})`, 'gu');
    text = text.replace(pattern, (match, before, name, after) => {
      const words = name.split(/\s+/);
      const lastWord = words[words.length - 1];
      const abbrev = lastWord.charAt(0);
      const anonymizedName = words.slice(0, -1).join(" ") + " " + abbrev;
      stats.names++;
      return `${before}${anonymizedName}${after}`;
    });
  }

  // 2. Provinces/Cities Anonymization
  const keys = Object.keys(provinceMap).sort((a, b) => b.length - a.length);
  const provincePattern = keys.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  // Support prefixes: tỉnh, Tỉnh, thành phố, Thành phố, TP., TP, Tp., tp., tp, Tp
  const provPrefixPattern = '(tỉnh|Tỉnh|thành\\s+phố|Thành\\s+phố|TP\\.|TP|Tp\\.|tp\\.|tp|Tp)';
  const provinceRegex = new RegExp(`(${bBefore})(${provPrefixPattern})\\s+(${provincePattern})(${bAfter})`, 'gu');

  text = text.replace(provinceRegex, (match, before, prefix, provName, after) => {
    // Find canonical key
    const canonicalKey = keys.find(k => k.toLowerCase() === provName.toLowerCase());
    const abbr = provinceMap[canonicalKey];
    if (abbr) {
      stats.provinces++;
      return `${before}${prefix} ${abbr}${after}`;
    }
    return match;
  });

  // 3. CCCD / CMND / SĐT Anonymization
  const idLabels = [
    "CCCD",
    "CMND",
    "Căn cước công dân",
    "Số định danh cá nhân",
    "Định danh cá nhân",
    "Hộ chiếu",
    "Số điện thoại",
    "Điện thoại",
    "SĐT"
  ];
  const idLabelsPattern = idLabels.map(l => l.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const idRegex = new RegExp(
    `(${bBefore})(${idLabelsPattern})\\s*(?:số|của)?\\s*[:.-]?\\s*(\\d{4,})`,
    'gi'
  );

  text = text.replace(idRegex, (match, before, label, digits) => {
    const isPhone = /điện\s*thoại|SĐT/i.test(label);
    const masked = digits.slice(0, -3) + "***";
    if (isPhone) {
      stats.phones++;
    } else {
      stats.idNumbers++;
    }
    return `${before}${label} ${masked}`;
  });

  return { text, stats };
}

module.exports = {
  anonymizeLegalText
};