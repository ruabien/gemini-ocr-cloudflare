/**
 * Service to generate case mindmap data from OCR text using Google Gemini
 */

// Prompt templates for different case types
const PROMPTS = {
  hinh_su: `Bạn là một chuyên gia pháp lý và Kiểm sát viên cao cấp của Việt Nam. 
Hãy phân tích văn bản hồ sơ vụ án Hình sự (OCR từ tài liệu tố tụng như Cáo trạng, Bản án, Quyết định khởi tố...) dưới đây và trích xuất thông tin thành cấu trúc sơ đồ tư duy.

Hãy tập trung làm rõ:
- Tên vụ án hình sự và các tội danh khởi tố/xét xử.
- Thông tin chi tiết về các bị cáo (Họ tên, nhân thân, vai trò chủ mưu/đồng phạm) và bị hại/người liên quan.
- Dòng thời gian chi tiết của hành vi phạm tội và diễn tiến tố tụng.
- Quan điểm truy tố của Viện kiểm sát và lập luận bào chữa của bị cáo/luật sư.
- Các vấn đề pháp lý mấu chốt tranh chấp (Ví dụ: Định tội danh, xác định trị giá tài sản, độ tuổi chịu trách nhiệm hình sự, phòng vệ chính đáng, lỗi cố ý/vô ý...).
- Danh mục chứng cứ quan trọng (Kết luận giám định, Biên bản khám nghiệm, Lời khai bị cáo, Vật chứng thu giữ...) và giá trị chứng minh của chúng.
- Quyết định hoặc mức hình phạt tuyên/đề xuất và các căn cứ pháp lý áp dụng.`,

  dan_su: `Bạn là một chuyên gia pháp lý và Thẩm phán chuyên nghiệp về án Dân sự tại Việt Nam.
Hãy phân tích văn bản hồ sơ vụ án Dân sự (OCR từ tài liệu như Đơn khởi tố, Bản án, Biên bản hòa giải...) dưới đây và trích xuất thông tin thành cấu trúc sơ đồ tư duy.

Hãy tập trung làm rõ:
- Tên vụ án dân sự (Ví dụ: Tranh chấp hợp đồng đặt cọc, Tranh chấp quyền sử dụng đất...).
- Đương sự tham gia: Nguyên đơn, Bị đơn, Người có quyền lợi nghĩa vụ liên quan (Họ tên, tư cách tố tụng).
- Dòng thời gian giao dịch dân sự, phát sinh tranh chấp và quá trình thụ lý.
- Yêu cầu khởi kiện của Nguyên đơn và Ý kiến phản đối/Yêu cầu phản tố của Bị đơn.
- Các vấn đề pháp lý mấu chốt tranh chấp (Ví dụ: Hiệu lực hợp đồng, thời hiệu khởi kiện, xác định lỗi gây thiệt hại, nguồn gốc đất...).
- Các chứng cứ tài liệu các bên giao nộp (Hợp đồng, Biên lai nhận tiền, Giấy chứng nhận quyền sử dụng đất, Kết quả định giá...) và giá trị chứng minh.
- Quyết định phán quyết của Tòa án hoặc phương án giải quyết đề xuất và căn cứ pháp lý áp dụng.`,

  hanh_chinh: `Bạn là một chuyên gia pháp lý và Thẩm phán chuyên nghiệp về án Hành chính tại Việt Nam.
Hãy phân tích văn bản hồ sơ vụ án Hành chính (OCR từ tài liệu như Đơn khởi kiện hành chính, Bản án sơ thẩm, Quyết định hành chính bị kiện...) dưới đây và trích xuất thông tin thành cấu trúc sơ đồ tư duy.

Hãy tập trung làm rõ:
- Tên vụ án hành chính (Ví dụ: Khiếu kiện quyết định thu hồi đất, Khiếu kiện quyết định xử phạt vi phạm hành chính...).
- Đương sự tham gia: Người khởi kiện (Cá nhân/Tổ chức), Người bị kiện (Cơ quan hành chính/Người có thẩm quyền), Người liên quan.
- Dòng thời gian ban hành quyết định hành chính, thực hiện hành vi hành chính và tiến trình khởi kiện.
- Yêu cầu khởi kiện (Yêu cầu hủy quyết định hành chính, đòi bồi thường thiệt hại...) và ý kiến giải trình của Người bị kiện.
- Các vấn đề pháp lý mấu chốt tranh chấp (Ví dụ: Thẩm quyền ban hành, trình tự thủ tục ban hành, tính hợp pháp về mặt nội dung của quyết định...).
- Chứng cứ tài liệu (Hồ sơ thanh tra, Biên bản vi phạm, Quy hoạch sử dụng đất...) và giá trị chứng minh.
- Quyết định phán quyết của Tòa án (Hủy bỏ quyết định hành chính, bác đơn, v.v.) và căn cứ pháp lý áp dụng.`,

  hon_nhan: `Bạn là một chuyên gia pháp lý chuyên sâu về Luật Hôn nhân & Gia đình tại Việt Nam.
Hãy phân tích văn bản hồ sơ vụ án Hôn nhân và Gia đình (OCR từ tài liệu như Đơn ly hôn, Bản án, Biên bản hòa giải...) dưới đây và trích xuất thông tin thành cấu trúc sơ đồ tư duy.

Hãy tập trung làm rõ:
- Tên vụ án Hôn nhân và Gia đình (Ví dụ: Tranh chấp ly hôn, chia tài sản và quyền nuôi con...).
- Đương sự tham gia: Vợ, Chồng, Người có quyền lợi liên quan (ví dụ: người nhận ủy quyền, chủ nợ chung).
- Dòng thời gian quan hệ hôn nhân (Đăng ký kết hôn, bắt đầu ly thân, mâu thuẫn đỉnh điểm).
- Yêu cầu, quan điểm của Vợ và Chồng về 3 trụ cột: Quan hệ hôn nhân (Đồng ý hay không đồng ý ly hôn), Con chung & cấp dưỡng, Tài sản chung & Nợ chung.
- Các vấn đề pháp lý mấu chốt (Ví dụ: Xác định tài sản chung hay tài sản riêng, quyền nuôi con dưới 36 tháng tuổi, nguyện vọng con trên 7 tuổi...).
- Chứng cứ tài liệu giao nộp (Đăng ký kết hôn, Giấy khai sinh của con, Giấy chứng nhận quyền sở hữu nhà đất, Giấy nợ...) và giá trị chứng minh.
- Quyết định phán quyết của Tòa án (Chấp nhận ly hôn, giao con cho ai, chia tài sản ra sao...) và căn cứ pháp lý áp dụng.`
};

