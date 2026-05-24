import { Buffer } from 'node:buffer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Max-Age': '86400',
};

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
      const model = formData.get('model') || 'gemini-2.5-flash';

      if (!file || !apiKey) {
        return new Response(JSON.stringify({ error: 'Thiếu file hoặc API Key.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
              { text: "Hãy OCR và bóc tách toàn bộ văn bản của file PDF này. Giữ nguyên nội dung, tự động sửa các lỗi chính tả dính chữ hoặc xuống dòng vô tội vạ, trả về kết quả là văn bản sạch thuần túy." },
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
        } catch {}
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

