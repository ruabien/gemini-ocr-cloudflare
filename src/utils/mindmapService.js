/**
 * Service to generate case mindmap data from OCR text according to Hướng dẫn 10/HD-VKSTC (2024)
 */

// Định nghĩa 7 loại sơ đồ theo Hướng dẫn 10
const DIAGRAM_TYPES = {
  tong_the: {
    name: 'Sơ đồ tổng thể vụ án',
    instruction: `Tập trung vào tổng quan toàn bộ vụ án. Sắp xếp sơ đồ để làm rõ:
- Bị can/bị cáo, tội danh khởi tố và điều luật áp dụng.
- Dòng diễn biến sự kiện chính.
- Hệ thống chứng cứ buộc tội cốt lõi và lập luận của các bên.
- Quyết định hoặc đề xuất xử lý và các vấn đề pháp lý cần lưu ý.`
  },
  dien_bien: {
    name: 'Sơ đồ diễn biến hành vi',
    instruction: `Tập trung sâu vào diễn tiến hành vi phạm tội theo trình tự thời gian. Sắp xếp để làm rõ:
- Chuỗi các sự kiện xảy ra từ khi chuẩn bị phạm tội, thực hiện phạm tội đến khi kết thúc và xóa dấu vết.
- Thời gian, địa điểm cụ thể của từng hành vi.
- Vai trò và hành động của từng bị can/bị cáo tại mỗi mốc thời gian.
- Sự tương thích giữa diễn biến lời khai và chứng cứ thực tế tại hiện trường.`
  },
  danh_gia_chung_cu: {
    name: 'Sơ đồ đánh giá chứng cứ',
    instruction: `Tập trung vào tính hợp pháp, tính xác thực và tính liên quan của hệ thống chứng cứ. Phân tích:
- Danh mục chứng cứ: lời khai bị can, biên bản khám nghiệm, kết luận giám định, vật chứng, lời khai nhân chứng.
- Đánh giá độ tin cậy của từng nguồn chứng cứ.
- Các mâu thuẫn giữa các chứng cứ với nhau và hướng giải quyết mâu thuẫn.`
  },
  bi_can_hanh_vi: {
    name: 'Sơ đồ bị can/bị cáo và hành vi',
    instruction: `Tập trung vào mối quan hệ cá nhân của từng bị can và hành vi phạm tội cụ thể của họ. Sắp xếp để làm rõ:
- Lý lịch, nhân thân và vai trò của từng bị can (chủ mưu, thực hành, giúp sức).
- Hành vi phạm tội tương ứng với tội danh của từng người.
- Tình tiết tăng nặng, giảm nhẹ trách nhiệm hình sự của từng cá nhân.`
  },
  buoc_toi_go_toi: {
    name: 'Sơ đồ buộc tội - gỡ tội',
    instruction: `Tạo thế đối chiếu song song giữa quan điểm của Viện kiểm sát và Bên bào chữa. Làm rõ:
- Cánh buộc tội: Chứng cứ buộc tội, các tình tiết định khung tăng nặng, lập luận cáo trạng.
- Cánh gỡ tội: Chứng cứ gỡ tội, các tình tiết giảm nhẹ, lý do bào chữa của bị cáo/luật sư, các điểm nghi ngờ chưa rõ.`
  },
  yeu_cau_dieu_tra: {
    name: 'Sơ đồ yêu cầu điều tra bổ sung',
    instruction: `Tập trung vào những thiếu sót của hồ sơ và các yêu cầu nghiệp vụ của Kiểm sát viên. Phác thảo:
- Những tình tiết quan trọng chưa được làm rõ hoặc mâu thuẫn.
- Các yêu cầu điều tra bổ sung cụ thể gửi Cơ quan điều tra (ví dụ: thực nghiệm hiện trường, giám định lại, đối chất).
- Căn cứ pháp lý để yêu cầu điều tra bổ sung.`
  },
  doi_chieu_chung_cu: {
    name: 'Bảng đối chiếu lời khai/chứng cứ',
    instruction: `Trực quan hóa đối chiếu lời khai của các bị can với nhau, bị can với bị hại, nhân chứng hoặc các chứng cứ vật chất. Chỉ rõ:
- Những lời khai trùng khớp.
- Những lời khai bất nhất, mâu thuẫn nghiêm trọng.
- Chứng cứ khách quan (dữ liệu camera, dấu vết vân tay, v.v.) dùng để kiểm chứng lời khai nào.`
  }
};

