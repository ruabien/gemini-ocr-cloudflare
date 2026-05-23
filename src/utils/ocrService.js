/**
 * Hàm gọi trực tiếp API Google Gemini từ Frontend để chạy OCR
 * @param {File} file - File ảnh thô
 * @param {string} apiKey - API Key Gemini của người dùng
 * @param {string} modelName - Tên Model (ví dụ: gemini-2.5-flash)
 * @returns {Promise<string>} Kết quả OCR văn bản sạch
 */
export const processOCR = async (file, apiKey, modelName) => {
  if (!apiKey) throw new Error("Vui lòng nhập API Key ở phía trên.");
  
  const fileType = file.type || 'image/jpeg';
  
  // Đọc nội dung file thành Base64
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Hãy OCR và bóc tách toàn bộ văn bản của hình ảnh/trang tài liệu này. Giữ nguyên nội dung, tự động sửa các lỗi chính tả dính chữ hoặc xuống dòng vô tội vạ, trả về kết quả là văn bản sạch thuần túy." },
          {
            inlineData: {
              mimeType: fileType,
              data: base64Data
            }
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errorMsg = errData?.error?.message || errorMsg;
    } catch (e) {
      console.warn("Không thể parse JSON lỗi:", e);
    }
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (textResult === undefined || textResult === null) {
    throw new Error('API không trả về kết quả văn bản hợp lệ.');
  }

  return textResult;
};

