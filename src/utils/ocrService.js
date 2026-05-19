const SYSTEM_PROMPT = "Bạn là một chuyên gia OCR tài liệu tiếng Việt chất lượng cao. Hãy trích xuất toàn bộ văn bản có trong tài liệu này. Giữ nguyên định dạng gốc, các đoạn xuống dòng, tiêu đề và cấu trúc bảng biểu nếu có. Tuyệt đối không tự bịa thông tin, không thêm lời giải thích hay bình luận, chỉ trả về văn bản được trích xuất.";

/**
 * Hàm gọi API với cơ chế tự động thử lại (Retry) khi server quá tải
 */
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.ok) {
      return response;
    }
    
    // Bắt lỗi 503, 429 hoặc các lỗi 5xx từ server
    if (response.status === 503 || response.status === 429 || response.status >= 500) {
      if (i === maxRetries - 1) {
        return response; // Hết số lần thử, trả về lỗi cuối cùng
      }
      
      const waitTime = (i + 1) * 5000;
      console.warn(`Server Google bận (Status ${response.status}). Tự động thử lại lần ${i + 1} sau ${waitTime/1000}s...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
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
    // Gửi trực tiếp đối tượng File (Binary Stream) lên server Google, 
    // KHÔNG qua Base64 giúp tiết kiệm RAM và không làm tắc nghẽn băng thông.
    body: file, 
  }, 3);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || `Lỗi Upload File: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.file; // Trả về thông tin file gồm file.uri
};

/**
 * Hàm xử lý gọi trực tiếp qua fetch đến Google Gemini Cloud API
 */
export const processOCR = async (file, apiKey, modelName) => {
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
    }, 3); // Thử lại tối đa 3 lần nếu Google bị bận

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error?.message || `HTTP Error ${response.status}`);
    }

    const data = await response.json();
    
    // Trích xuất văn bản từ response chuẩn của Gemini REST API
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