const MAIN_INSTRUCTION = `
Bạn là hệ thống phân tích hồ sơ tư pháp chuyên nghiệp, đóng vai trò là một Kiểm sát viên cao cấp dày dạn kinh nghiệm nghiệp vụ của Viện kiểm sát nhân dân tối cao Việt Nam.

Nhiệm vụ:
Phân tích văn bản OCR được cung cấp (từ tài liệu tố tụng, hồ sơ vụ án) và trích xuất thành dữ liệu cấu trúc sơ đồ tư duy phân tầng tuân thủ Hướng dẫn số 10/HD-VKSTC năm 2024.

Quy tắc bắt buộc về định dạng đầu ra:
- Phải trả về DUY NHẤT một chuỗi JSON hợp lệ.
- KHÔNG dùng markdown (KHÔNG được bao quanh bằng \`\`\`json hay \`\`\`).
- KHÔNG giải thích, không thêm text chào hỏi trước/sau JSON.
- Nếu thiếu dữ liệu hoặc thông tin không rõ ràng, sử dụng null hoặc [] cho các mảng.
- Đảm bảo trích xuất thông tin ngắn gọn, súc tích và đúng thuật ngữ pháp lý.

CẤU TRÚC SCHEMA JSON BẮT BUỘC:
{
  "caseTitle": "Tên vụ án chính thức (ví dụ: Vụ án Trộm cắp tài sản tại Công ty X)",
  "caseType": "Hình sự / Dân sự / Hành chính / Hôn nhân và gia đình",
  "centralKeyword": "Từ khóa trung tâm để vẽ sơ đồ",
  "diagramType": "tree",
  "nodes": [
    {
      "id": "Mã ID duy nhất (ví dụ: node_1, node_2, node_2_1...)",
      "parentId": "Mã ID của node cha (null nếu là nhánh cấp 1 / category chính)",
      "label": "Nhãn hiển thị ngắn gọn",
      "level": 1,
      "note": "Ghi chú giải thích thêm (nếu có)",
      "evidence": "Tài liệu chứng cứ liên kết (nếu có)",
      "color": "Mã màu HEX gợi ý (chỉ dành cho các node level 1, ví dụ: #163A70, #2F5FA7, #1E8E5A)"
    }
  ],
  "timeline": [
    {
      "time": "Mốc thời gian (ngày, tháng, giờ)",
      "event": "Chi tiết diễn biến chính",
      "evidence": "Bút lục hoặc tài liệu chứng cứ"
    }
  ],
  "issuesToClarify": [
    "Câu hỏi nghiệp vụ cần làm rõ"
  ]
}

QUY TẮC PHÂN LOẠI CỦA ÁN HÌNH SỰ (ƯU TIÊN TRONG DANH SÁCH NODES):
Trong mảng "nodes", các node Level 1 (parentId = null) phải ưu tiên các nhóm thông tin trọng tâm sau của Hướng dẫn 10:
1. Bị can/bị cáo (Họ tên, tuổi, nhân thân, vai trò)
2. Hành vi phạm tội (Mô tả hành động phạm tội cốt lõi)
3. Thời gian, địa điểm (Cụ thể xảy ra sự việc)
4. Công cụ/phương tiện (Hung khí, xe cộ, thiết bị sử dụng)
5. Hậu quả, thiệt hại (Vật chất, sức khỏe, tính mạng, xã hội)
6. Chứng cứ buộc tội (Lời khai nhận, nhân chứng, vật chứng, kết quả giám định)
7. Chứng cứ gỡ tội (Lời khai giảm nhẹ, chứng cứ ngoại phạm)
8. Tội danh, điều luật (Điều khoản áp dụng trong Bộ luật Hình sự)
9. Tình tiết tăng nặng/giảm nhẹ (Thành khẩn khai báo, tự nguyện bồi thường...)
10. Vấn đề cần điều tra bổ sung (Các tình tiết chưa rõ, cần xác minh)
`;

/**
 * Phân tích cú pháp JSON cực kỳ mạnh mẽ với nhiều giai đoạn fallback
 */
