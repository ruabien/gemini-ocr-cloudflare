/**
 * Hàm thực hiện OCR bằng dịch vụ OCR.space (dùng làm cơ chế fallback)
 * @param {File|Blob} fileOrBlob - Tệp ảnh của trang tài liệu cần OCR
 * @param {string} apiKey - API Key OCR.space
 * @param {object} options - Các tùy chọn bổ sung (ví dụ: { language: 'vie' })
 * @returns {Promise<string>} Kết quả văn bản nhận diện được
 */
export const ocrWithOcrSpace = async (fileOrBlob, apiKey, options = {}) => {
  if (!apiKey) {
    throw new Error("Cấu hình thiếu: Vui lòng nhập API Key OCR.space trong phần Cấu hình.");
  }

  let lang = options.language || 'vie';
  // Không dùng language = "vi", "vi-VN", "vietnamese"
  if (lang === 'vi' || lang === 'vi-VN' || lang === 'vietnamese') {
    lang = 'vie';
  }

  // Log dev mode chỉ hiển thị language/engine đã dùng, không log API key hoặc nội dung tài liệu
  console.log(`[OCR.space Dev Log] Kích hoạt Fallback OCR.space. Ngôn ngữ: ${lang}, OCREngine: ${lang === 'vie' ? '2' : '1'}`);

  const formData = new FormData();
  formData.append('apikey', apiKey);
  formData.append('language', lang);
  formData.append('isOverlayRequired', 'false');
  
  // Bắt buộc dùng OCREngine = 2 cho tiếng Việt
  if (lang === 'vie') {
    formData.append('OCREngine', '2');
  }
  
  formData.append('file', fileOrBlob);

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("Lỗi cấu hình: API Key OCR.space không hợp lệ (HTTP 403).");
      }
      if (response.status === 413) {
        throw new Error("Kích thước tệp tin quá lớn so với giới hạn xử lý của OCR.space (tối đa 1MB với key miễn phí).");
      }
      throw new Error(`Lỗi kết nối máy chủ OCR.space (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (data.IsErroredOnProcessing || data.OCRExitCode === 99 || (data.ErrorMessage && String(data.ErrorMessage).includes("E201"))) {
      const errMsgs = Array.isArray(data.ErrorMessage) 
        ? data.ErrorMessage.join(', ') 
        : (data.ErrorMessage || "Lỗi xử lý hình ảnh.");
      
      const errDetails = Array.isArray(data.ErrorDetails)
        ? data.ErrorDetails.join(', ')
        : (data.ErrorDetails || "");

      const fullError = `${errMsgs} ${errDetails}`.trim();

      // Nếu OCR.space trả E201 (sai API Key), báo lỗi cấu hình lập tức
      if (
        fullError.includes("E201") || 
        fullError.toLowerCase().includes("apikey is invalid") ||
        fullError.toLowerCase().includes("api key is invalid")
      ) {
        throw new Error("Lỗi cấu hình: API Key OCR.space không hợp lệ hoặc không tìm thấy (E201). Vui lòng cấu hình lại.");
      }

      if (
        fullError.toLowerCase().includes("limit") || 
        fullError.toLowerCase().includes("quota") || 
        fullError.toLowerCase().includes("exceeded") ||
        fullError.toLowerCase().includes("max allowed")
      ) {
        throw new Error("Hạn mức (Quota) của API Key OCR.space đã hết hoặc bị giới hạn.");
      }
      
      if (
        fullError.toLowerCase().includes("size") || 
        fullError.toLowerCase().includes("large") ||
        fullError.toLowerCase().includes("too big")
      ) {
        throw new Error("Kích thước tệp tin quá lớn so với giới hạn xử lý của OCR.space (tối đa 1MB với key miễn phí).");
      }

      throw new Error(`Lỗi từ dịch vụ OCR.space: ${fullError}`);
    }

    const parsedResults = data.ParsedResults;
    if (!parsedResults || parsedResults.length === 0) {
      throw new Error("OCR.space không nhận dạng được văn bản nào trong ảnh này.");
    }

    const textResult = parsedResults[0].ParsedText;
    if (textResult === undefined || textResult === null) {
      throw new Error("Không thể trích xuất văn bản từ kết quả của OCR.space.");
    }

    return textResult;

  } catch (error) {
    // Nếu là lỗi của chúng tôi đã bắt ở trên thì ném thẳng ra
    if (
      error.message.includes("Cấu hình thiếu") || 
      error.message.includes("OCR.space") || 
      error.message.includes("giới hạn xử lý") ||
      error.message.includes("Hạn mức")
    ) {
      throw error;
    }
    // Nếu là lỗi mạng chung
    throw new Error(`Lỗi kết nối mạng đến OCR.space: ${error.message || error}`, { cause: error });
  }
};