const MAIN_INSTRUCTION = `
Hãy phân tích văn bản hồ sơ vụ án được cung cấp và xuất ra kết quả duy nhất dưới dạng JSON hợp lệ tuân thủ nghiêm ngặt Schema dưới đây.
KHÔNG thêm bất kỳ văn bản giải thích, lời chào hỏi hay đánh dấu markdown nào bên ngoài JSON. Chỉ trả về một chuỗi JSON có thể phân tích bằng JSON.parse().

CẤU TRÚC JSON SCHEMA BẮT BUỘC:
{
  "caseTitle": "Tên vụ án / Tiêu đề chính xác (ví dụ: Vụ án Nguyễn Văn A trộm cắp tài sản)",
  "caseType": "Hình sự / Dân sự / Hành chính / Hôn nhân và gia đình",
  "parties": [
    {
      "name": "Tên đương sự / cá nhân / tổ chức",
      "role": "Vai trò tố tụng (Bị cáo, Bị hại, Nguyên đơn, Bị đơn, Người có quyền lợi nghĩa vụ liên quan, Vợ, Chồng, v.v.)",
      "detail": "Tóm tắt thông tin nhân thân hoặc đặc điểm quan trọng (nếu có)"
    }
  ],
  "timeline": [
    {
      "date": "Ngày/Tháng/Năm hoặc mốc thời gian cụ thể của sự kiện",
      "event": "Mô tả ngắn gọn sự kiện xảy ra"
    }
  ],
  "claims": [
    {
      "party": "Đương sự hoặc Cơ quan đề xuất (Viện kiểm sát, Nguyên đơn, Bị đơn, Vợ, Chồng, v.v.)",
      "content": "Nội dung yêu cầu, cáo cáo trạng hoặc quan điểm tóm tắt"
    }
  ],
  "legalIssues": [
    {
      "issue": "Tóm tắt ngắn gọn vấn đề pháp lý mấu chốt cần giải quyết",
      "description": "Chi tiết lập luận pháp lý hoặc điểm mâu thuẫn cần làm rõ"
    }
  ],
  "evidence": [
    {
      "name": "Tên tài liệu chứng cứ, vật chứng hoặc tài liệu xác minh",
      "source": "Cơ quan hoặc đương sự thu thập/cung cấp (nếu có)",
      "value": "Giá trị chứng minh (ví dụ: Chứng minh tội phạm, Chứng minh quyền sở hữu riêng, Chứng minh năng lực nuôi con, v.v.)"
    }
  ],
  "decision": [
    {
      "point": "Quyết định tuyên án hoặc đề xuất hướng giải quyết cụ thể",
      "basis": "Căn cứ pháp lý áp dụng (ví dụ: Khoản 1 Điều 173 Bộ luật Hình sự)"
    }
  ]
}

LƯU Ý QUAN TRỌNG:
- Nếu một mục nào đó không tìm thấy thông tin hoặc thông tin quá mờ/thiếu hụt trong văn bản OCR, hãy để mảng rỗng [] hoặc giá trị chuỗi rỗng "" cho mục đó. KHÔNG tự chế tác thông tin giả mạo.
- Output phải là JSON hoàn toàn bằng tiếng Việt chính quy, ngắn gọn, súc tích và chính xác về mặt pháp lý.
`;