export const robustParseJson = (rawText) => {
  if (!rawText || !rawText.trim()) {
    throw new Error("EMPTY_RESPONSE");
  }

  const rawLength = rawText.length;
  console.log(`[Dev Log] Raw response length: ${rawLength}`);

  let cleaned = rawText.trim();

  // Giai đoạn 1: Parse JSON trực tiếp
  try {
    const res = JSON.parse(cleaned);
    console.log("[Dev Log] Parse Stage 1 (Direct JSON.parse): SUCCESS");
    return res;
  } catch (err) {
    console.log(`[Dev Log] Parse Stage 1 Failed: ${err.message}. Tiến hành dọn dẹp markdown...`);
  }

  // Giai đoạn 2: Loại bỏ markdown fenced code blocks (```json ... ```)
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      const temp = match[1].trim();
      try {
        const res = JSON.parse(temp);
        console.log("[Dev Log] Parse Stage 2 (Markdown block cleanup): SUCCESS");
        return res;
      } catch (err) {
        console.log(`[Dev Log] Parse Stage 2 Failed: ${err.message}. Tiến hành Regex block...`);
      }
    }
  }

  // Giai đoạn 3: Trích xuất khối JSON đầu tiên qua Regex {}
  const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
  if (jsonMatch && jsonMatch[1]) {
    const extracted = jsonMatch[1].trim();
    try {
      const res = JSON.parse(extracted);
      console.log("[Dev Log] Parse Stage 3 (Regex block extraction): SUCCESS");
      return res;
    } catch (err) {
      console.log(`[Dev Log] Parse Stage 3 Failed: ${err.message}. Thử nghiệm các thao tác sửa lỗi thủ công...`);

      // Giai đoạn 4: Sửa các lỗi JSON phổ biến (như dấu phẩy thừa ở cuối mảng/đối tượng)
      try {
        const repaired = extracted.replace(/,\s*([\]}])/g, '$1');
        const res = JSON.parse(repaired);
        console.log("[Dev Log] Parse Stage 4 (Manual repairs cleanup): SUCCESS");
        return res;
      } catch (repairErr) {
        console.log(`[Dev Log] Parse Stage 4 Failed: ${repairErr.message}`);
      }
    }
  }

  throw new Error("JSON_PARSING_FAILED");
};

/**
 * Chuẩn hóa schema, bổ sung các trường mặc định nếu thiếu hoặc sai định dạng
 */
export const normalizeSchema = (data) => {
  if (!data || typeof data !== 'object') {
    data = {};
  }

  const missingFields = [];
  if (!data.centralKeyword) missingFields.push("centralKeyword");
  if (!data.caseTitle) missingFields.push("caseTitle");
  if (!data.caseType) missingFields.push("caseType");
  if (!data.nodes) missingFields.push("nodes");
  if (!data.timeline) missingFields.push("timeline");
  if (!data.issuesToClarify) missingFields.push("issuesToClarify");

  if (missingFields.length > 0) {
    console.log(`[Dev Log] Thiếu một số trường trong schema: ${missingFields.join(", ")}. Đang tự động bổ sung default...`);
  }

  const normalized = {
    caseTitle: data.caseTitle || data.centralKeyword || "Sơ đồ tư duy vụ án",
    caseType: data.caseType || "Hình sự",
    centralKeyword: data.centralKeyword || data.caseTitle || "Sơ đồ tư duy vụ án",
    diagramType: data.diagramType || "tree",
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    timeline: Array.isArray(data.timeline) ? data.timeline : [],
    issuesToClarify: Array.isArray(data.issuesToClarify) ? data.issuesToClarify : []
  };

  // Chuẩn hóa từng node trong danh sách
  normalized.nodes = normalized.nodes.map((node, index) => {
    if (!node || typeof node !== 'object') {
      return {
        id: `node_${index}`,
        parentId: null,
        label: "Nội dung trống",
        level: 1,
        note: "",
        evidence: "",
        color: null
      };
    }

    let lvl = 1;
    if (typeof node.level === 'number') {
      lvl = node.level;
    } else if (node.parentId) {
      lvl = 2; // Dự đoán cấp 2 nếu có parentId
    }

    return {
      id: node.id || `node_${index}`,
      parentId: node.parentId === undefined ? null : node.parentId,
      label: node.label || "Nội dung trống",
      level: lvl,
      note: node.note || "",
      evidence: node.evidence || "",
      color: node.color || null
    };
  });

  // Nếu danh sách node hoàn toàn trống rỗng, sinh khung xương (skeleton) mặc định
  if (normalized.nodes.length === 0) {
    console.log("[Dev Log] Danh sách nodes rỗng. Tự động sinh khung xương sơ đồ mặc định.");
    normalized.nodes = [
      { id: "cat-bican", parentId: null, label: "Bị can / Bị cáo", level: 1, color: "#163A70" },
      { id: "cat-hanhvi", parentId: null, label: "Hành vi phạm tội", level: 1, color: "#2F5FA7" },
      { id: "cat-chungcu-buoc", parentId: null, label: "Chứng cứ buộc tội", level: 1, color: "#C62828" },
      { id: "cat-chungcu-go", parentId: null, label: "Chứng cứ gỡ tội / giảm nhẹ", level: 1, color: "#1E8E5A" },
      { id: "cat-yeucau", parentId: null, label: "Vấn đề cần làm rõ / Yêu cầu điều tra", level: 1, color: "#D97706" }
    ];
  }

  return normalized;
};

