/**
 * Hàm gọi Cloudflare Worker để chạy OCR với cơ chế stream nhận dữ liệu thời gian thực
 * @param {File} file - File ảnh hoặc PDF thô
 * @param {string} apiKey - API Key Gemini của người dùng
 * @param {string} modelName - Tên Model (ví dụ: gemini-1.5-flash)
 * @param {string} workerUrl - URL của Cloudflare Worker Backend
 * @param {Function} onEvent - Callback nhận các sự kiện stream (init, page_start, page_retry, page_complete, page_error, complete)
 * @returns {Promise<string>} Kết quả OCR gộp cuối cùng
 */
export const processOCR = async (file, apiKey, modelName, workerUrl, onEvent) => {
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

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Giữ lại dòng chưa hoàn chỉnh trong bộ đệm

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let dataStr = trimmed;
        if (trimmed.startsWith('data: ')) {
          dataStr = trimmed.slice(6);
        }

        try {
          const event = JSON.parse(dataStr);
          if (onEvent) {
            onEvent(event);
          }
          if (event.type === 'complete') {
            finalResult = event.text;
            if (event.status === 'error') {
              throw new Error(event.error || 'Một số trang có lỗi khi chạy OCR.');
            }
          }
          if (event.type === 'error') {
            throw new Error(event.error || 'Lỗi xử lý hệ thống Worker.');
          }
        } catch (e) {
          // Nếu đó là lỗi của OCR (quá trình truyền lỗi từ Worker), ta ném lỗi ra
          if (e.message.includes('Lỗi') || e.message.includes('error')) {
            throw e;
          }
          console.error("Lỗi parse dòng dữ liệu stream:", dataStr, e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return finalResult;
};
