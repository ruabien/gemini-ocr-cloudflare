import { PDFDocument } from 'pdf-lib';
import { Buffer } from 'node:buffer';

const SYSTEM_PROMPT = "Bạn là một chuyên gia OCR tài liệu tiếng Việt chất lượng cao. Hãy trích xuất toàn bộ văn bản có trong tài liệu này. Giữ nguyên định dạng gốc, các đoạn xuống dòng, tiêu đề và cấu trúc bảng biểu nếu có. Tuyệt đối không tự bịa thông tin, không thêm lời giải thích hay bình luận, chỉ trả về văn bản được trích xuất.";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Max-Age': '86400',
};

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

      // Tạo ReadableStream để truyền dữ liệu thời gian thực (Server-Sent Events)
      const { writable, readable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      const sendEvent = async (data) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Xử lý không đồng bộ trong Worker
      ctx.waitUntil((async () => {
        try {
          const fileType = file.type || '';
          
          if (fileType.includes('pdf')) {
            // Đọc file PDF
            const arrayBuffer = await file.arrayBuffer();
            const pdfBytes = new Uint8Array(arrayBuffer);
            
            await sendEvent({ type: 'status', message: 'Đang đọc và phân tích cấu trúc PDF...' });
            
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pageCount = pdfDoc.getPageCount();
            
            await sendEvent({ type: 'init', totalPages: pageCount });

            const results = [];

            for (let i = 0; i < pageCount; i++) {
              await sendEvent({ type: 'page_start', pageIndex: i });

              try {
                // Tạo một trang PDF đơn lẻ mới để gửi cho Gemini OCR
                const newDoc = await PDFDocument.create();
                const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
                newDoc.addPage(copiedPage);
                const singlePageBytes = await newDoc.save();
                const base64Pdf = Buffer.from(singlePageBytes).toString('base64');

                // Gọi Gemini OCR với cơ chế Retry nâng cao
                const textResult = await processOCRWithRetry(
                  base64Pdf,
                  'application/pdf',
                  apiKey,
                  model,
                  async (attempt, maxAttempts, secondsLeft, errorMsg) => {
                    await sendEvent({
                      type: 'page_retry',
                      pageIndex: i,
                      attempt,
                      maxAttempts,
                      secondsLeft,
                      errorMsg,
                    });
                  }
                );

                results.push({ pageIndex: i, text: textResult });
                await sendEvent({ type: 'page_complete', pageIndex: i, text: textResult });

              } catch (pageErr) {
                console.error(`Lỗi trang ${i + 1}:`, pageErr);
                results.push({ pageIndex: i, text: `[Lỗi OCR: ${pageErr.message}]`, error: pageErr.message });
                await sendEvent({ type: 'page_error', pageIndex: i, error: pageErr.message });
              }

              // Khoảng trễ nhỏ giữa các trang tránh quá tải cục bộ (2 giây)
              if (i < pageCount - 1) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            }

            // Gộp tất cả các trang
            const mergedText = results
              .sort((a, b) => a.pageIndex - b.pageIndex)
              .map(p => `--- TRANG ${p.pageIndex + 1} ---\n${p.text}`)
              .join('\n\n');

            const hasErrors = results.some(r => r.error);
            await sendEvent({ 
              type: 'complete', 
              text: mergedText, 
              status: hasErrors ? 'error' : 'completed',
              error: hasErrors ? 'Một số trang có lỗi khi chạy OCR.' : null
            });

          } else if (fileType.startsWith('image/')) {
            // Đọc file Ảnh
            await sendEvent({ type: 'init', totalPages: 1 });
            await sendEvent({ type: 'page_start', pageIndex: 0 });

            const arrayBuffer = await file.arrayBuffer();
            const imgBytes = new Uint8Array(arrayBuffer);
            const base64Img = Buffer.from(imgBytes).toString('base64');

            try {
              const textResult = await processOCRWithRetry(
                base64Img,
                fileType,
                apiKey,
                model,
                async (attempt, maxAttempts, secondsLeft, errorMsg) => {
                  await sendEvent({
                    type: 'page_retry',
                    pageIndex: 0,
                    attempt,
                    maxAttempts,
                    secondsLeft,
                    errorMsg,
                  });
                }
              );

              await sendEvent({ type: 'page_complete', pageIndex: 0, text: textResult });
              await sendEvent({ type: 'complete', text: textResult, status: 'completed' });

            } catch (imgErr) {
              console.error('Lỗi khi OCR ảnh:', imgErr);
              await sendEvent({ type: 'page_error', pageIndex: 0, error: imgErr.message });
              await sendEvent({ type: 'complete', text: `[Lỗi OCR: ${imgErr.message}]`, status: 'error', error: imgErr.message });
            }

          } else {
            throw new Error(`Định dạng tệp không được hỗ trợ: ${fileType}`);
          }

        } catch (err) {
          console.error('Lỗi hệ thống Worker:', err);
          await sendEvent({ type: 'error', error: err.message });
        } finally {
          await writer.close();
        }
      })());

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } catch (globalErr) {
      console.error('Lỗi chung nhận request:', globalErr);
      return new Response(JSON.stringify({ error: globalErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Gọi API Gemini với cơ chế Exponential Backoff Retry cho các mã lỗi 429, 503 hoặc các lỗi server 5xx.
 */
async function processOCRWithRetry(base64Data, mimeType, apiKey, modelName, onRetry, maxRetries = 5) {
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
        // Hết số lần thử, ném lỗi ra
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData?.error?.message || errorMsg;
        } catch (_) {}
        throw new Error(`Đã thử lại ${maxRetries} lần nhưng thất bại: ${errorMsg}`);
      }

      // Exponential Backoff: 6s, 12s, 24s, 48s...
      const waitTime = Math.pow(2, i) * 6000;
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.clone().json();
        errorMsg = errorData?.error?.message || errorMsg;
      } catch (_) {}

      console.warn(`Lỗi Gemini (${errorMsg}). Đang chuẩn bị thử lại lần ${i + 1}/${maxRetries} sau ${waitTime / 1000}s...`);

      // Thực hiện đếm ngược từng giây để cập nhật trạng thái lên UI qua Callback
      const totalSeconds = waitTime / 1000;
      for (let seconds = totalSeconds; seconds > 0; seconds--) {
        if (onRetry) {
          await onRetry(i + 1, maxRetries, seconds, errorMsg);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      continue;
    }

    // Nếu gặp các lỗi client-side khác (ví dụ: 400, 403 - Invalid Key), báo lỗi ngay lập tức
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData?.error?.message || errorMsg;
    } catch (_) {}
    throw new Error(`Lỗi API Gemini: ${errorMsg}`);
  }
}
