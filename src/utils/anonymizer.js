/**
 * Tiện ích ẩn danh văn bản pháp lý (Client-side, rule-based)
 * Bảo mật: Không dùng AI, không gửi API ngoại vi, xử lý trực tiếp trên trình duyệt.
 */

// Danh sách các họ phổ biến tại Việt Nam để nhận diện tên người
const FAMILY_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Vương', 'Trịnh', 'Đinh', 'Lâm', 'Phùng', 'Mai', 'Cao', 'Tống', 'Quách', 'Đào', 'Nghiêm', 'Lương', 'Hà', 'Tô', 'Tạ', 'Văn', 'Diệp', 'Hứa', 'Tăng', 'La', 'Kim'
];

// Danh sách các thành phố trực thuộc trung ương
const CENTRAL_CITIES = [
  'Hà Nội', 'Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Sài Gòn', 'TP.HCM', 'TP HCM'
];

/**
 * Hàm ẩn danh chi tiết, trả về văn bản đã xử lý kèm thông số thống kê và mapping
 * @param {string} text - Văn bản gốc
 * @returns {object} { text: string, stats: object, mapping: object }
 */
export function anonymizeLegalTextDetailed(text) {
  if (!text) {
    return {
      text: '',
      stats: { names: 0, locations: 0, cccd: 0, contacts: 0 },
      mapping: {}
    };
  }

  let processed = text;
  const mapping = {};
  const stats = {
    names: 0,
    locations: 0,
    cccd: 0,
    contacts: 0
  };

  // Helper để đăng ký một ánh xạ ẩn danh
  function registerMapping(original, anonymized, category) {
    const trimmed = original.trim();
    if (!trimmed || mapping[trimmed]) return;
    mapping[trimmed] = anonymized;
    stats[category]++;
  }

  // 1. Ẩn danh Email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailsFound = processed.match(emailRegex) || [];
  let emailIndex = 1;
  const uniqueEmails = [...new Set(emailsFound)];
  uniqueEmails.forEach(email => {
    const replacement = `email_${emailIndex++}@example.com`;
    registerMapping(email, replacement, 'contacts');
  });

  // 2. Ẩn danh Số điện thoại Việt Nam
  const phoneRegex = /\b((?:\+84|84|0)\d{5,7})(\d{3})\b/g;
  let phoneMatch;
  while ((phoneMatch = phoneRegex.exec(processed)) !== null) {
    const fullPhone = phoneMatch[0];
    const prefix = phoneMatch[1];
    const replacement = `${prefix}XXX`;
    registerMapping(fullPhone, replacement, 'contacts');
  }

  // 3. Ẩn danh CMND / CCCD
  const cccdRegex = /\b(\d{6}|\d{9})(\d{3})\b/g;
  let cccdMatch;
  while ((cccdMatch = cccdRegex.exec(processed)) !== null) {
    const fullCccd = cccdMatch[0];
    if (mapping[fullCccd]) continue;
    const prefix = cccdMatch[1];
    const replacement = `${prefix}XXX`;
    registerMapping(fullCccd, replacement, 'cccd');
  }

  // 4. Ẩn danh Địa danh (Sử dụng Unicode Property Escapes cho Tiếng Việt và (?!\p{L}) thay cho \b ở đuôi)
  
  // 4.1. Phường/Xã/Thị trấn (X)
  const communeRegex = /\b(xã|phường|thị\s+trấn)\s+([\p{Lu}\d][\p{L}\p{M}\d]*(?:\s+[\p{Lu}\d][\p{L}\p{M}\d]*){0,3})(?!\p{L})/giu;
  let match;
  while ((match = communeRegex.exec(processed)) !== null) {
    const original = match[0];
    const type = match[1].toLowerCase().replace(/\s+/g, ' ');
    const replacement = `${type} X`;
    registerMapping(original, replacement, 'locations');
  }

  // 4.2. Huyện/Quận/Thành phố thuộc tỉnh (Y) và Tỉnh/Thành phố trực thuộc TW (Z)
  const districtCityRegex = /\b(huyện|quận|thành\s+phố)\s+([\p{Lu}\d][\p{L}\p{M}\d]*(?:\s+[\p{Lu}\d][\p{L}\p{M}\d]*){0,3})(?!\p{L})/giu;
  while ((match = districtCityRegex.exec(processed)) !== null) {
    const original = match[0];
    const type = match[1].toLowerCase().replace(/\s+/g, ' ');
    const name = match[2].trim();

    if (mapping[original]) continue;

    if (type === 'thành phố') {
      const isCentral = CENTRAL_CITIES.some(city => name.toLowerCase() === city.toLowerCase() || name.toLowerCase().includes(city.toLowerCase()));
      const replacement = isCentral ? 'thành phố Z' : 'thành phố Y';
      registerMapping(original, replacement, 'locations');
    } else {
      const replacement = `${type} Y`;
      registerMapping(original, replacement, 'locations');
    }
  }

  // 4.3. Tỉnh (Z)
  const provinceRegex = /\b(tỉnh)\s+([\p{Lu}\d][\p{L}\p{M}\d]*(?:\s+[\p{Lu}\d][\p{L}\p{M}\d]*){0,3})(?!\p{L})/giu;
  while ((match = provinceRegex.exec(processed)) !== null) {
    const original = match[0];
    const type = match[1].toLowerCase();
    if (mapping[original]) continue;
    const replacement = `${type} Z`;
    registerMapping(original, replacement, 'locations');
  }

  // Thực hiện thay thế đợt 1 (Email, SĐT, CCCD, Địa danh)
  let sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
  sortedKeys.forEach(key => {
    const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    processed = processed.replace(new RegExp(escapedKey, 'g'), mapping[key]);
  });

  // 5. Ẩn danh Tên người (Chỉ những đương sự / người tham gia tố tụng được chỉ định)
  const ANONYMIZE_ROLES = [
    'nguyên đơn',
    'bị đơn',
    'bị cáo',
    'bị hại',
    'người bị hại',
    'người có quyền lợi nghĩa vụ liên quan',
    'người có quyền lợi, nghĩa vụ liên quan',
    'người có quyền lợi và nghĩa vụ liên quan',
    'người làm chứng',
    'người đại diện',
    'người bảo vệ quyền và lợi ích hợp pháp',
    'người khởi kiện',
    'người bị kiện',
    'người yêu cầu',
    'người phải thi hành án',
    'người được thi hành án',
    'đương sự'
  ];

  function makeCaseInsensitivePattern(str) {
    return str
      .split('')
      .map(char => {
        const lower = char.toLowerCase();
        const upper = char.toUpperCase();
        if (lower !== upper) {
          return `[${upper}${lower}]`;
        }
        return char;
      })
      .join('');
  }

  const familyNamesRegexStr = FAMILY_NAMES.join('|');
  const nameRegexPart = `(?:${familyNamesRegexStr})\\s+(?:[\\p{Lu}][\\p{L}\\p{M}]*(?:\\s+[\\p{Lu}][\\p{L}\\p{M}]*){1,3})(?!\\p{L})`;

  // Sắp xếp vai trò theo chiều dài giảm dần để tối ưu hóa RegEx
  const sortedRoles = [...ANONYMIZE_ROLES].sort((a, b) => b.length - a.length);
  const rolesRegexStr = sortedRoles.map(makeCaseInsensitivePattern).join('|');
  
  // RegEx để quét vai trò và tên theo sau (hỗ trợ dấu hai chấm `:`, từ `là`, các danh xưng `ông/bà/anh/chị`)
  // Không dùng cờ 'i' để bảo toàn tính năng bắt chữ hoa của tên người (\p{Lu})
  const searchRegex = new RegExp(
    `\\b(${rolesRegexStr})\\b(?:\\s*:\\s*|\\s+là\\s+|\\s+)(?:[Ôô]ng|[Bb]à|[Aa]nh|[Cc]hị)?\\s*(${nameRegexPart})`,
    'gu'
  );

  const nameMatches = [];
  let nameMatch;
  while ((nameMatch = searchRegex.exec(processed)) !== null) {
    const fullName = nameMatch[2].trim();
    const containsExclude = [
      'Bộ luật', 'Tòa án', 'Viện kiểm', 'Ủy ban', 'Hội đồng', 'Thẩm phán', 'Thư ký', 'Bản án', 'Quyết định', 'Cơ quan', 'Nhà nước',
      'Xã', 'Phường', 'Huyện', 'Quận', 'Thành phố', 'Tỉnh', 'Điều', 'Khoản', 'Điểm', 'Chương', 'Mục', 'Hiến pháp', 'Luật', 'Nghị quyết', 'Chính phủ'
    ].some(term => fullName.toLowerCase().includes(term.toLowerCase()));

    if (!containsExclude && !mapping[fullName]) {
      nameMatches.push(fullName);
    }
  }

  // Áp dụng định danh tuần tự: Nguyễn Văn A, Nguyễn Văn B, Nguyễn Văn C...
  const uniqueNames = [...new Set(nameMatches)];
  const nameLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  
  uniqueNames.forEach((name, idx) => {
    const letter = nameLetters[idx % nameLetters.length];
    const replacement = `Nguyễn Văn ${letter}`;
    registerMapping(name, replacement, 'names');
  });

  // Thực hiện thay thế đợt 2 (Tên người)
  sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
  sortedKeys.forEach(key => {
    const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    processed = processed.replace(new RegExp(escapedKey, 'g'), mapping[key]);
  });

  return {
    text: processed,
    stats,
    mapping
  };
}

/**
 * Hàm ẩn danh trả về chuỗi văn bản sạch
 * @param {string} text - Văn bản gốc
 * @returns {object} Văn bản đã ẩn danh và thống kê
 */
export function anonymizeLegalText(text) {
  if (!text) {
    return {
      text: "",
      stats: { names: 0, provinces: 0, idNumbers: 0, phones: 0 }
    };
  }
  const result = anonymizeLegalTextDetailed(text);
  return {
    text: result.text,
    stats: {
      names: result.stats.names,
      provinces: result.stats.locations,
      idNumbers: result.stats.cccd,
      phones: result.stats.contacts
    }
  };
}
