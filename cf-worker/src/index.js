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

        // Tạo danh sách các cụm trang (batches) trước
        const batches = [];
        for (let i = 0; i < pageCount; i += batchSize) {
          const batchIndices = [];
          for (let j = i; j < Math.min(i + batchSize, pageCount); j++) {
            batchIndices.push(j);
          }
          batches.push(batchIndices);
        }

        // Chạy tuần tự qua từng cụm sử dụng vòng lặp for...of để tránh gọi đồng thời
        let idx = 0;
        for (const batch of batches) {
          // Tạo file PDF mới chỉ chứa các trang trong cụm (tối đa 5 trang)
          const batchDoc = await PDFDocument.create();
          const copiedPages = await batchDoc.copyPages(pdfDoc, batch);
          copiedPages.forEach(page => batchDoc.addPage(page));
          const batchBytes = await batchDoc.save();
          const base64Pdf = Buffer.from(batchBytes).toString('base64');

          // Gọi Gemini API cho cụm trang này
          const textResult = await processOCRWithRetry(
            base64Pdf,
            'application/pdf',
            apiKey,
            model,
            3 // Tối đa 3 lần thử lại
          );

          results.push(textResult);

          // Cài đặt hàm đóng băng thời gian (Await Sleep) nghỉ bắt buộc 4 giây trước cụm tiếp theo
          if (idx < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 4000));
          }
          idx++;
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
          model,
          3 // Tối đa 3 lần thử lại
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
 * Nếu bị lỗi 429, luồng nghỉ hẳn 15 giây rồi thực hiện gọi lại chính cụm lỗi đó (tối đa 3 lần thử lại).
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
        const isRateLimit = response.status === 429;
        
        if (i === totalAttempts - 1) {
          let errorMsg = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData?.error?.message || errorMsg;
          } catch {}
          throw new Error(`Đã thử lại ${maxRetries} lần nhưng thất bại: ${errorMsg}`);
        }

        // Nghỉ hẳn 15 giây đối với lỗi 429 (Rate Limit); nếu lỗi khác dùng exponential backoff
        const waitTime = isRateLimit ? 15000 : Math.pow(2, i) * 3000;
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
      console.warn(`Lỗi khi gọi API: ${err.message}. Thử lại lần thứ ${i + 1}/${maxRetries} sau 15s...`);
      await sleep(15000);
    }
  }
}

