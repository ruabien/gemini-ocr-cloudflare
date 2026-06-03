/**
 * Nén ảnh chuyên biệt cho OCR.space nếu kích thước vượt quá 5MB
 */
async function compressForOcrSpace(file) {
  if (file.size <= 5 * 1024 * 1024) {
    return file;
  }
  
  console.log(`[OCR.space] File size ${file.size} exceeds 5MB limit, compressing...`);
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.width;
      const height = img.height;
      
      const MAX_DIM = 1600; // Giảm kích thước xuống tối đa 1600px để chắc chắn dung lượng < 5MB
      let newWidth = width;
      let newHeight = height;
      
      if (newWidth > MAX_DIM || newHeight > MAX_DIM) {
        if (newWidth > newHeight) {
          newHeight = Math.round((newHeight * MAX_DIM) / newWidth);
          newWidth = MAX_DIM;
        } else {
          newWidth = Math.round((newWidth * MAX_DIM) / newHeight);
          newHeight = MAX_DIM;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      canvas.toBlob((blob) => {
        canvas.width = 0;
        canvas.height = 0;
        if (!blob) {
          reject(new Error("Lỗi khi nén ảnh cho OCR.space"));
          return;
        }
        const compressedFile = new File([blob], file.name || 'compressed.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        resolve(compressedFile);
      }, 'image/jpeg', 0.6); // Xuất jpeg chất lượng 60%
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không thể tải ảnh để nén cho OCR.space"));
    };
    img.src = objectUrl;
  });
}

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

  let fileToOcr = fileOrBlob;
  if (fileOrBlob instanceof File || fileOrBlob instanceof Blob) {
    try {
      fileToOcr = await compressForOcrSpace(fileOrBlob);
    } catch (compressErr) {
      console.warn("Lỗi khi nén ảnh cho OCR.space:", compressErr);
    }
  }

  // Log dev mode chỉ hiển thị thông tin language, không log API key hay nội dung tài liệu
  console.log(`[OCR.space Proxy Dev Log] Gửi yêu cầu fallback đến proxy nội bộ. Ngôn ngữ: ${lang}`);

  const formData = new FormData();
  formData.append('file', fileToOcr);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s client timeout

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => {
        controller.abort();
      });
    }
  }

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
