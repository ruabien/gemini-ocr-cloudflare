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
      let files = [];
      const fileCountStr = formData.get('fileCount');
      if (fileCountStr) {
        const fileCount = parseInt(fileCountStr, 10);
        for (let idx = 0; idx < fileCount; idx++) {
          const f = formData.get(`file_${idx}`);
          if (f) files.push(f);
        }
      } else {
        const f = formData.get('file');
        if (f) files.push(f);
      }
      
      const apiKey = formData.get('apiKey');
      const model = formData.get('model') || 'gemini-2.5-flash';
      const lane = formData.get('lane') || 'GOOGLE_GEMINI';

      if (files.length === 0) {
        return new Response(JSON.stringify({ error: 'Thiếu file tải lên.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (lane === 'CLOUDFLARE_AI') {
        let fullExtractedText = "";
        
        // Băm file thành từng cụm 3 trang ảnh, xử lý tuần tự từng cụm
        for (let i = 0; i < files.length; i += 3) {
          const chunk = files.slice(i, i + 3);
          const chunkPromises = chunk.map(async (fileItem) => {
            const arrayBuffer = await fileItem.arrayBuffer();
            const imageBytes = new Uint8Array(arrayBuffer);
            
            // Gọi AI Cloudflare xử lý song song các trang trong cụm
            const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
              image: Array.from(imageBytes),
              prompt: "Hãy OCR và bóc tách toàn bộ văn bản của trang tài liệu này. Giữ nguyên nội dung, tự động sửa các lỗi chính tả dính chữ hoặc xuống dòng vô tội vạ, trả về kết quả là văn bản sạch thuần túy."
            });
            return response.response || '';
          });
          
          const chunkTexts = await Promise.all(chunkPromises);
          const resultTextFromAI = chunkTexts.filter(Boolean).join('\n\n');
          if (resultTextFromAI) {
            fullExtractedText += resultTextFromAI + "\n\n";
          }
        }

        return new Response(JSON.stringify({ text: fullExtractedText.trim() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } else {
        // Mặc định hoặc GOOGLE_GEMINI
        const file = files[0];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'Thiếu API Key cho Google Gemini.' }), {
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
                { text: "Hãy OCR và bóc tách toàn bộ văn bản của file PDF/ảnh này. Giữ nguyên nội dung, tự động sửa các lỗi chính tả dính chữ hoặc xuống dòng vô tội vạ, trả về kết quả là văn bản sạch thuần túy." },
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
          throw new Error('API không trả về kết quả văn bản hợp lệ.');
        }

        return new Response(JSON.stringify({ text: textResult }), {
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

