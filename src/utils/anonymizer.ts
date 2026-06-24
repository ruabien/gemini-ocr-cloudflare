/**
 * Anonymizer for Vietnamese legal text.
 *
 * It provides:
 *  - AnonymizeResult interface
 *  - anonymizeLegalText(input: string): AnonymizeResult
 *
 * The implementation follows the requirements:
 *  1. Names: keep family and middle names, replace the final given name with its first initial.
 *     - Preserve optional honorifics (Ông, Bà, Anh, Chị, …)
 *     - Do not process organization names listed in the blacklist.
 *  2. Provinces / cities: replace full province/city name with its abbreviation,
 *     preserving the original prefix (tỉnh, Thành phố, TP., …).
 *  3. ID numbers (CCCD, CMND, SĐT, …): mask the last three digits with ***.
 *  4. Returns a statistics object with counts for each category.
 */

export interface AnonymizeResult {
  text: string;
  stats: {
    names: number;
    provinces: number;
    idNumbers: number;
    phones: number;
  };
}

/**
 * Helper: check if a matched word is an organization name that must NOT be anonymized.
 */
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

/**
 * Helper: province / city abbreviation mapping (case‑insensitive).
 */
const provinceMap: Record<string, string> = {
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

/**
 * Helper: titles / honorifics that may precede a personal name.
 */
const titles = [
  "Ông",
  "Bà",
  "Anh",
  "Chị",
  "Ông/bà",
  "Bị can",
  "Bị cáo",
  "Nguyên đơn",
  "Bị đơn"
];

/**
 * Regex to capture a personal name with optional title.
 *
 * Example matches:
 *   "Nguyễn Văn Bình"
 *   "Ông Nguyễn Văn Bình"
 *   "bà Hương"
 *
 * The pattern:
 *   optional title + whitespace (optional)
 *   then at least two words (family + middle + given) OR one word (single given name)
 *   words may contain Vietnamese diacritics.
 */
const nameRegex = new RegExp(
  `^(?:\\s*(${titles.map(t => t.replace("/", "\\/")).join("|")})\\s+)?` + // optional title
  `([A-ZÁÂĂÊÔÊĐÝỲ][\\wÀÁÂĂÃÈÉÊẾÍÌÒÓÔÕÙÚẶĐ̣Ấ̀]+(?:\\s+[\\wÀÁÂĂÃÈÉÊẾÍÌÒÓÔÕÙÚẶĐ̣Ấ̀]+)*)$`,
  "gi"
);

/**
 * Helper: determine if a candidate name belongs to an organization.
 */
function isOrganization(name: string): boolean {
  const lowered = name.toLowerCase();
  return organizationBlacklist.some(org => lowered.includes(org.toLowerCase()));
}

/**
 * Anonymize personal names according to the rule:
 *   keep all words except the last one, replace the last word with its first letter.
 *   Preserve title if present.
 */
function anonymizeNames(text: string): { newText: string; count: number } {
  let count = 0;
  const newText = text.replace(nameRegex, (match, title, namePart) => {
    if (!namePart) return match; // safety

    // Skip organization names
    if (isOrganization(namePart)) return match;

    const words = namePart.trim().split(/\s+/);
    if (words.length === 1) {
      // single word name (e.g., "Bình") → keep first letter
      const abbrev = words[0].charAt(0);
      count++;
      return (title ? title + " " : "") + abbrev;
    }

    // Keep all but last word
    const last = words[words.length - 1];
    const abbrev = last.charAt(0);
    const kept = words.slice(0, -1).join(" ");
    count++;
    return (title ? title + " " : "") + kept + " " + abbrev;
  });
  return { newText, count };
}

/**
 * Anonymize province/city names.
 * Detect prefixes (tỉnh|Thành phố|TP.|TP|Tp.) followed by a province name in the map.
 */
function anonymizeProvinces(text: string): { newText: string; count: number } {
  let count = 0;
  const prefixPattern = "(tỉnh|Thành phố|TP\\.|TP|Tp\\.)\\s*";
  const provinceNames = Object.keys(provinceMap).join("|");
  const regex = new RegExp(`(${prefixPattern})(${provinceNames})`, "gi");

  const newText = text.replace(regex, (_, prefix, name) => {
    const abbr = provinceMap[name];
    if (abbr) {
      count++;
      return `${prefix}${abbr}`;
    }
    return _;
  });

  return { newText, count };
}

/**
 * Anonymize ID numbers and phone numbers.
 *
 * The logic looks for the keywords (CCCD|CMND|Căn cước công dân|Số định danh cá nhân|Định danh cá nhân|Hộ chiếu|Số điện thoại|Điện thoại|SĐT)
 * followed by any non‑digit characters and then a series of digits (minimum 4 digits).
 * It masks the last three digits of the digit block.
 */
function anonymizeIds(text: string): {
  newText: string;
  idCount: number;
  phoneCount: number;
} {
  let idCount = 0;
  let phoneCount = 0;

  const keywordPattern = "(CCCD|CMND|Căn cước công dân|Số định danh cá nhân|Định danh cá nhân|Hộ chiếu|Số điện thoại|Điện thoại|SĐT)";
  const regex = new RegExp(`${keywordPattern}([^\\d]*)(\\d{4,})`, "gi");

  const newText = text.replace(regex, (_, kw, sep, digits) => {
    // decide if it is a phone number keyword
    const isPhone = /s?ố\\s*điện\\s*thoại|điện\\s*thoại|SĐT/i.test(kw);
    const masked = digits.slice(0, -3) + "***";
    if (isPhone) phoneCount++;
    else idCount++;
    return `${kw}${sep}${masked}`;
  });

  return { newText, idCount, phoneCount };
}

/**
 * Main function: anonymizeLegalText.
 *
 * Returns the anonymized text and statistics.
 */
export function anonymizeLegalText(input: string): AnonymizeResult {
  let text = input;
  let stats = {
    names: 0,
    provinces: 0,
    idNumbers: 0,
    phones: 0
  };

  // 1. Names
  const nameResult = anonymizeNames(text);
  text = nameResult.newText;
  stats.names = nameResult.count;

  // 2. Provinces / cities
  const provResult = anonymizeProvinces(text);
  text = provResult.newText;
  stats.provinces = provResult.count;

  // 3. IDs & phone numbers
  const idResult = anonymizeIds(text);
  text = idResult.newText;
  stats.idNumbers = idResult.idCount;
  stats.phones = idResult.phoneCount;

  return { text, stats };
}