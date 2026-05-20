const SYSTEM_PROMPT = "Bạn là một chuyên gia OCR tài liệu tiếng Việt chất lượng cao. Hãy trích xuất toàn bộ văn bản có trong tài liệu này. Giữ nguyên định dạng gốc, các đoạn xuống dòng, tiêu đề và cấu trúc bảng biểu nếu có. Tuyệt đối không tự bịa thông tin, không thêm lời giải thích hay bình luận, chỉ trả về văn bản được trích xuất.";

/**
 * Hàm gọi API với cơ chế tự động thử lại (Retry) nâng cao và đếm ngược thời gian chờ
 */
const fetchWithRetry = async (url, options, maxRetries = 5, onRetry) => {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.ok) {
      return response;
    }
    
    // Bắt lỗi 503 (High Demand), 429 (Quota Exceeded) hoặc các lỗi 5xx khác
    if (response.status === 503 || response.status === 429 || response.status >= 500) {
      if (i === maxRetries - 1) {
        return response; // Hết số lần thử, trả về lỗi cuối cùng
      }
      
      // Tính toán thời gian chờ theo hàm mũ (Exponential Backoff): 6s, 12s, 24s, 48s...
      const waitTime = Math.pow(2, i) * 6000;
      
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.clone().json();
        errorMsg = errorData?.error?.message || errorMsg;
      } catch (_) {}

      console.warn(`Server Google bận (${errorMsg}). Tự động thử lại lần ${i + 1}/${maxRetries} sau ${waitTime/1000}s...`);
      
      // Thực hiện đếm ngược từng giây để báo cáo tiến trình lên UI
      const totalSeconds = waitTime / 1000;
      for (let seconds = totalSeconds; seconds > 0; seconds--) {
        if (onRetry) {
          onRetry(i + 1, maxRetries, seconds, errorMsg);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      continue;
    }
    
    return response;
  }
};

/**
 * Hàm upload file lên Google Gemini File API (Tránh lỗi 503 do Payload Base64 quá lớn)
 */
const uploadFileToGemini = async (file, apiKey) => {
  const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
  
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'raw',
      'X-Goog-Upload-Header-Content-Length': file.size.toString(),
      'X-Goog-Upload-Header-Content-Type': file.type,
      'Content-Type': file.type,
    },
    body: file, 
  }, 3); // Giữ nguyên 3 lần thử khi upload file

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || `Lỗi Upload File: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.file;
};

/**
 * Hàm xử lý gọi trực tiếp qua fetch đến Google Gemini Cloud API
 */
export const processOCR = async (file, apiKey, modelName, onRetry) => {
  if (!apiKey) throw new Error("Vui lòng nhập API Key cấu hình ở trên.");
  if (!modelName) throw new Error("Vui lòng chọn Model.");

  try {
    // BƯỚC 1: Tải file lên hệ thống File API của Google
    const uploadedFile = await uploadFileToGemini(file, apiKey);
    
    // BƯỚC 2: Gọi lệnh generateContent với File URI vừa được cấp
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            { 
              fileData: { 
                mimeType: uploadedFile.mimeType, 
                fileUri: uploadedFile.uri 
              } 
            }
          ]
        }
      ]
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }, 5, onRetry); // Thử lại tối đa 5 lần với exponential backoff nếu Google bận

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error?.message || `HTTP Error ${response.status}`);
    }

    const data = await response.json();
    
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textResult === undefined || textResult === null) {
      throw new Error("API không trả về kết quả văn bản hợp lệ.");
    }

    return textResult;
  } catch (error) {
    console.error("Lỗi khi xử lý OCR:", error);
    throw new Error(error.message || "Đã xảy ra lỗi khi kết nối Gemini API.");
  }
};
