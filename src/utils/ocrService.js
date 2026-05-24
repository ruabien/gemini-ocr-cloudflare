/**
 * Hàm gọi Cloudflare Worker để chạy OCR với cơ chế stream nhận dữ liệu thời gian thực
 * @param {File} file - File ảnh hoặc PDF thô
 * @param {string} apiKey - API Key Gemini của người dùng
 * @param {string} modelName - Tên Model (ví dụ: gemini-1.5-flash)
 * @param {string} workerUrl - URL của Cloudflare Worker Backend
 * @param {Function} onEvent - Callback nhận các sự kiện stream (init, page_start, page_retry, page_complete, page_error, complete)
 * @returns {Promise<string>} Kết quả OCR gộp cuối cùng
 */
export const processOCR = async (file, apiKey, modelName, workerUrl) => {
  if (!workerUrl) throw new Error("Vui lòng cấu hình địa chỉ Cloudflare Worker URL ở phía trên.");
  if (!apiKey) throw new Error("Vui lòng nhập API Key ở phía trên.");
  
  // Chuẩn hoá URL của Worker
  let targetUrl = workerUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('apiKey', apiKey);
  formData.append('model', modelName);

  const response = await fetch(targetUrl, {
    method: 'POST',
    body: formData,
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(`Phản hồi từ Worker không hợp lệ hoặc không phải JSON (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Lỗi hệ thống Worker (HTTP ${response.status}).`);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data.text || '';
};