/**
 * Gọi API Gemini để sinh sơ đồ tư duy vụ án từ văn bản OCR với cơ chế quay vòng khóa (Key Rotation)
 * và tự động thử lại khi dính bộ lọc Recitation.
 */
export const generateCaseMindmap = async (ocrText, templateKey, apiKeysPool, modelName) => {
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

  const basePrompt = PROMPTS[templateKey] || PROMPTS.hinh_su;
  
  let success = false;
  let keyIndex = 0;
  let lastError = null;
  let resultText = null;

  while (!success && keyIndex < apiKeysPool.length) {
    const currentKey = apiKeysPool[keyIndex];
    const maskedKey = currentKey.length > 8 
      ? `${currentKey.substring(0, 6)}...${currentKey.substring(currentKey.length - 4)}` 
      : currentKey;

    let isRetryAttempt = false;
    
    // Vòng lặp thử lại nội bộ của Key hiện tại (ví dụ khi dính RECITATION)
    while (true) {
      try {
        console.log(`[Mindmap Gen] Thử dùng Key #${keyIndex + 1} (${maskedKey}) - Lần thử: ${isRetryAttempt ? 'Diễn giải lại' : 'Mặc định'}`);
        
        let activePrompt = basePrompt;
        if (isRetryAttempt) {
          activePrompt = basePrompt + "\nLƯU Ý QUAN TRỌNG: Vui lòng tự diễn đạt lại (paraphrase) mọi thông tin trích xuất, tuyệt đối không chép nguyên văn các đoạn văn dài để tránh kích hoạt bộ lọc bản quyền (copyright/recitation filter) của hệ thống.";
        }

        const fullPrompt = `${activePrompt}\n\n${MAIN_INSTRUCTION}\n\nVĂN BẢN OCR CẦN PHÂN TÍCH:\n${ocrText}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${currentKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: isRetryAttempt ? 0.7 : 0.1
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
          if (!isRetryAttempt) {
            console.warn(`[Mindmap Gen] Phát hiện bộ lọc RECITATION của Google trên Key #${keyIndex + 1}. Đang thử lại với prompt diễn giải...`);
            isRetryAttempt = true;
            await new Promise(r => setTimeout(r, 1000));
            continue; // Thử lại với cấu hình diễn giải
          } else {
            const err = new Error("Không thể trích xuất văn bản do bộ lọc trích dẫn (Recitation Filter) của Google chặn tài liệu này.");
            err.code = "RECITATION";
            throw err;
          }
        }

        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) {
          const err = new Error("AI không phân tích được hồ sơ (Google API không trả về văn bản).");
          err.code = "NO_TEXT_RETURNED";
          throw err;
        }

        success = true;
        break; // Kết thúc vòng lặp thử lại nội bộ
      } catch (err) {
        lastError = err;
        // Nếu dính lỗi mạng hoặc lỗi API cấu hình/quota, chuyển sang Key khác ngay lập tức
        break; // Thoát vòng lặp thử lại nội bộ của Key này
      }
    }

    if (!success) {
      keyIndex++; // Đổi sang khóa dự phòng tiếp theo
    }
  }

  if (!success) {
    throw lastError || new Error("Đã thử tất cả các API Key nhưng đều thất bại.");
  }

  // Làm sạch và phân tích chuỗi JSON trả về
  try {
    let cleanedJsonText = resultText.trim();
    if (cleanedJsonText.startsWith("```json")) {
      cleanedJsonText = cleanedJsonText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanedJsonText.startsWith("```")) {
      cleanedJsonText = cleanedJsonText.replace(/^```/, "").replace(/```$/, "").trim();
    }
    return JSON.parse(cleanedJsonText);
  } catch (parseErr) {
    console.error("Lỗi phân tích cú pháp JSON AI:", parseErr);
    const err = new Error("AI không phân tích được hồ sơ (Phản hồi từ Gemini không đúng định dạng sơ đồ vụ án).");
    err.code = "JSON_PARSE_ERROR";
    throw err;
  }
};

