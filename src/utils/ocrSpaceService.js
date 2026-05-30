/**
 * Hàm thực hiện OCR bằng dịch vụ OCR.space (thông qua API Proxy nội bộ /api/ocr-space)
 * @param {File|Blob} fileOrBlob - Tệp ảnh của trang tài liệu cần OCR
 * @param {string} apiKey - API Key OCR.space (tùy chọn cung cấp từ User)
 * @param {object} options - Các tùy chọn bổ sung (ví dụ: { language: 'vie' })
 * @returns {Promise<string>} Kết quả văn bản nhận diện được
 */
export const ocrWithOcrSpace = async (fileOrBlob, options = {}) => {
  let lang = options.language || 'vie';
  // Không dùng language = "vi", "vi-VN", "vietnamese"
  if (lang === 'vi' || lang === 'vi-VN' || lang === 'vietnamese') {
    lang = 'vie';
  }

  // Log dev mode chỉ hiển thị thông tin language, không log API key hay nội dung tài liệu
  console.log(`[OCR.space Proxy Dev Log] Gửi yêu cầu fallback đến proxy nội bộ. Ngôn ngữ: ${lang}`);

  const formData = new FormData();
  formData.append('file', fileOrBlob);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s client timeout

  try {
    const response = await fetch('/api/ocr-space', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errData = {};
      try {
        errData = await response.json();
      } catch {
        // ignore
      }

      const errCode = errData.errorCode || errData.error || 'NETWORK';
      const errMsg = errData.message || 'OCR.space chưa kết nối được qua máy chủ. Vui lòng kiểm tra cấu hình OCR.space hoặc thử lại.';

      const err = new Error(errMsg);
      err.code = errCode;
      throw err;
    }

    const data = await response.json();
    if (!data.text) {
      const err = new Error("Không nhận dạng được văn bản nào từ phản hồi của API.");
      err.code = "NO_TEXT";
      throw err;
    }

    return data.text;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const err = new Error("OCR.space quá thời gian phản hồi.");
      err.code = "TIMEOUT";
      throw err;
    }
    if (error.code) {
      throw error;
    }
    // Lỗi mạng hoặc CORS không kết nối được
    const err = new Error("OCR.space chưa kết nối được qua máy chủ. Vui lòng kiểm tra cấu hình OCR.space hoặc thử lại.");
    err.code = "NETWORK";
    throw err;
  }
};