/**
 * Tái cấu trúc từ định dạng JSON phẳng (flat) sang định dạng lồng cấp (nested tree branches)
 */
export const reconstructBranchesFromFlat = (flatData) => {
  const nodes = flatData.nodes || [];
  const issuesToClarify = flatData.issuesToClarify || [];
  
  // Lấy các node cấp 1 (parentId rỗng hoặc 'root' hoặc level = 1)
  const l1Nodes = nodes.filter(n => !n.parentId || n.parentId === 'root' || n.level === 1);
  
  const branches = l1Nodes.map((l1, l1Idx) => {
    // Lấy con cấp 2
    const l2Nodes = nodes.filter(n => n.parentId === l1.id);
    const subBranches = l2Nodes.map(l2 => {
      // Lấy con cấp 3
      const l3Nodes = nodes.filter(n => n.parentId === l2.id);
      const subSubBranches = l3Nodes.map(l3 => ({
        label: l3.label || '',
        note: l3.note || '',
        evidence: l3.evidence || ''
      }));
      
      return {
        label: l2.label || '',
        note: l2.note || '',
        evidence: l2.evidence || '',
        subBranches: subSubBranches
      };
    });
    
    // Gắn câu hỏi nghiệp vụ vào danh mục đầu tiên nếu có
    let questions = [];
    if (l1Idx === 0 && issuesToClarify.length > 0) {
      questions = issuesToClarify;
    }
    
    return {
      label: l1.label || '',
      color: l1.color || '#163A70',
      note: l1.note || '',
      subBranches: subBranches,
      questions: questions
    };
  });

  // Tự động dựng nhánh diễn biến thời gian từ timeline nếu nhánh này chưa tồn tại trong nodes
  const hasTimelineBranch = l1Nodes.some(n => /thời gian|diễn biến|hành vi|tiến trình|sự việc/i.test(n.label || ''));
  if (!hasTimelineBranch && flatData.timeline && flatData.timeline.length > 0) {
    const timelineSubBranches = flatData.timeline.map(t => ({
      label: t.time || t.date || 'Mốc thời gian',
      note: t.event || '',
      evidence: t.evidence || '',
      subBranches: []
    }));
    branches.push({
      label: 'Diễn biến hành vi phạm tội',
      color: '#D97706',
      note: 'Dòng thời gian sự việc',
      subBranches: timelineSubBranches,
      questions: []
    });
  }

  // Tự động dựng nhánh câu hỏi nghiệp vụ từ issuesToClarify nếu chưa được gán
  const hasQuestionsBranch = l1Nodes.some(n => /yêu cầu|yêu cầu điều tra|cần làm rõ|vấn đề cần làm rõ/i.test(n.label || ''));
  if (!hasQuestionsBranch && issuesToClarify.length > 0 && !branches.some(b => b.questions && b.questions.length > 0)) {
    branches.push({
      label: 'Vấn đề cần làm rõ & Yêu cầu điều tra',
      color: '#C62828',
      note: 'Câu hỏi nghiệp vụ của Kiểm sát viên',
      subBranches: [],
      questions: issuesToClarify
    });
  }

  return {
    centralKeyword: flatData.centralKeyword || flatData.caseTitle || 'Sơ đồ tư duy vụ án',
    branches: branches
  };
};

/**
 * Gọi API Gemini để sinh sơ đồ tư duy vụ án theo Hướng dẫn 10 (Sửa đổi bền bỉ)
 */
