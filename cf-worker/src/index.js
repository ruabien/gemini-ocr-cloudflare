import { Buffer } from 'node:buffer';
import { requireResolvedGeminiModel } from '../../src/utils/geminiModelResolver.js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Hoặc điền chính xác tên miền https://text24.pages.dev của bạn
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400", // Cho phép trình duyệt lưu bộ nhớ đệm CORS trong 24 giờ
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Chỉ chấp nhận phương thức POST.' }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const apiKey = formData.get('apiKey');
const modelRaw = formData.get('model');
if (!modelRaw) {
  return new Response(JSON.stringify({ error: 'Model not provided.' }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
let model;
try {
  model = requireResolvedGeminiModel(modelRaw);
} catch (e) {
  return new Response(JSON.stringify({ error: e.message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

      if (!file || !apiKey) {
        return new Response(JSON.stringify({ error: 'Thiếu file hoặc API Key.' }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          },
        });
      }

      const fileName = file.name || '';
      let fileType = file.type || '';
      
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

      // Đọc toàn bộ nội dung nhị phân của file thành Base64
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      const base64Data = Buffer.from(fileBytes).toString('base64');

      // Gửi đúng 1 request HTTP POST duy nhất sang API Gemini 2.5 Flash
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `You are a professional legal document digitization engine. Your sole task is to extract all text from the provided image with 100% accuracy.
   
   CRITICAL RULES:
   1. Output ONLY the raw extracted text found inside the document.
   2. DO NOT include any conversational filler, descriptions, prefaces, or introductory remarks (e.g., Do NOT say "Dưới đây là kết quả...", "Here is the extracted text...").
   3. Maintain the original legal formatting, paragraph structure, and wording exactly as it appears in the image.` },
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
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textResult === undefined || textResult === null) {
        const finishReason = data.candidates?.[0]?.finishReason;
        const blockReason = data.promptFeedback?.blockReason;
        const safetyRatings = data.candidates?.[0]?.safetyRatings;
        
        let detailedError = 'Google API không trả về kết quả văn bản.';
        if (finishReason) {
          detailedError += ` (FinishReason: ${finishReason})`;
        }
        if (blockReason) {
          detailedError += ` (BlockReason: ${blockReason})`;
        }
        if (safetyRatings) {
          const blockedRatings = safetyRatings.filter(r => r.probability && r.probability !== 'NEGLIGIBLE');
          if (blockedRatings.length > 0) {
            detailedError += ` (SafetyRatings: ${blockedRatings.map(r => `${r.category}:${r.probability}`).join(', ')})`;
          }
        }
        throw new Error(detailedError);
      }

      return new Response(JSON.stringify({ text: textResult }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      });

    } catch (err) {
      console.error('Lỗi hệ thống Worker:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      });
    }
  },
};

