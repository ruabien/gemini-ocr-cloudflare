import { Buffer } from 'node:buffer';

const SYSTEM_PROMPT = "Hãy OCR và bóc tách toàn bộ văn bản của file PDF này. Giữ nguyên nội dung, tự động sửa các lỗi chính tả dính chữ hoặc xuống dòng vô tội vạ, trả về kết quả là văn bản sạch thuần túy.";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Max-Age': '86400',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Chỉ chấp nhận phương thức POST.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const apiKey = formData.get('apiKey');
      const model = formData.get('model') || 'gemini-1.5-flash';

      if (!file || !apiKey) {
        return new Response(JSON.stringify({ error: 'Thiếu file hoặc API Key.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fileName = file.name || '';
      let fileType = file.type || '';
      
      // Tự động nhận diện mimeType dựa trên đuôi file nếu thiếu
      if (!fileType) {
        if (fileName.toLowerCase().endsWith('.pdf')) {
          fileType = 'application/pdf';
        } else if (fileName.toLowerCase().endsWith('.png')) {
          fileType = 'image/png';
        } else if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) {
          fileType = 'image/jpeg';
        } else {
          fileType = 'application/octet-stream';
        }
      }

      // Đọc toàn bộ nội dung nhị phân (Binary/Blob) của file
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      const base64Data = Buffer.from(fileBytes).toString('base64');

      // Gửi đúng 1 request duy nhất sang Gemini API
      const textResult = await processOCRWithRetry(
        base64Data,
        fileType,
        apiKey,
        model,
        3 // Tối đa 3 lần thử lại
      );

      return new Response(JSON.stringify({ text: textResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      console.error('Lỗi hệ thống Worker:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Gọi API Gemini với cơ chế Retry thích ứng động khi gặp lỗi Quota/Rate Limit.
 */
async function processOCRWithRetry(base64Data, mimeType, apiKey, modelName, maxRetries = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
  };

  const totalAttempts = maxRetries + 1;

  for (let i = 0; i < totalAttempts; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResult === undefined || textResult === null) {
          throw new Error('API không trả về kết quả văn bản hợp lệ.');
        }
        return textResult;
      }

      if (response.status === 429 || response.status === 503 || response.status >= 500) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData?.error?.message || errorMsg;
        } catch {}

        if (i === totalAttempts - 1) {
          throw new Error(`Đã thử lại ${maxRetries} lần nhưng thất bại: ${errorMsg}`);
        }

        const isRateLimit = response.status === 429;
        let waitTime = isRateLimit ? 15000 : Math.pow(2, i) * 3000;

        // Tự động nhận diện thời gian chờ yêu cầu từ Google
        const retryMatch = errorMsg.match(/Please retry in ([0-9.]+)\s*s/i);
        if (retryMatch) {
          const seconds = parseFloat(retryMatch[1]);
          if (!isNaN(seconds)) {
            waitTime = Math.ceil((seconds + 2) * 1000);
          }
        }

        console.warn(`Lỗi Gemini (${response.status}). Thử lại lần thứ ${i + 1}/${maxRetries} sau ${waitTime / 1000}s...`);
        await sleep(waitTime);
        continue;
      }

      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData?.error?.message || errorMsg;
      } catch {}
      throw new Error(`Lỗi API Gemini: ${errorMsg}`);

    } catch (err) {
      if (i === totalAttempts - 1) {
        throw err;
      }
      
      let waitTime = 15000;
      const retryMatch = err.message.match(/Please retry in ([0-9.]+)\s*s/i);
      if (retryMatch) {
        const seconds = parseFloat(retryMatch[1]);
        if (!isNaN(seconds)) {
          waitTime = Math.ceil((seconds + 2) * 1000);
        }
      }
      
      console.warn(`Lỗi kết nối hoặc xử lý API: ${err.message}. Thử lại lần thứ ${i + 1}/${maxRetries} sau ${waitTime / 1000}s...`);
      await sleep(waitTime);
    }
  }
}