export const generateCaseMindmap = async (ocrText, templateKey, apiKeysPool, modelName, diagramType = 'tong_the', diagramFormat = 'hình luồng') => {
  if (!apiKeysPool || apiKeysPool.length === 0) {
    const err = new Error("Chưa cấu hình Gemini API Key. Vui lòng vào Cấu hình API để thêm key trước khi tạo sơ đồ.");
    err.code = "CONFIG_MISSING";
    throw err;
  }
  if (!ocrText || !ocrText.trim()) {
    const err = new Error("Không có dữ liệu văn bản OCR để phân tích sơ đồ.");
    err.code = "NO_TEXT";
    throw err;
  }

  let normalizedModel = modelName || 'gemini-2.5-flash';
  if (normalizedModel === 'gemini-1.5-flash' || normalizedModel === 'gemini-1.5-flash-latest') {
    normalizedModel = 'gemini-2.5-flash';
  } else if (normalizedModel === 'gemini-1.5-pro' || normalizedModel === 'gemini-1.5-pro-latest') {
    normalizedModel = 'gemini-2.5-pro';
  }

  // Lấy chỉ dẫn cụ thể cho loại sơ đồ được chọn
  const typeConfig = DIAGRAM_TYPES[diagramType] || DIAGRAM_TYPES.tong_the;
  const systemText = `
Bạn đang xử lý yêu cầu lập: **${typeConfig.name}** dưới hình thức: **${diagramFormat}**.
Chỉ dẫn phân tích sơ đồ chuyên biệt:
${typeConfig.instruction}

Mẫu án nghiệp vụ chính: ${templateKey === 'dan_su' ? 'Dân sự' : templateKey === 'hanh_chinh' ? 'Hành chính' : templateKey === 'hon_nhan' ? 'Hôn nhân & Gia đình' : 'Hình sự (Quy chuẩn Hướng dẫn 10)'}.
  `;

  const fullPrompt = `${systemText}\n\n${MAIN_INSTRUCTION}\n\nVĂN BẢN OCR CẦN PHÂN TÍCH:\n${ocrText}`;

  let success = false;
  let keyIndex = 0;
  let lastError = null;
  let parsedData = null;

  while (!success && keyIndex < apiKeysPool.length) {
    const currentKey = apiKeysPool[keyIndex];
    const maskedKey = currentKey.length > 8 
      ? `${currentKey.substring(0, 6)}...${currentKey.substring(currentKey.length - 4)}` 
      : currentKey;

    let isRecitationRetry = false;
    let isFormatRetry = false;
    
    while (true) {
      try {
        console.log(`[Mindmap Gen] Thử dùng Key #${keyIndex + 1} (${maskedKey}) - Recitation Retry: ${isRecitationRetry}, Format Retry: ${isFormatRetry}`);
        
        let activePrompt = fullPrompt;
        if (isRecitationRetry) {
          activePrompt = `LƯU Ý: Diễn giải lại (paraphrase) mọi thông tin trích xuất, không chép nguyên văn từ hồ sơ gốc để tránh bộ lọc bản quyền.\n\n${fullPrompt}`;
        }
        
        if (isFormatRetry) {
          activePrompt = `CẢNH BÁO: Phản hồi trước của bạn bị sai format hoặc thiếu trường schema bắt buộc. Vui lòng CHỈ trả về chuỗi JSON chính xác khớp 100% schema mẫu. KHÔNG markdown, KHÔNG text giải thích trước sau.\n\n${fullPrompt}`;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${currentKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: activePrompt }]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: (isRecitationRetry || isFormatRetry) ? 0.7 : 0.1
            }
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
            friendlyMessage = "Gemini API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong Cấu hình API.";
            code = "INVALID_KEY";
          } else if (response.status === 429) {
            friendlyMessage = "Hạn mức API Key của bạn đã bị quá tải (Rate Limit / Quota Exceeded). Vui lòng đợi 1 phút hoặc đổi sang Key khác.";
            code = "QUOTA_EXCEEDED";
          } else if (response.status === 403) {
            friendlyMessage = "Truy cập bị từ chối. API Key không có quyền sử dụng mô hình này hoặc kết nối bị chặn.";
            code = "BLOCKED_REQUEST";
          } else if (response.status === 400) {
            friendlyMessage = `Yêu cầu không hợp lệ: ${errorMsg}`;
            code = "MALFORMED";
          }

          const err = new Error(friendlyMessage);
          err.code = code;
          err.status = response.status;
          throw err;
        }

        const data = await response.json();

        if (data.candidates?.[0]?.finishReason === 'RECITATION') {
          if (!isRecitationRetry) {
            console.warn(`[Mindmap Gen] Dính bộ lọc RECITATION của Google. Tiến hành thử lại với prompt diễn giải...`);
            isRecitationRetry = true;
            await new Promise(r => setTimeout(r, 1000));
            continue;
          } else {
            const err = new Error("Không thể trích xuất văn bản do bộ lọc trích dẫn (Recitation Filter) của Google chặn tài liệu này.");
            err.code = "RECITATION";
            throw err;
          }
        }

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) {
          const err = new Error("AI không phân tích được hồ sơ (Google API không trả về văn bản).");
          err.code = "NO_TEXT_RETURNED";
          throw err;
        }

        // Thực hiện parse và normalize bằng parser cực kỳ mạnh mẽ
        try {
          const parsed = robustParseJson(resultText);
          parsedData = normalizeSchema(parsed);
          success = true;
          break; // Thành công! Thoát vòng lặp thử lại nội bộ
        } catch (parseErr) {
          console.warn(`[Dev Log] Phân tích cú pháp thất bại tại Stage: ${parseErr.message}`);
          if (!isFormatRetry) {
            console.warn(`[Mindmap Gen] Thử lại định dạng (Retry format) 1 lần trên cùng key hiện tại...`);
            isFormatRetry = true;
            await new Promise(r => setTimeout(r, 1000));
            continue;
          } else {
            throw new Error("AI_FORMAT_REPEATED_FAILURE", { cause: parseErr });
          }
        }
      } catch (err) {
        lastError = err;
        break; // Thoát vòng lặp để chuyển sang Key khác
      }
    }

    if (!success) {
      keyIndex++;
    }
  }

  if (!success) {
    console.error("[Mindmap Gen] Lỗi chi tiết cuối cùng:", lastError);
    // Trả về thông báo lỗi thân thiện tuyệt đối theo yêu cầu
    const friendlyErr = new Error("AI chưa thể dựng sơ đồ từ hồ sơ này. Vui lòng thử lại hoặc dùng hồ sơ rõ ràng hơn.");
    friendlyErr.code = "AI_GENERATION_FAILED";
    friendlyErr.originalError = lastError;
    throw friendlyErr;
  }

  return parsedData;
};