/**
 * Thuật toán Layout Cây Ngang tự động (Horizontal Tree Layout)
 * Chuyển đổi dữ liệu JSON vụ án thành danh sách Nodes và Edges của React Flow
 */
export const convertJsonToFlow = (jsonData) => {
  if (!jsonData) return { nodes: [], edges: [] };

  // 1. Xây dựng cấu trúc cây chuẩn trong bộ nhớ
  const tree = {
    id: 'root',
    label: jsonData.caseTitle || 'Chưa xác định tên vụ án',
    type: 'caseRoot',
    children: [
      {
        id: 'cat-caseType',
        label: 'Phân loại vụ án',
        type: 'category',
        categoryType: 'caseType',
        children: jsonData.caseType ? [{ id: 'det-caseType-1', label: jsonData.caseType, type: 'detail', categoryType: 'caseType' }] : []
      },
      {
        id: 'cat-parties',
        label: 'Đương sự / Thành phần tham gia',
        type: 'category',
        categoryType: 'parties',
        children: (jsonData.parties && jsonData.parties.length > 0)
          ? jsonData.parties.map((p, idx) => ({
              id: `det-parties-${idx}`,
              label: `${p.role ? `${p.role}: ` : ''}${p.name || ''}${p.detail ? ` (${p.detail})` : ''}`,
              type: 'detail',
              categoryType: 'parties'
            }))
          : []
      },
      {
        id: 'cat-timeline',
        label: 'Dòng thời gian sự việc',
        type: 'category',
        categoryType: 'timeline',
        children: (jsonData.timeline && jsonData.timeline.length > 0)
          ? jsonData.timeline.map((t, idx) => ({
              id: `det-timeline-${idx}`,
              label: `${t.date ? `[${t.date}]: ` : ''}${t.event || ''}`,
              type: 'detail',
              categoryType: 'timeline'
            }))
          : []
      },
      {
        id: 'cat-claims',
        label: 'Yêu cầu / Quan điểm các bên',
        type: 'category',
        categoryType: 'claims',
        children: (jsonData.claims && jsonData.claims.length > 0)
          ? jsonData.claims.map((c, idx) => ({
              id: `det-claims-${idx}`,
              label: `${c.party ? `[${c.party}]: ` : ''}${c.content || ''}`,
              type: 'detail',
              categoryType: 'claims'
            }))
          : []
      },
      {
        id: 'cat-legalIssues',
        label: 'Vấn đề pháp lý mấu chốt',
        type: 'category',
        categoryType: 'legalIssues',
        children: (jsonData.legalIssues && jsonData.legalIssues.length > 0)
          ? jsonData.legalIssues.map((i, idx) => ({
              id: `det-legalIssues-${idx}`,
              label: `${i.issue || ''}${i.description ? ` (${i.description})` : ''}`,
              type: 'detail',
              categoryType: 'legalIssues'
            }))
          : []
      },
      {
        id: 'cat-evidence',
        label: 'Chứng cứ / Tài liệu quan trọng',
        type: 'category',
        categoryType: 'evidence',
        children: (jsonData.evidence && jsonData.evidence.length > 0)
          ? jsonData.evidence.map((e, idx) => ({
              id: `det-evidence-${idx}`,
              label: `${e.name || ''}${e.source ? ` (Nguồn: ${e.source})` : ''}${e.value ? ` - ${e.value}` : ''}`,
              type: 'detail',
              categoryType: 'evidence'
            }))
          : []
      },
      {
        id: 'cat-decision',
        label: 'Đề xuất / Quyết định phán quyết',
        type: 'category',
        categoryType: 'decision',
        children: (jsonData.decision && jsonData.decision.length > 0)
          ? jsonData.decision.map((d, idx) => ({
              id: `det-decision-${idx}`,
              label: `${d.point || ''}${d.basis ? ` [Cơ sở: ${d.basis}]` : ''}`,
              type: 'detail',
              categoryType: 'decision'
            }))
          : []
      }
    ]
  };

  // Áp dụng quy tắc "Cần bổ sung" khi danh mục bị rỗng
  tree.children.forEach(cat => {
    if (cat.children.length === 0) {
      cat.children.push({
        id: `det-${cat.categoryType}-placeholder`,
        label: '⚠️ Cần bổ sung dữ liệu',
        type: 'placeholder',
        categoryType: cat.categoryType
      });
    }
  });

  // 2. Tính toán độ cao cây con (Subtree Height) đệ quy để phục vụ thuật toán layout
  const NODE_HEIGHT = 80; // Chiều cao cơ bản của một node
  const VERTICAL_GAP = 20; // Khoảng cách dọc giữa các node anh em

  const computeSubtreeHeight = (node) => {
    if (!node.children || node.children.length === 0) {
      node.subtreeHeight = NODE_HEIGHT;
      return NODE_HEIGHT;
    }
    let childrenHeightSum = 0;
    node.children.forEach(child => {
      childrenHeightSum += computeSubtreeHeight(child);
    });
    node.subtreeHeight = Math.max(NODE_HEIGHT, childrenHeightSum + (node.children.length - 1) * VERTICAL_GAP);
    return node.subtreeHeight;
  };

  computeSubtreeHeight(tree);

  // 3. Phân bổ tọa độ X và Y đệ quy (Root bên trái, phát triển sang phải)
  const nodes = [];
  const edges = [];
  const HORIZONTAL_SPACING = 340; // Khoảng cách ngang giữa các cấp bậc

  // Mảng định nghĩa màu sắc chủ đạo cho từng Category
  const categoryColors = {
    caseType: '#2f5fa7',     // Xanh lam
    parties: '#1e8e5a',      // Xanh lục
    timeline: '#d97706',     // Amber / Cam
    claims: '#7c3aed',       // Tím
    legalIssues: '#db2777',  // Hồng đậm
    evidence: '#475569',     // Slate xám
    decision: '#059669'      // Xanh ngọc lục bảo
  };

  const assignPositions = (node, parentId, x, yStart) => {
    const yCenter = yStart + node.subtreeHeight / 2;

    // Chọn màu viền hoặc màu nền đặc trưng
    const catType = node.categoryType || 'default';
    const accentColor = categoryColors[catType] || '#163A70';

    nodes.push({
      id: node.id,
      type: 'customMindmapNode',
      data: {
        label: node.label,
        nodeType: node.type, // 'caseRoot', 'category', 'detail', 'placeholder'
        categoryType: catType,
        accentColor: accentColor,
        isPlaceholder: node.type === 'placeholder'
      },
      // Căn giữa node dựa trên chiều cao thực tế
      position: { x, y: yCenter - NODE_HEIGHT / 2 },
    });

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: node.type === 'placeholder',
        style: {
          stroke: node.type === 'placeholder' ? '#e11d48' : '#cbd5e1',
          strokeWidth: node.type === 'placeholder' ? 2 : 1.5,
        }
      });
    }

    if (node.children && node.children.length > 0) {
      let currentY = yStart;
      node.children.forEach(child => {
        assignPositions(child, node.id, x + HORIZONTAL_SPACING, currentY);
        currentY += child.subtreeHeight + VERTICAL_GAP;
      });
    }
  };

  // Bắt đầu từ tọa độ X=50, Y=50
  assignPositions(tree, null, 50, 50);

  return { nodes, edges };
};
