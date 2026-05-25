/**
 * Helper to convert file to base64 string
 * @param {File} file 
 * @returns {Promise<string>}
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Hàm gọi trực tiếp API Google Gemini từ Client để chạy OCR (Direct Client-Side Fetch)
 * Giúp giải phóng hoàn toàn gánh nặng CORS và hạn mức payload trên Cloudflare Worker.
 * @param {File} file - File ảnh hoặc PDF thô
 * @param {string} apiKey - API Key Gemini của người dùng
 * @param {string} modelName - Tên Model (ví dụ: gemini-2.5-flash)
 * @param {string} workerUrl - (Bỏ qua/Không dùng)
 * @returns {Promise<string>} Kết quả OCR gộp cuối cùng
 */
export const processOCR = async (file, apiKey, modelName, workerUrl) => {
  if (!apiKey) throw new Error("Vui lòng nhập API Key ở phía trên.");
  
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

  // Chuyển file sang Base64
  const base64Data = await fileToBase64(file);

  // Gọi trực tiếp đến Google Gemini API
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "You are a strict OCR engine. Your only task is to extract all visible text from the provided image/PDF. You MUST NOT add any introductory remarks, explanations, greetings, or conclusions (e.g., do not write 'Here is the extracted text...'). Output ONLY the raw extracted text. Keep the exact layout, paragraphs, and original content." },
          {
            inlineData: {
              mimeType: fileType,
              data: base64Data
            }
          }
        ]
      }],
      systemInstruction: {
        parts: [
          { text: "You are a strict OCR engine. Your only task is to extract all visible text from the provided image/PDF. You MUST NOT add any introductory remarks, explanations, greetings, or conclusions (e.g., do not write 'Here is the extracted text...'). Output ONLY the raw extracted text. Keep the exact layout, paragraphs, and original content." }
        ]
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    })
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errorMsg = errData?.error?.message || errorMsg;
    } catch {}
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
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
    const err = new Error(detailedError);
    err.status = 400;
    throw err;
  }

  return textResult;
};
