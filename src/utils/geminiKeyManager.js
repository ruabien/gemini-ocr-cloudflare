/**
 * GeminiKeyManager - Quản lý API Key và Mô hình dùng chung cho toàn bộ ứng dụng (OCR và Trích xuất cấu trúc).
 */

export const GeminiKeyManager = {
  /**
   * Chuẩn hóa và phân tích cú pháp chuỗi API Keys thô
   * Hỗ trợ các ký tự phân cách: dấu phẩy, dấu chấm phẩy, xuống dòng
   * @param {string} raw - Chuỗi keys thô
   * @returns {string[]} Mảng các API Key đã được trim sạch
   */
  parseGeminiKeys(raw) {
    return String(raw || '')
      .split(/[,;\n\r]+/)
      .map(k => k.trim())
      .filter(Boolean);
  },

  /**
   * Lấy danh sách API Keys hợp lệ từ config hoặc localStorage (có fallback an toàn)
   * @param {object} config - Đối tượng cấu hình từ state
   * @returns {string[]} Danh sách các API Key
   */
  getKeys(config) {
    let raw = config?.apiKey || '';
    if (!raw.trim()) {
      raw = localStorage.getItem('vks_gemini_api_keys') || 
            localStorage.getItem('apiKey') || 
            localStorage.getItem('gemini_api_key') || 
            localStorage.getItem('ocr_api_key') || '';
    }
    return this.parseGeminiKeys(raw);
  },

  /**
   * Lấy mô hình AI đang được cấu hình
   * @param {object} config - Đối tượng cấu hình từ state
   * @returns {string} Tên mô hình AI
   */
  getModel(config) {
    return config?.model || localStorage.getItem('ocr_model') || 'gemini-2.5-flash';
  },

  /**
   * Xác định nguồn gốc của API Key để hiển thị trong dev log
   * @param {object} config - Đối tượng cấu hình
   * @returns {string} Nguồn lưu trữ key
   */
  getKeySource(config) {
    let raw = config?.apiKey || '';
    if (raw.trim()) return 'Config state (UI)';
    if (localStorage.getItem('vks_gemini_api_keys') || localStorage.getItem('apiKey') || localStorage.getItem('gemini_api_key') || localStorage.getItem('ocr_api_key')) return 'Local storage';
    return 'Chưa cấu hình';
  },

  /**
   * Chuẩn hóa và dịch lỗi từ Gemini API thành các thông báo thân thiện chuẩn nghiệp vụ
   * @param {Error|object} error - Lỗi gốc nhận được
   * @returns {Error} Lỗi đã được định dạng thân thiện
   */
  formatFriendlyError(error) {
    if (!error) return new Error("Lỗi không xác định từ Gemini API.");

    const errorMsg = String(error.message || error).toLowerCase();
    const code = error.code || '';

    // Kiểm tra lỗi API key không hợp lệ
    const isKeyInvalid = errorMsg.includes("api key not valid") || 
                         errorMsg.includes("key is invalid") || 
                         errorMsg.includes("api_key_invalid") ||
                         code === "INVALID_KEY";

    if (isKeyInvalid) {
      const friendlyErr = new Error("Gemini API Key không hợp lệ.");
      friendlyErr.code = "INVALID_KEY";
      return friendlyErr;
    }

    // Các lỗi khác giữ nguyên để xử lý tiếp theo
    return error;
  }
};
