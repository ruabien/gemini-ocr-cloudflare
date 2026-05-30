/**
 * Helper to convert file to base64 string
 * @param {File} file 
 * @returns {Promise<string>}
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Hàm gọi đến OCR.space API khi gặp lỗi RECITATION từ Gemini
 * @param {File} file 
 * @returns {Promise<string>} Kết quả văn bản thô
 */
export const processPageWithOcrSpace = async (file) => {
  // 1. Lấy Key ngầm từ Server
  console.log("Đang lấy API Key OCR.space bảo mật từ Cloudflare Pages...");
  const keyRes = await fetch('/api/ocr-key');
  if (!keyRes.ok) {
    throw new Error(`Không thể lấy API Key từ server: HTTP ${keyRes.status}`);
  }
  const { apiKey } = await keyRes.json();
  if (!apiKey) {
    throw new Error("Không tìm thấy OCR_SPACE_API_KEY trên môi trường server Cloudflare.");
  }

  // 2. Đóng gói FormData trực tiếp từ trình duyệt (Đảm bảo thứ tự tham số: cấu hình trước, file nặng sau cùng)
  const formData = new FormData();
  formData.append('language', 'vie');
  formData.append('isTable', 'true');
  formData.append('scale', 'true');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2'); // Bắt buộc dùng Engine 2 để hỗ trợ tiếng Việt
  formData.append('file', file);      // Sử dụng file nhị phân gốc cực nhẹ

  console.log("Đang gửi yêu cầu trực tiếp từ trình duyệt đến OCR.space API...");
  
  // 3. Bắn thẳng sang Server OCR.space từ trình duyệt
  const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'apikey': apiKey
    },
    body: formData
  });

  if (!ocrResponse.ok) {
    throw new Error(`OCR.space API trả về lỗi: HTTP ${ocrResponse.status}`);
  }

  const data = await ocrResponse.json();
  if (data.IsErroredOnProcessing) {
    const errorDetails = data.ErrorMessage ? data.ErrorMessage.join(', ') : 'Lỗi xử lý không xác định';
    throw new Error(`OCR.space Error: ${errorDetails}`);
  }

  const text = data.ParsedResults?.[0]?.ParsedText;
  if (text === undefined || text === null) {
    throw new Error("OCR.space không trả về kết quả văn bản.");
  }

  return text;
};

/**
 * Hàm gọi trực tiếp API Google Gemini từ Client để chạy OCR (Direct Client-Side Fetch)
 * Giúp giải phóng hoàn toàn gánh nặng CORS và hạn mức payload trên Cloudflare Worker.
 * Tự động rẽ nhánh sang OCR.space nếu bị chặn RECITATION.
 * @param {File} file - File ảnh hoặc PDF thô
 * @param {string} apiKey - API Key Gemini của người dùng
 * @param {string} modelName - Tên Model (ví dụ: gemini-2.5-flash)
 * @param {object} options - Các tùy chọn bổ sung
 * @returns {Promise<string>} Kết quả OCR gộp cuối cùng
 */
export const processPageWithGemini = async (file, modelName, options = {}) => {
  let normalizedModel = modelName || 'gemini-2.5-flash';
  if (normalizedModel === 'gemini-1.5-flash' || normalizedModel === 'gemini-1.5-flash-latest') {
    normalizedModel = 'gemini-2.5-flash';
  } else if (normalizedModel === 'gemini-1.5-pro' || normalizedModel === 'gemini-1.5-pro-latest') {
    normalizedModel = 'gemini-2.5-pro';
  }

  // Đóng gói dữ liệu bằng FormData gửi lên Backend Cloudflare Pages Function /api/gemini-process
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', normalizedModel);
  formData.append('options', JSON.stringify(options));

  console.log("Đang gửi yêu cầu OCR đến gateway bảo mật /api/gemini-process...");
  const response = await fetch('/api/gemini-process', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    let isRecitation = false;
    try {
      const errData = await response.json();
      errorMsg = errData?.error || errorMsg;
      if (errorMsg && errorMsg.toUpperCase().includes("RECITATION")) {
        isRecitation = true;
      }
    } catch {
      // ignore
    }

    if (isRecitation) {
      console.warn("Phát hiện lỗi chứa từ khóa RECITATION từ Gemini API. Chuyển hướng dự phòng sang OCR.space API...");
      return await processPageWithOcrSpace(file);
    }
    
    let friendlyMessage = errorMsg;
    if (response.status === 400 && (errorMsg.includes("API key not valid") || errorMsg.includes("key is invalid"))) {
      friendlyMessage = "API Key cấu hình trên server không hợp lệ hoặc đã hết hạn.";
    } else if (response.status === 429) {
      friendlyMessage = "Hạn mức API Key của server đã bị quá tải (Rate Limit / Quota Exceeded). Vui lòng thử lại sau.";
    } else if (response.status === 403) {
      friendlyMessage = "Truy cập bị từ chối từ máy chủ Google.";
    } else if (response.status === 413) {
      friendlyMessage = "Tài liệu quá lớn so với giới hạn xử lý cho phép.";
    }
    
    const err = new Error(friendlyMessage);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  if (data.candidates?.[0]?.finishReason === 'RECITATION') {
    console.warn("Phát hiện finishReason === 'RECITATION' từ Gemini API. Chuyển hướng dự phòng sang OCR.space API...");
    return await processPageWithOcrSpace(file);
  }

  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (textResult === undefined || textResult === null) {
    const finishReason = data.candidates?.[0]?.finishReason;
    
    if (finishReason === 'RECITATION' || (finishReason && finishReason.toUpperCase().includes('RECITATION'))) {
      console.warn(`Phát hiện finishReason '${finishReason}' chứa từ khóa RECITATION. Chuyển hướng dự phòng sang OCR.space API...`);
      return await processPageWithOcrSpace(file);
    }

    const blockReason = data.promptFeedback?.blockReason;
    const safetyRatings = data.candidates?.[0]?.safetyRatings;
    
    let detailedError = 'Google API không trả về kết quả văn bản.';
    if (finishReason) {
      detailedError += ` (FinishReason: ${finishReason})`;
    }
    if (blockReason) {
      detailedError += ` (BlockReason: ${blockReason})`;
    }
    if (safetyRatings) {
      const blockedRatings = safetyRatings.filter(r => r.probability && r.probability !== 'NEGLIGIBLE');
      if (blockedRatings.length > 0) {
        detailedError += ` (SafetyRatings: ${blockedRatings.map(r => `${r.category}:${r.probability}`).join(', ')})`;
      }
    }
    const err = new Error(detailedError);
    err.status = 400;
    throw err;
  }

  return textResult;
};

/**
 * Hàm wrapper chính cho luồng OCR của hệ thống
 */
export const processOCR = async (file, modelName, options = {}) => {
  return await processPageWithGemini(file, modelName, options);
};
