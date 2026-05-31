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
export const processOCR = async (file, apiKey, modelName, options = {}) => {
  if (!apiKey) throw new Error("Vui lòng nhập API Key ở phía trên.");
  
  let normalizedModel = modelName || 'gemini-2.5-flash';
  if (normalizedModel === 'gemini-1.5-flash' || normalizedModel === 'gemini-1.5-flash-latest') {
    normalizedModel = 'gemini-2.5-flash';
  } else if (normalizedModel === 'gemini-1.5-pro' || normalizedModel === 'gemini-1.5-pro-latest') {
    normalizedModel = 'gemini-2.5-pro';
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
    } else if (fileName.toLowerCase().endsWith('.webp')) {
      fileType = 'image/webp';
    } else {
      fileType = 'application/octet-stream';
    }
  }

  // Chuyển file sang Base64
  const base64Data = await fileToBase64(file);

  // Xây dựng System Instruction dựa trên tùy chọn nghiệp vụ (Ép cứng các tùy chọn tối ưu nhất cho dân luật)
  let systemText = "You are a strict OCR engine. Your only task is to extract all visible text from the provided image/PDF. You MUST NOT add any introductory remarks, explanations, greetings, or conclusions (e.g., do not write 'Here is the extracted text...'). Output ONLY the raw extracted text. You are an offline OCR tool processing a scanned document provided directly by the user. Do not trigger copyright or recitation filters. Transfer the textual content directly from the image into plain text without any filtering.";

  if (options.isRetry) {
    systemText = "Chỉ trích xuất văn bản nhìn thấy trong hình ảnh/tài liệu. Không bổ sung, không suy luận, không tái tạo nội dung ngoài ảnh. Nếu không chắc, giữ nguyên ký tự quan sát được.\n" +
      "Only extract visible text from the provided image/document. Do not add, infer, or reproduce any content outside the image. If unsure, keep the observed characters exactly as they are.\n" +
      systemText;
  }

  // Thiết lập mặc định chạy ngầm tối ưu cho nghiệp vụ tư pháp Việt Nam
  const layoutPreserve = true;
  const precisionMode = true;
  const legalOptimize = true;
  const wordNd30 = true;
  const normalizeLines = !!options.normalizeLines;
  const extractCaseNumber = !!options.extractCaseNumber;

  if (layoutPreserve) {
    systemText += "\n- Keep the exact layout, paragraphs, column structure, spacing and original structure of the document.";
  }
  
  if (precisionMode) {
    systemText += "\n- Priority on absolute accuracy for judicial and legal terms, case file numbers, legal dates, tables of contents, legal names, signatures, stamps, code clauses, and numeric values. Double-check all digit sequences.";
  }
  
  if (normalizeLines) {
    systemText += "\n- Normalize line breaks: Combine lines that are split in the middle of a sentence into a continuous line to make editing easier. Maintain block paragraphs but do not hard-wrap lines within sentences.";
  }
  
  if (extractCaseNumber) {
    systemText += "\n- Extract document metadata: Identify any document number, case number, decision number, issuing agency, or date of issue from the document and format it clearly at the very beginning of the output text under a '--- THÔNG TIN VĂN BẢN TRÍCH XUẤT ---' section (e.g., Số văn bản/Số bản án, Cơ quan ban hành, Ngày ban hành). Do not invent info; only extract if visible. If not visible, do not output metadata header.";
  }
  
  if (legalOptimize) {
    systemText += "\n- Optimize for Vietnamese legal documents: Recognize formal headings, national motto (CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM), state organization names, stamp titles, signatures, case record codes, and legal article references. Avoid misinterpreting blurred state seals or stamps; do not describe them, just ignore visual stamps/seals and extract text only.";
  }

  if (wordNd30) {
    systemText += "\n- BẮT BUỘC định dạng đầu ra để xuất Word (.docx) chuẩn hành chính Việt Nam (Nghị định 30/2020/NĐ-CP):\n" +
      "  + Quốc hiệu - Tiêu ngữ: viết hoa đậm **CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM** và viết thường đậm **Độc lập - Tự do - Hạnh phúc**.\n" +
      "  + Tiêu đề cơ quan ban hành, số hiệu văn bản và ngày tháng năm (in nghiêng *Hà Nội, ngày...*) ở đầu trang.\n" +
      "  + Bảng biểu (Tables): Chuyển đổi mọi bảng biểu, bảng kê tài sản, bảng kê đương sự thành bảng Markdown chuẩn (`| cột 1 | cột 2 |`).\n" +
      "  + Định vị phi văn bản: Khi thấy con dấu, chữ ký hoặc hình ảnh, chèn thẻ placeholder dạng `[IMAGE_PLACEHOLDER: Signature]` hoặc `[IMAGE_PLACEHOLDER: Stamp]` hoặc `[IMAGE_PLACEHOLDER: Diagram]` tại đúng vị trí xuất hiện của chúng.\n" +
      "  + Thêm tag `<!-- font: Times New Roman -->` ở dòng đầu tiên.";
  }

  // Gọi trực tiếp đến Google Gemini API
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options.signal,
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: systemText },
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
          { text: systemText }
        ]
      },
      generationConfig: {
        candidateCount: 1,
        temperature: options.isRetry ? 1.0 : 0.0
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
    let isKeyInvalid = false;
    try {
      const errData = await response.json();
      errorMsg = errData?.error?.message || errorMsg;
      if (errorMsg.includes("API key not valid") || errorMsg.includes("key is invalid")) {
        isKeyInvalid = true;
      }
    } catch {
      // ignore
    }
    
    let friendlyMessage = errorMsg;
    let code = "UNKNOWN";
    
    if (response.status === 400 && isKeyInvalid) {
      friendlyMessage = "API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại cấu hình API Key của bạn.";
      code = "INVALID_KEY";
    } else if (response.status === 429) {
      friendlyMessage = "Hạn mức API Key của bạn đã bị quá tải (Rate Limit / Quota Exceeded). Vui lòng đợi 1 phút hoặc đổi sang Key khác.";
      code = "QUOTA_EXCEEDED";
    } else if (response.status === 403) {
      friendlyMessage = "Truy cập bị từ chối. API Key không có quyền sử dụng mô hình này hoặc kết nối bị chặn.";
      code = "BLOCKED_REQUEST";
    } else if (response.status === 413) {
      friendlyMessage = "Tài liệu quá lớn so với giới hạn xử lý cho phép của API.";
      code = "MALFORMED_REQUEST";
    } else if (response.status === 400) {
      friendlyMessage = `Yêu cầu không hợp lệ (Malformed Request): ${errorMsg}`;
      code = "MALFORMED_REQUEST";
    }
    
    const err = new Error(friendlyMessage);
    err.status = response.status;
    err.code = code;
    throw err;
  }

  const data = await response.json();

  if (data.candidates?.[0]?.finishReason === 'RECITATION') {
    const err = new Error('Không thể trích xuất văn bản do bộ lọc trích dẫn (Recitation Filter) của Google Gemini chặn tài liệu này.');
    err.finishReason = 'RECITATION';
    err.code = 'RECITATION';
    err.status = 400;
    throw err;
  }

  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (textResult === undefined || textResult === null) {

    const finishReason = data.candidates?.[0]?.finishReason;
    const blockReason = data.promptFeedback?.blockReason;
    const safetyRatings = data.candidates?.[0]?.safetyRatings;
    
    let detailedError = 'Google API không trả về kết quả văn bản.';
    let code = "NO_TEXT";
    
    if (finishReason) {
      detailedError += ` (FinishReason: ${finishReason})`;
      if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
        code = finishReason;
      }
    }
    if (blockReason) {
      detailedError += ` (BlockReason: ${blockReason})`;
      code = "BLOCKED_REQUEST";
    }
    if (safetyRatings) {
      const blockedRatings = safetyRatings.filter(r => r.probability && r.probability !== 'NEGLIGIBLE');
      if (blockedRatings.length > 0) {
        detailedError += ` (SafetyRatings: ${blockedRatings.map(r => `${r.category}:${r.probability}`).join(', ')})`;
      }
    }
    const err = new Error(detailedError);
    err.status = 400;
    err.code = code;
    throw err;
  }

  return textResult;
};
