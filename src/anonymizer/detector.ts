export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectNames(text: string): Set<string> {
  const candidates = new Set<string>();

  // Helper to split text into lines to avoid cross-line matches
  const lines = text.split(/\r?\n/);

  // List of titles/prefixes
  const titles = [
    "Ông", "Bà", "Anh", "Chị",
    "Nguyên đơn", "Bị đơn", "Người đại diện", "Người liên quan", 
    "Người bị hại", "Bị can", "Bị cáo", "Người làm chứng",
    "Theo đơn khởi kiện của"
  ];

  const titleRegexes = titles.map(t => new RegExp(`(?:^|\\s)${t}[:\\s]+((?:[A-ZÀ-Ỹ][a-zà-ỹ]*\\s*)+)`, 'giu'));
  const sinhNamRegex = /((?:[A-ZÀ-Ỹ][a-zà-ỹ]*\s*)+)(?:,\s*)?sinh năm/giu;
  const doTrinhBayRegex = /do\s+((?:[A-ZÀ-Ỹ][a-zà-ỹ]*\s*)+)\s+trình bày/giu;

  const isHeading = (line: string) => {
    // Check if line is all caps
    const upperRatio = (line.replace(/[^A-ZÀ-Ỹ]/g, "").length) / (line.replace(/[^A-Za-zÀ-Ỹà-ỹ]/g, "").length || 1);
    if (upperRatio > 0.8) return true;
    return false;
  };

  const nameExclusions = [
    "Ủy Ban", "Tòa Án", "Viện Kiểm Sát", "Công An", "UBND", "Công Ty", 
    "Nhân Dân", "Cộng Hòa", "Xã Hội", "Chủ Nghĩa", "Việt Nam", "Độc Lập", "Tự Do", "Hạnh Phúc"
  ];

  const addressPrefixes = ["Xã", "Phường", "Thị Trấn", "Quận", "Huyện", "Tỉnh", "Thành Phố", "Đường", "Phố", "Thôn", "Ấp", "Bản", "Tổ", "Khóm", "Khu Phố"];

  const isValidName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const words = trimmed.split(/\s+/);
    if (words.length < 2) return false;
    
    // Check capitalization of each word
    for (const word of words) {
      if (word.length > 0 && word[0] !== word[0].toUpperCase()) return false;
    }

    const lowerName = trimmed.toLowerCase();
    for (const excl of nameExclusions) {
      if (lowerName.includes(excl.toLowerCase())) return false;
    }

    const firstWord = words[0];
    for (const prefix of addressPrefixes) {
      if (firstWord.toLowerCase() === prefix.toLowerCase()) return false;
    }

    return true;
  };

  for (const line of lines) {
    if (isHeading(line)) continue;

    // Apply title regexes
    for (const regex of titleRegexes) {
      let match;
      while ((match = regex.exec(line)) !== null) {
        if (isValidName(match[1])) {
          candidates.add(match[1].trim());
        }
      }
    }

    // Apply sinh năm regex
    let snMatch;
    while ((snMatch = sinhNamRegex.exec(line)) !== null) {
      if (isValidName(snMatch[1])) {
        candidates.add(snMatch[1].trim());
      }
    }

    // Apply do ... trình bày regex
    let doMatch;
    while ((doMatch = doTrinhBayRegex.exec(line)) !== null) {
      if (isValidName(doMatch[1])) {
        candidates.add(doMatch[1].trim());
      }
    }
  }

  return candidates;
}