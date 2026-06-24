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

const provinceMap = {
  "hồ chí minh": "HCM",
  "hà nội": "HN",
  "đà nẵng": "ĐN",
  "cần thơ": "CT",
  "hải phòng": "HP",
  "đắk lắk": "ĐL",
  "nghệ an": "NA",
  "thái bình": "TB",
  "kiên giang": "KG",
  "đồng nai": "ĐNai",
  "bình dương": "BD",
  "long an": "LA",
  "an giang": "AG",
  "tây ninh": "TN",
  "quảng nam": "QN",
  "quảng ngãi": "QNg",
  "khánh hòa": "KH",
  "lâm đồng": "LĐ"
};

const titles = [
  "Ông/bà", "Ông/Bà", "ông/bà",
  "Nguyên đơn", "Bị đơn", "Bị can", "Bị cáo",
  "nguyên đơn", "bị đơn", "bị can", "bị cáo",
  "Ông", "Bà", "Anh", "Chị", "ông", "bà", "anh", "chị"
];

function isOrganization(name) {
  const lowered = name.toLowerCase();
  return organizationBlacklist.some(org => lowered.includes(org.toLowerCase()));
}

export function anonymizeLegalText(input) {
  let text = input;
  const stats = {
    names: 0,
    provinces: 0,
    idNumbers: 0,
    phones: 0
  };

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
  const provPrefixPattern = '(tỉnh|thành\\s+phố|Thành\\s+phố|TP\\.|TP|Tp\\.|tp\\.|tp|Tp)';
  const provKeys = Object.keys(provinceMap).sort((a, b) => b.length - a.length);
  const provPattern = provKeys.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const provinceRegex = new RegExp(
    `(${bBefore})(${provPrefixPattern})\\s+(${provPattern})${bAfter}`,
    'giu'
  );

  text = text.replace(provinceRegex, (match, before, prefix, provName) => {
    const key = provName.toLowerCase().replace(/\s+/g, ' ');
    const abbr = provinceMap[key];
    if (abbr) {
      stats.provinces++;
      return `${before}${prefix} ${abbr}`;
    }
    return match;
  });

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