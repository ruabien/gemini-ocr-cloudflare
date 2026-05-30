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

  const formData = new FormData();
  formData.append('apikey', apiKey);
  formData.append('language', options.language || 'vie');
  formData.append('isOverlayRequired', 'false');
  formData.append('file', fileOrBlob);

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("API Key OCR.space không hợp lệ hoặc đã hết hạn.");
      }
      if (response.status === 413) {
        throw new Error("Kích thước tệp tin quá lớn so với giới hạn xử lý của OCR.space (tối đa 1MB với key miễn phí).");
      }
      throw new Error(`Lỗi kết nối máy chủ OCR.space (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      const errMsgs = Array.isArray(data.ErrorMessage) 
        ? data.ErrorMessage.join(', ') 
        : (data.ErrorMessage || "Lỗi xử lý hình ảnh.");
      
      const errDetails = Array.isArray(data.ErrorDetails)
        ? data.ErrorDetails.join(', ')
        : (data.ErrorDetails || "");

      const fullError = `${errMsgs} ${errDetails}`.trim();

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
