/**
 * Tiện ích hỗ trợ quản lý gói tài khoản và giới hạn kích thước tệp tin OCR
 */

export const FREE_MAX_IMAGE_SIZE_MB = 10;
export const FREE_MAX_PDF_SIZE_MB = 20;
export const PREMIUM_MAX_FILE_SIZE_MB = 50;

/**
 * Kiểm tra người dùng có kích hoạt gói Premium hay không
 * @returns {boolean} true nếu là tài khoản Premium
 */
export function isPremiumUser() {
  // 1. Kiểm tra biến môi trường dùng cho testing
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENABLE_PREMIUM_TEST === 'true') {
    return true;
  }
  // 2. Kiểm tra mã kích hoạt đã lưu cục bộ
  const premiumKey = localStorage.getItem('ocr_license_key') || '';
  return premiumKey.trim().length > 0;
}
