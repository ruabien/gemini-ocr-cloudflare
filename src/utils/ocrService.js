/**
 * Chuyển đổi đối tượng File thành chuỗi Base64 trên trình duyệt
 * @param {File} file 
 * @returns {Promise<string>}
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Kết quả ở dạng "data:image/jpeg;base64,..." -> Lấy phần base64 phía sau dấu phẩy
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Lấy mimeType tương ứng của file
 * @param {File} file 
 * @returns {string}
 */
const getMimeType = (file) => {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
};

/**
 * Hàm gọi trực tiếp Google Gemini API từ trình duyệt (Làn đường Gemini)
 * @param {File} file - File ảnh hoặc PDF (< 3 trang)
 * @param {string} apiKey - API Key Google Gemini
 * @param {string} modelName - Tên Model (ví dụ: gemini-2.5-flash)
 * @returns {Promise<string>} Kết quả văn bản OCR từ Gemini
 */
export const processGeminiOCR = async (file, apiKey, modelName) => {
  if (!apiKey) throw new Error("Vui lòng nhập Google API Key ở cấu hình phía trên.");
  if (!modelName) throw new Error("Vui lòng chọn model Gemini.");

  const base64Data = await fileToBase64(file);
  const mimeType = getMimeType(file);

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Hãy OCR và bóc tách toàn bộ văn bản của file này. Giữ nguyên nội dung, tự động sửa các lỗi chính tả dính chữ hoặc xuống dòng vô tội vạ, trả về kết quả là văn bản sạch thuần túy." },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }]
    })
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(`Phản hồi từ Google Gemini không hợp lệ (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data.error?.message || `Lỗi từ Google Gemini (HTTP ${response.status}).`);
  }

  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (textResult === undefined || textResult === null) {
    throw new Error('Google Gemini không trả về văn bản hợp lệ.');
  }

  return textResult;
};

/**
 * Hàm gọi API Hugging Face Space chạy PaddleOCR + ProtonX (Làn đường Open-Source)
 * @param {File} file - Trang ảnh cắt ra từ file PDF gốc
 * @param {string} endpointUrl - Link Hugging Face Space URL
 * @returns {Promise<string>} Kết quả văn bản sạch
 */
export const processOpenSourceOCR = async (file, endpointUrl) => {
  if (!endpointUrl) throw new Error("Vui lòng cấu hình địa chỉ Hugging Face Endpoint URL ở phía trên.");

  let targetUrl = endpointUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  // Tự động thêm hậu tố /ocr nếu người dùng chưa nhập
  if (!targetUrl.endsWith('/ocr') && !targetUrl.endsWith('/ocr/')) {
    targetUrl = targetUrl.replace(/\/$/, '') + '/ocr';
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(targetUrl, {
    method: 'POST',
    body: formData,
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(`Phản hồi từ Hugging Face không hợp lệ hoặc không phải JSON (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data.detail || data.error || `Lỗi hệ thống Hugging Face (HTTP ${response.status}).`);
  }

  return data.text || '';
};