/**
 * Thuật toán Layout Cây Tự do (Hỗ trợ xoay trục Ngang / Dọc)
 * Chuyển đổi dữ liệu JSON lồng 3 cấp thành Nodes và Edges của React Flow
 */
export const convertJsonToFlow = (jsonData, orientation = 'horizontal') => {
  if (!jsonData) return { nodes: [], edges: [] };

  // Tự động nhận diện và chuyển đổi cấu trúc phẳng sang lồng cấp nếu cần
  let data = jsonData;
  if (jsonData && Array.isArray(jsonData.nodes)) {
    data = reconstructBranchesFromFlat(jsonData);
  }

  // 1. Phác thảo cấu trúc cây lồng trong bộ nhớ
  const rootLabel = data.centralKeyword || 'Sơ đồ tư duy vụ án';
  
  const rawBranches = data.branches || [];
  
  // Dựng cây phân tầng đệ quy
  const buildTree = (rawBranch, branchIdx, parentAccentColor = null) => {
    const accentColor = rawBranch.color || parentAccentColor || '#163A70';
    
    const children = [];
    
    // Thêm các nhánh cấp 2 (Tầng 2)
    if (rawBranch.subBranches && rawBranch.subBranches.length > 0) {
      rawBranch.subBranches.forEach((sub2, idx2) => {
        const sub2Children = [];
        
        // Thêm các nhánh cấp 3 (Tầng 3)
        if (sub2.subBranches && sub2.subBranches.length > 0) {
          sub2.subBranches.forEach((sub3, idx3) => {
            sub2Children.push({
              id: `det-${branchIdx}-${idx2}-${idx3}`,
              label: sub3.label,
              type: 'detail',
              accentColor: accentColor,
              note: sub3.note || '',
              evidence: sub3.evidence || '',
              children: []
            });
          });
        }
        
        children.push({
          id: `sub-${branchIdx}-${idx2}`,
          label: sub2.label,
          type: 'subBranch',
          accentColor: accentColor,
          note: sub2.note || '',
          evidence: sub2.evidence || '',
          children: sub2Children
        });
      });
    }

    // Thêm node Câu hỏi cần làm rõ như một nhánh con phụ nếu có
    if (rawBranch.questions && rawBranch.questions.length > 0) {
      children.push({
        id: `q-${branchIdx}`,
        label: `❓ Câu hỏi cần làm rõ:\n` + rawBranch.questions.map(q => `• ${q}`).join('\n'),
        type: 'detail',
        accentColor: '#C62828', // Đỏ nổi bật cho câu hỏi
        note: '',
        evidence: '',
        children: []
      });
    }

    // Nếu không có bất kỳ con nào, tự động chèn node placeholder "Cần bổ sung"
    if (children.length === 0) {
      children.push({
        id: `det-${branchIdx}-placeholder`,
        label: '⚠️ Cần bổ sung dữ liệu',
        type: 'placeholder',
        accentColor: accentColor,
        isPlaceholder: true,
        children: []
      });
    }

    return {
      id: `cat-${branchIdx}`,
      label: rawBranch.label,
      type: 'category',
      accentColor: accentColor,
      note: rawBranch.note || '',
      children: children
    };
  };

  const tree = {
    id: 'root',
    label: rootLabel,
    type: 'caseRoot',
    accentColor: '#163A70',
    children: rawBranches.map((br, idx) => buildTree(br, idx))
  };

  // Nếu hoàn toàn không có nhánh cấp 1 nào, thêm placeholder cho toàn sơ đồ
  if (tree.children.length === 0) {
    tree.children.push({
      id: 'cat-placeholder',
      label: '⚠️ Sơ đồ trống',
      type: 'placeholder',
      accentColor: '#e11d48',
      isPlaceholder: true,
      children: []
    });
  }

  // 2. Tính toán độ rộng/cao vùng phân cấp đệ quy
  // Hướng ngang (horizontal): tính chiều cao (vertical size)
  // Hướng dọc (vertical): tính chiều rộng (horizontal size)
  const NODE_HEIGHT = 80;
  const NODE_WIDTH = 280;
  const GAP = 20;

  const LEAF_SIZE = orientation === 'horizontal' ? NODE_HEIGHT + 10 : NODE_WIDTH + 20;

  const computeSubtreeSize = (node) => {
    if (!node.children || node.children.length === 0) {
      node.subtreeSize = LEAF_SIZE;
      return LEAF_SIZE;
    }
    let total = 0;
    node.children.forEach(child => {
      total += computeSubtreeSize(child);
    });
    node.subtreeSize = Math.max(LEAF_SIZE, total + (node.children.length - 1) * GAP);
    return node.subtreeSize;
  };

  computeSubtreeSize(tree);

  // 3. Phân bổ tọa độ X và Y đệ quy dựa trên hướng xoay trục
  const nodes = [];
  const edges = [];
  
  const HORIZONTAL_SPACING = 340; // Khoảng cách cấp độ ngang
  const VERTICAL_SPACING = 180;   // Khoảng cách cấp độ dọc

  const assignPositions = (node, parentId, depth, offsetStart) => {
    const size = node.subtreeSize;
    const center = offsetStart + size / 2;

    let x, y;
    if (orientation === 'horizontal') {
      x = depth * HORIZONTAL_SPACING + 50;
      y = center - NODE_HEIGHT / 2;
    } else {
      x = center - NODE_WIDTH / 2;
      y = depth * VERTICAL_SPACING + 50;
    }

    nodes.push({
      id: node.id,
      type: 'customMindmapNode',
      data: {
        label: node.label,
        nodeType: node.type, // 'caseRoot', 'category', 'subBranch', 'detail', 'placeholder'
        accentColor: node.accentColor,
        note: node.note || '',
        evidence: node.evidence || '',
        orientation: orientation,
        isPlaceholder: !!node.isPlaceholder
      },
      position: { x, y }
    });

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: !!node.isPlaceholder,
        style: {
          stroke: node.isPlaceholder ? '#e11d48' : '#cbd5e1',
          strokeWidth: node.isPlaceholder ? 2 : 1.5,
        }
      });
    }

    if (node.children && node.children.length > 0) {
      let currentOffset = offsetStart;
      node.children.forEach(child => {
        assignPositions(child, node.id, depth + 1, currentOffset);
        currentOffset += child.subtreeSize + GAP;
      });
    }
  };

  assignPositions(tree, null, 0, 50);

  return { nodes, edges };
};
