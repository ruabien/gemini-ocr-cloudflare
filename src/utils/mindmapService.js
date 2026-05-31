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
Bạn là một Kiểm sát viên cao cấp dày dạn kinh nghiệm nghiệp vụ của Viện kiểm sát nhân dân tối cao Việt Nam.
Hãy phân tích văn bản hồ sơ vụ án được cung cấp (OCR từ các tài liệu tố tụng) và trích xuất thành dữ liệu cấu trúc sơ đồ tư duy phân tầng tuân thủ nghiêm ngặt Hướng dẫn số 10/HD-VKSTC năm 2024.

BẮT BUỘC sinh dữ liệu dạng JSON hợp lệ tuân thủ schema dưới đây. 
KHÔNG thêm bất kỳ văn bản giải thích, lời chào hỏi hay đánh dấu markdown nào bên ngoài JSON. Chỉ trả về một chuỗi JSON có thể phân tích bằng JSON.parse().

CẤU TRÚC JSON SCHEMA BẮT BUỘC:
{
  "centralKeyword": "Từ khóa trung tâm / Tên vụ án chính thức (ví dụ: Vụ án Trộm cắp tài sản tại Công ty X)",
  "branches": [
    {
      "label": "Tên nhánh cấp 1 (Tầng 1 - Danh mục thông tin chính)",
      "color": "Mã màu HEX gợi ý cho nhánh này (ví dụ: #1E8E5A, #2F5FA7, #D97706, #7C3AED, #DB2777, #475569)",
      "subBranches": [
        {
          "label": "Tên nhánh cấp 2 (Tầng 2 - Chi tiết phân loại hoặc sự kiện)",
          "note": "Ghi chú giải thích cho nhánh cấp 2 (nếu có, ví dụ: Nhân thân chưa có tiền án tiền sự)",
          "evidence": "Tài liệu chứng cứ liên quan đến nhánh cấp 2 này (ví dụ: Biên bản bắt quả tang BL 45)",
          "subBranches": [
            {
              "label": "Tên nhánh cấp 3 (Tầng 3 - Dữ liệu cụ thể, lời khai, chi tiết hành vi)",
              "note": "Ghi chú giải thích cho nhánh cấp 3 (nếu có)",
              "evidence": "Tài liệu chứng cứ liên quan đến nhánh cấp 3 này (nếu tìm thấy)"
            }
          ]
        }
      ],
      "questions": [
        "Câu hỏi nghiệp vụ cần làm rõ dưới nhánh danh mục này (nếu có)"
      ],
      "note": "Ghi chú chung cho danh mục cấp 1 này (nếu có)"
    }
  ]
}

QUY TẮC PHÂN LOẠI CỦA ÁN HÌNH SỰ (ƯU TIÊN):
Với án hình sự, cấu trúc nhánh cấp 1 phải ưu tiên các nhóm thông tin trọng tâm sau:
1. Bị can/bị cáo (Họ tên, tuổi, nhân thân, tư cách)
2. Hành vi phạm tội (Mô tả hành động phạm tội cốt lõi)
3. Thời gian, địa điểm (Cụ thể xảy ra sự việc)
4. Công cụ/phương tiện (Hung khí, xe cộ, thiết bị sử dụng)
5. Hậu quả, thiệt hại (Vật chất, sức khỏe, tính mạng, xã hội)
6. Chứng cứ buộc tội (Lời khai nhận, nhân chứng, kết quả giám định pháp y, tang vật)
7. Chứng cứ gỡ tội (Tự vệ, chứng cứ ngoại phạm, lời khai giảm nhẹ)
8. Tội danh, điều luật (Điều khoản áp dụng trong Bộ luật Hình sự)
9. Tình tiết tăng nặng/giảm nhẹ (Thành khẩn khai báo, tự nguyện bồi thường, tái phạm)
10. Vấn đề cần điều tra bổ sung (Các tình tiết chưa rõ, cần xác minh)

LƯU Ý:
- Tự động điều chỉnh cấu trúc nhánh theo Loại sơ đồ được yêu cầu ở trên để đáp ứng mục tiêu phân tích.
- Nếu thông tin thiếu hụt hoặc mờ trong văn bản OCR, hãy để trống hoặc mảng rỗng. KHÔNG tự bịa ra thông tin.
- Nội dung hiển thị phải ngắn gọn, súc tích và đúng thuật ngữ pháp lý tố tụng Việt Nam.
`;

/**
 * Gọi API Gemini để sinh sơ đồ tư duy vụ án theo Hướng dẫn 10
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
  let resultText = null;

  while (!success && keyIndex < apiKeysPool.length) {
    const currentKey = apiKeysPool[keyIndex];
    const maskedKey = currentKey.length > 8 
      ? `${currentKey.substring(0, 6)}...${currentKey.substring(currentKey.length - 4)}` 
      : currentKey;

    let isRetryAttempt = false;
    
    // Vòng lặp thử lại nội bộ khi dính bộ lọc RECITATION
    while (true) {
      try {
        console.log(`[Mindmap Gen] Thử dùng Key #${keyIndex + 1} (${maskedKey}) - Lần thử: ${isRetryAttempt ? 'Diễn giải tránh bộ lọc' : 'Mặc định'}`);
        
        let activePrompt = fullPrompt;
        if (isRetryAttempt) {
          activePrompt = `LƯU Ý: Diễn giải lại (paraphrase) mọi thông tin trích xuất, không chép nguyên văn từ hồ sơ gốc để tránh bộ lọc bản quyền.\n\n${fullPrompt}`;
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
            console.warn(`[Mindmap Gen] Dính bộ lọc RECITATION của Google. Tiến hành thử lại với prompt diễn giải...`);
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
        break; // Thoát vòng lặp thử lại nội bộ
      } catch (err) {
        lastError = err;
        break; // Thoát vòng lặp thử lại nội bộ để chuyển sang Key tiếp theo
      }
    }

    if (!success) {
      keyIndex++;
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
 * Thuật toán Layout Cây Tự do (Hỗ trợ xoay trục Ngang / Dọc)
 * Chuyển đổi dữ liệu JSON lồng 3 cấp thành Nodes và Edges của React Flow
 */
export const convertJsonToFlow = (jsonData, orientation = 'horizontal') => {
  if (!jsonData) return { nodes: [], edges: [] };

  // 1. Phác thảo cấu trúc cây lồng trong bộ nhớ
  const rootLabel = jsonData.centralKeyword || 'Sơ đồ tư duy vụ án';
  
  const rawBranches = jsonData.branches || [];
  
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
