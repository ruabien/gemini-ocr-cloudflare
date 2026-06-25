/**
 * Entity detection utilities for legal text anonymisation.
 * Detects person names using legal‑context titles and generic name patterns (no common surname list).
 */

export const titles = [
  "Ông/bà", "Ông/Bà", "ông/bà",
  "Nguyên đơn", "Bị đơn", "Bị can", "Bị cáo",
  "nguyên đơn", "bị đơn", "bị can", "bị cáo",
  "Ông", "Bà", "Anh", "Chị", "ông", "bà", "anh", "chị",
  "Thẩm phán", "Kiểm sát viên", "Thư ký", "Điều tra viên",
  "Người làm chứng", "người làm chứng",
  "Người bị hại", "người bị hại",
  "Người có quyền lợi, nghĩa vụ liên quan",
  "Người có quyền lợi nghĩa vụ liên quan",
  "Người đại diện", "người đại diện", "Đại diện", "đại diện"
];

export const nameExclusions = [
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
  "công ty",
  "nhân dân",
  "viện kiểm"
];

const addressPrefixes = [
  "xã", "phường", "thị trấn", "quận", "huyện", "tỉnh", "thành phố", "tp", "tp.",
  "đường", "phố", "ngõ", "ngách", "hẻm", "số", "ngày", "tháng", "năm", "tòa", "viện", "văn phòng",
  "thôn", "ấp", "bản", "tổ", "khóm", "khu phố"
];

/**
 * Escape a string for use in a RegExp.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if a candidate string is a valid person name.
 */
export function isValidName(name: string): boolean {
  name = name.trim();
  if (!name) return false;

  const words = name.split(/\s+/);
  if (words.length < 2) return false; // Most Vietnamese names have 2+ words

  // Check if any word is lowercase (all words must be capitalized)
  for (const word of words) {
    if (word.length > 0 && word[0] !== word[0].toUpperCase()) {
      return false;
    }
  }

  const lowerName = name.toLowerCase();
  for (const exclusion of nameExclusions) {
    if (lowerName.includes(exclusion)) {
      return false;
    }
  }

  // Check address prefixes
  const firstWord = words[0].toLowerCase();
  if (addressPrefixes.includes(firstWord)) {
    return false;
  }

  // Check prefix phrases (e.g. "thành phố", "thị trấn")
  for (const prefix of addressPrefixes) {
    if (lowerName.startsWith(prefix + " ")) {
      return false;
    }
  }

  return true;
}

/**
 * Detect candidate person names in the supplied text.
 * Returns a Set of unique name strings.
 */
export function detectNames(text: string): Set<string> {
  const candidates = new Set<string>();
  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';
  const headingList = [
    "NHỮNG NỘI DUNG",
    "NHỮNG SỬA ĐỔI",
    "Ý KIẾN CỦA",
    "PHẦN THỦ TỤC",
    "CỘNG HÒA XÃ HỘI",
    "ĐỘC LẬP",
    "THÔNG BÁO",
    "BIÊN BẢN",
    "TÒA ÁN",
    "VIỆN KIỂM SÁT",
    "ỦY BAN NHÂN DÂN",
    "UBND"
  ];
  // Split text into lines and process each line unless it is a heading or mostly uppercase
  const lines = text.split(/\\r?\\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const upperRatio = (trimmed.replace(/[^A-ZÀ-Ỷ]/g, "").length) / trimmed.length;
    const isHeading = headingList.some(h => trimmed.toUpperCase().startsWith(h));
    if (upperRatio > 0.7 || isHeading) {
      continue; // skip headings / all‑caps lines
    }

    // Detect names preceded by legal-context titles
    const sortedTitles = [...titles].sort((a, b) => b.length - a.length);
    const titlesPattern = sortedTitles.map(t => escapeRegExp(t)).join("|");
    const titleNameRegex = new RegExp(
      `${bBefore}(${titlesPattern})\\s+((?:\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*)*))`,
      "gu"
    );

    let match: RegExpExecArray | null;
    while ((match = titleNameRegex.exec(line)) !== null) {
      const namePart = match[2].trim();
      if (isValidName(namePart)) {
        candidates.add(namePart);
      }
    }
  }
  return candidates;
}
