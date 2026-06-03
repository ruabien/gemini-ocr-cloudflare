/* eslint-disable */
import { isPremiumUser, FREE_MAX_IMAGE_SIZE_MB, FREE_MAX_PDF_SIZE_MB, PREMIUM_MAX_FILE_SIZE_MB } from '../src/utils/premiumHelper.js';

// Setup mock for localStorage
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

function runValidationTest(fileSizeMb, isPdf, isPremium) {
  let limitBytes;
  let reasonMessage;
  const fileSize = fileSizeMb * 1024 * 1024;
  
  if (isPremium) {
    limitBytes = PREMIUM_MAX_FILE_SIZE_MB * 1024 * 1024;
    reasonMessage = `File vượt giới hạn ${PREMIUM_MAX_FILE_SIZE_MB}MB của gói Premium.`;
  } else {
    const freeLimitMb = isPdf ? FREE_MAX_PDF_SIZE_MB : FREE_MAX_IMAGE_SIZE_MB;
    limitBytes = freeLimitMb * 1024 * 1024;
    reasonMessage = `File vượt giới hạn gói miễn phí. Nâng cấp Premium để xử lý file lên tới 50MB.`;
  }

  const isAllowed = fileSize <= limitBytes;
  return { isAllowed, reasonMessage: isAllowed ? 'Allowed' : reasonMessage };
}

console.log("=== THỬ NGHIỆM GIỚI HẠN UPLOAD FILE THEO GÓI ===");

// Test 1: User thường
console.log("\n[TEST USER THƯỜNG]:");
localStorage.removeItem('ocr_license_key');

// Test 1.1: Ảnh 9MB (Hợp lệ)
let res = runValidationTest(9, false, isPremiumUser());
console.log("- Ảnh 9MB:", res.isAllowed ? "✅ CHO PHÉP (Hợp lệ)" : `❌ CHẶN (${res.reasonMessage})`);

// Test 1.2: Ảnh 11MB (Bị chặn)
res = runValidationTest(11, false, isPremiumUser());
console.log("- Ảnh 11MB:", !res.isAllowed ? "✅ CHẶN THÀNH CÔNG" : "❌ LỖI (Cho phép sai)");
console.log("  Cảnh báo nhận được:", res.reasonMessage);

// Test 1.3: PDF 19MB (Hợp lệ)
res = runValidationTest(19, true, isPremiumUser());
console.log("- PDF 19MB:", res.isAllowed ? "✅ CHO PHÉP (Hợp lệ)" : `❌ CHẶN (${res.reasonMessage})`);

// Test 1.4: PDF 22MB (Bị chặn)
res = runValidationTest(22, true, isPremiumUser());
console.log("- PDF 22MB:", !res.isAllowed ? "✅ CHẶN THÀNH CÔNG" : "❌ LỖI (Cho phép sai)");
console.log("  Cảnh báo nhận được:", res.reasonMessage);

// Test 2: User Premium
console.log("\n[TEST USER PREMIUM]:");
localStorage.setItem('ocr_license_key', 'DEMO-PREMIUM-KEY');

// Test 2.1: File 30MB (Hợp lệ)
res = runValidationTest(30, true, isPremiumUser());
console.log("- File 30MB (Premium):", res.isAllowed ? "✅ CHO PHÉP (Hợp lệ)" : `❌ CHẶN (${res.reasonMessage})`);

// Test 2.2: File 50MB (Hợp lệ)
res = runValidationTest(50, false, isPremiumUser());
console.log("- File 50MB (Premium):", res.isAllowed ? "✅ CHO PHÉP (Hợp lệ)" : `❌ CHẶN (${res.reasonMessage})`);

// Test 2.3: File 55MB (Bị chặn)
res = runValidationTest(55, true, isPremiumUser());
console.log("- File 55MB (Premium):", !res.isAllowed ? "✅ CHẶN THÀNH CÔNG" : "❌ LỖI (Cho phép sai)");
console.log("  Cảnh báo nhận được:", res.reasonMessage);

console.log("\n=== HOÀN TẤT THỬ NGHIỆM ===");
