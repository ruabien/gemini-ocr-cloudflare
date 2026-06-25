export interface AnonymizeResult {
  text: string;
  stats: {
    names: number;
    provinces: number;
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
  { names: ["Kiên Giang", "Kien Giang"], code: "KG" }
];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function anonymizeLegalText(input: string): AnonymizeResult {
  const stats = {
    names: 0,
    provinces: 0,
    idNumbers: 0,
    phones: 0
  };

  if (!input) {
    return { text: "", stats };
  }

  let text = input;

  const bBefore = '(?<=^|[^\\p{L}\\p{N}])';

  // 1. Họ tên cá nhân (dựa trên danh xưng)
  const titles = [
    "Ông/bà", "Ông/Bà", "ông/bà",
    "Nguyên đơn", "Bị đơn", "Bị can", "Bị cáo",
    "nguyên đơn", "bị đơn", "bị can", "bị cáo",
    "Ông", "Bà", "Anh", "Chị", "ông", "bà", "anh", "chị"
  ];
  
  // Sắp xếp titles dài trước ngắn sau để ưu tiên match
  titles.sort((a, b) => b.length - a.length);

  const titlesPattern = titles.map(t => t.replace(/\//g, "\\/")).join("|");
  
  // Match Tên sau danh xưng: các từ viết hoa chữ cái đầu (hoặc viết hoa toàn bộ)
  const nameRegex = new RegExp(
    `(${bBefore})(${titlesPattern})\\s+((?:\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*)*))`,
    'gu'
  );

  text = text.replace(nameRegex, (match, before, title, namePart) => {
    const trimmedName = namePart.trim();
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

  // Họ tên cá nhân (đứng độc lập, không có danh xưng, dựa vào họ phổ biến)
  const commonSurnames = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ",
    "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"
  ];
  const surnamesPattern = commonSurnames.join("|");
  // Chỉ match các từ Title Case để tránh match chữ IN HOA toàn bộ (như CỘNG HÒA)
  const standaloneNameRegex = new RegExp(
    `(${bBefore})(${surnamesPattern})\\s+((?:\\p{Lu}\\p{Ll}*\\s+)*\\p{Lu}\\p{Ll}*)(?=[^\\p{L}]|$)`,
    'gu'
  );

  text = text.replace(standaloneNameRegex, (match, before, surname, restPart) => {
    const trimmedRest = restPart.trim();
    const words = trimmedRest.split(/\s+/);
    if (words.length === 0) return match;
    
    const lastWord = words[words.length - 1];
    if (lastWord.length === 1) return match; // Đã được viết tắt hoặc chỉ có 1 ký tự
    
    const abbrev = lastWord.charAt(0);
    const anonymizedRest = words.slice(0, -1).join(" ") + (words.length > 1 ? " " : "") + abbrev;
    stats.names++;
    return `${before}${surname} ${anonymizedRest}`;
  });

  // 2. Địa chỉ: Tỉnh / Thành phố theo mapping
  for (const mapping of provinceMappings) {
    for (const name of mapping.names) {
      const escapedName = escapeRegExp(name);
      // Match "tỉnh X", "thành phố X", "TP. X"
      const regex = new RegExp(`\\b(tỉnh|thành phố|tp\\.?)\\s+${escapedName}(?=[^\\p{L}\\p{N}]|$)`, 'giu');
      text = text.replace(regex, (match, prefix) => {
        stats.provinces++;
        // Chỉ thay thế phần tên địa phương bằng code
        return match.replace(new RegExp(`${escapedName}$`, 'iu'), mapping.code);
      });
    }
  }

  // 3. CCCD / CMND / SĐT (Tìm các chuỗi 9-12 chữ số liên tiếp)
  const numberRegex = /\b(\d{9,12})\b/g;
  text = text.replace(numberRegex, (match, digits) => {
    if (digits.length === 10 && digits.startsWith("0")) {
      stats.phones++;
    } else {
      stats.idNumbers++;
    }
    return digits.slice(0, -3) + "***";
  });

  return {
    text,
    stats
  };
}