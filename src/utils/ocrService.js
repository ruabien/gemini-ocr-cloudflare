import { splitPdfToImages } from './pdfProcessor';

/**
 * Hàm gọi Cloudflare Worker để chạy OCR với cơ chế tự động định tuyến làn đường (Smart Router)
 * @param {File} file - File ảnh hoặc PDF thô
 * @param {string} apiKey - API Key Gemini của người dùng
 * @param {string} modelName - Tên Model (ví dụ: gemini-1.5-flash)
 * @param {string} workerUrl - URL của Cloudflare Worker Backend
 * @param {string} lane - Làn đường xử lý ('GOOGLE_GEMINI' hoặc 'CLOUDFLARE_AI')
 * @returns {Promise<string>} Kết quả OCR gộp cuối cùng
 */
export const processOCR = async (file, apiKey, modelName, workerUrl, lane = 'GOOGLE_GEMINI') => {
  if (!workerUrl) throw new Error("Vui lòng cấu hình địa chỉ Cloudflare Worker URL ở phía trên.");
  if (lane === 'GOOGLE_GEMINI' && !apiKey) throw new Error("Vui lòng nhập API Key ở phía trên để sử dụng Google Gemini.");
  
  // Chuẩn hoá URL của Worker
  let targetUrl = workerUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const formData = new FormData();
  formData.append('apiKey', apiKey || '');
  formData.append('model', modelName || '');
  formData.append('lane', lane);

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (lane === 'CLOUDFLARE_AI' && isPdf) {
    // Tách PDF thành từng file ảnh JPEG trên trình duyệt để chuyển sang cho mô hình Vision của Cloudflare
    const images = await splitPdfToImages(file);
    if (images.length === 0) {
      throw new Error("Không thể tách trang từ file PDF này.");
    }
    for (const img of images) {
      formData.append('file', img);
    }
  } else {
    formData.append('file', file);
  }

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

