import { PDFDocument } from 'pdf-lib';
import { Buffer } from 'node:buffer';

const SYSTEM_PROMPT = "Bạn là một chuyên gia OCR tài liệu tiếng Việt chất lượng cao. Hãy trích xuất toàn bộ văn bản có trong tài liệu này. Giữ nguyên định dạng gốc, các đoạn xuống dòng, tiêu đề và cấu trúc bảng biểu nếu có. Tuyệt đối không tự bịa thông tin, không thêm lời giải thích hay bình luận, chỉ trả về văn bản được trích xuất.";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Max-Age': '86400',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  async fetch(request, env, ctx) {
    // Xử lý CORS Preflight
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
      const fileType = file.type || '';
      const isPdf = fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        // Đọc file PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuffer);
        
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        
        const batchSize = 5;
        const results = [];

        for (let i = 0; i < pageCount; i += batchSize) {
          const batchIndices = [];
          for (let j = i; j < Math.min(i + batchSize, pageCount); j++) {
            batchIndices.push(j);
          }

          // Tạo file PDF mới chỉ chứa các trang trong cụm (tối đa 5 trang)
          const batchDoc = await PDFDocument.create();
          const copiedPages = await batchDoc.copyPages(pdfDoc, batchIndices);
          copiedPages.forEach(page => batchDoc.addPage(page));
          const batchBytes = await batchDoc.save();
          const base64Pdf = Buffer.from(batchBytes).toString('base64');

          // Gọi Gemini API cho cụm trang này
          const textResult = await processOCRWithRetry(
            base64Pdf,
            'application/pdf',
            apiKey,
            model
          );

          results.push(textResult);

          // Giãn cách các request cụm là 3.5 giây để tránh lỗi Rate Limit 429
          if (i + batchSize < pageCount) {
            await sleep(3500);
          }
        }

        // Gộp kết quả của tất cả các cụm
        const mergedText = results.join('\n\n');

        return new Response(JSON.stringify({ text: mergedText }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } else if (fileType.startsWith('image/')) {
        // Đọc file Ảnh
        const arrayBuffer = await file.arrayBuffer();
        const imgBytes = new Uint8Array(arrayBuffer);
        const base64Img = Buffer.from(imgBytes).toString('base64');

        const textResult = await processOCRWithRetry(
          base64Img,
          fileType,
          apiKey,
          model
        );

        return new Response(JSON.stringify({ text: textResult }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } else {
        return new Response(JSON.stringify({ error: `Định dạng tệp không được hỗ trợ: ${fileType}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
 * Gọi API Gemini với cơ chế Retry nâng cao cho các mã lỗi 429, 503 hoặc các lỗi server 5xx.
 */
async function processOCRWithRetry(base64Data, mimeType, apiKey, modelName, maxRetries = 5) {
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

  for (let i = 0; i < maxRetries; i++) {
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

    // Bắt các lỗi tạm thời: 429 (Rate Limit / Quota Exceeded), 503 (Service Unavailable), hoặc lỗi Server >= 500
    if (response.status === 429 || response.status === 503 || response.status >= 500) {
      if (i === maxRetries - 1) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData?.error?.message || errorMsg;
        } catch {
          // Bỏ qua
        }
        throw new Error(`Đã thử lại ${maxRetries} lần nhưng thất bại: ${errorMsg}`);
      }

      const isRateLimit = response.status === 429;
      // Nếu bị Rate Limit, đợi 15s trước khi thử lại; nếu lỗi khác, dùng exponential backoff
      const waitTime = isRateLimit ? 15000 : Math.pow(2, i) * 3000;
      
      console.warn(`Lỗi Gemini (${response.status}). Thử lại lần ${i + 1}/${maxRetries} sau ${waitTime / 1000}s...`);
      await sleep(waitTime);
      continue;
    }

    // Nếu gặp các lỗi client-side khác (ví dụ: 400, 403 - Invalid Key), báo lỗi ngay lập tức
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData?.error?.message || errorMsg;
    } catch {
      // Bỏ qua
    }
    throw new Error(`Lỗi API Gemini: ${errorMsg}`);
  }
}

