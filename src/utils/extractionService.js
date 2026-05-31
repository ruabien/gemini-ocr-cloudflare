/**
 * Service trích xuất dữ liệu có cấu trúc từ văn bản OCR sử dụng Google Gemini API.
 */

/**
 * Gọi Gemini API để trích xuất dữ liệu có cấu trúc dưới dạng JSON
 * @param {string} ocrText - Văn bản OCR cần trích xuất
 * @param {object} template - Cấu hình mẫu chứa các trường (fields)
 * @param {object} config - Cấu hình API của ứng dụng (apiKey, model, v.v.)
 * @param {object} options - Các tùy chọn bổ sung (signal, v.v.)
 * @returns {Promise<object>} Dữ liệu JSON đã được trích xuất
 */
export const extractStructuredData = async (ocrText, template, config, options = {}) => {
  const apiKey = config?.apiKey || localStorage.getItem('ocr_api_key') || '';
  if (!apiKey) {
    throw new Error("Vui lòng nhập API Key trong phần Cấu hình API trước khi trích xuất.");
  }

  let modelName = config?.model || 'gemini-2.5-flash';
  // Chuẩn hóa tên model tương tự ocrService
  if (modelName === 'gemini-1.5-flash' || modelName === 'gemini-1.5-flash-latest') {
    modelName = 'gemini-2.5-flash';
  } else if (modelName === 'gemini-1.5-pro' || modelName === 'gemini-1.5-pro-latest') {
    modelName = 'gemini-2.5-pro';
  }

  if (!ocrText || !ocrText.trim()) {
    throw new Error("Không có nội dung văn bản OCR để trích xuất.");
  }

  // Xây dựng mô tả chi tiết các trường để gửi cho AI
  const fieldsPrompt = template.fields
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(f => {
      const typeStr = f.dataType || 'text';
      const reqStr = f.required ? 'Bắt buộc' : 'Không bắt buộc';
      const descStr = f.description ? `. Mô tả: ${f.description}` : '';
      const exStr = f.example ? `. Ví dụ giá trị mong muốn: ${f.example}` : '';
      return `- \`${f.id}\` (Kiểu dữ liệu: ${typeStr}, Yêu cầu: ${reqStr})${descStr}${exStr}`;
    })
    .join('\n');

  const systemText = `Bạn là một trợ lý AI chuyên nghiệp phục vụ cho các cơ quan tư pháp (tòa án, viện kiểm sát, cơ quan điều tra, thi hành án). Nhiệm vụ duy nhất của bạn là trích xuất thông tin nghiệp vụ có cấu trúc từ văn bản pháp lý/tố tụng được cung cấp dưới dạng văn bản OCR.

Cấu trúc JSON cần trích xuất gồm các trường sau:
${fieldsPrompt}

QUY TẮC QUAN TRỌNG BẮT BUỘC TUÂN THỦ:
1. Chỉ trích xuất thông tin CÓ TRONG văn bản OCR được cung cấp. KHÔNG ĐƯỢC tự ý bịa đặt (hallucinate), suy diễn hoặc thêm bớt các thông tin không có trong văn bản gốc.
2. Nếu một trường thông tin KHÔNG tìm thấy hoặc không có trong văn bản, bắt buộc trả về giá trị null hoặc chuỗi rỗng "" cho trường đó.
3. Giữ nguyên họ tên (viết hoa, dấu), số hiệu văn bản tố tụng, số bản án/quyết định, địa chỉ y như trong văn bản.
4. Với trường tiền tệ (currency), giữ nguyên cả số lượng và đơn vị tiền (ví dụ: "150.000.000 đồng" hoặc "50 triệu đồng").
5. Với trường ngày tháng (date), giữ định dạng gốc có trong văn bản (ví dụ: "28/8/2024" hoặc "ngày 28 tháng 8 năm 2024").
6. Trả về kết quả CHỈ là một JSON Object hợp lệ duy nhất chứa các key tương ứng với id các trường: ${template.fields.map(f => `"${f.id}"`).join(', ')}.
7. Không thêm bất kỳ lời dẫn, giải thích hay markdown code block nào.`;

  const promptText = `Hãy trích xuất thông tin từ văn bản OCR sau và trả về định dạng JSON object duy nhất.

VĂN BẢN OCR:
"""
${ocrText}
"""`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            { text: systemText }
          ]
        },
        generationConfig: {
          candidateCount: 1,
          temperature: 0.0,
          responseMimeType: "application/json"
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
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
      throw new Error(`Lỗi từ Gemini API: ${errorMsg}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Gemini API không trả về kết quả hoặc bị chặn do chính sách nội dung.");
    }

    // Parse JSON an toàn
    return parseStructuredResponse(textResponse);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error("Lỗi trích xuất thông tin nghiệp vụ:", error);
    throw new Error(`Quá trình trích xuất thất bại: ${error.message}`, { cause: error });
  }
};

/**
 * Hỗ trợ tách block JSON trong chuỗi phản hồi và parse sang object
 * @param {string} rawText 
 * @returns {object}
 */
const parseStructuredResponse = (rawText) => {
  let cleaned = rawText.trim();
  
  // Hỗ trợ trường hợp AI bọc JSON trong markdown code block (```json ... ```) dù đã set responseMimeType
  if (cleaned.startsWith("```")) {
    const jsonMatch = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      cleaned = jsonMatch[1].trim();
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.warn("Lần parse JSON đầu tiên thất bại, thử trích xuất bằng RegExp...", parseError);
    // Cố gắng tìm phần ngoặc nhọn đầu tiên và cuối cùng
    const braceMatch = cleaned.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0]);
      } catch (e) {
        throw new Error("Không thể phân tích cú pháp dữ liệu JSON từ phản hồi của AI. Vui lòng thử lại.", { cause: e });
      }
    }
    throw new Error("Phản hồi của AI không chứa dữ liệu dạng JSON hợp lệ.", { cause: parseError });
  }
};
