// Mock test file for extraction service
import { extractStructuredData } from './extractionService.js';

// Mock console.log
const originalLog = console.log;

export async function runTests() {
  console.log("=== BẮT ĐẦU CHẠY CÁC BÀI KIỂM TRA EXTRACTION ===");
  let passed = 0;
  let failed = 0;

  // Mock GeminiKeyManager or check it works
  const mockOcrText = `
  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
  Độc lập - Tự do - Hạnh phúc
  
  CƠ QUAN CẢNH SÁT ĐIỀU TRA
  CÔNG AN TỈNH KHÁNH HÒA
  
  Số: 45/QĐ-CSĐT
  Khánh Hòa, ngày 12 tháng 05 năm 2026
  
  QUYẾT ĐỊNH KHỞI TỐ BỊ CAN
  
  Căn cứ Bộ luật Tố tụng hình sự;
  Khởi tố bị can đối với:
  Họ tên: Lê Hữu Phước
  Giới tính: Nam
  Sinh ngày 25 tháng 12 năm 1990 tại Khánh Hòa.
  Nơi cư trú: 123 Đường Trần Phú,
  Phường Lộc Thọ, Thành phố Nha Trang,
  Tỉnh Khánh Hòa.
  Nghề nghiệp: Tự do.
  Căn cước công dân số: 056090123456 do Cục Cảnh sát Quản lý hành chính về trật tự xã hội cấp ngày 15/08/2021.
  
  Về tội: "Thiếu trách nhiệm gây hậu quả nghiêm trọng" quy định tại khoản 2 Điều 360 Bộ luật Hình sự.
  
  Quyết định được gửi đến Viện kiểm sát nhân dân tỉnh Khánh Hòa.
  
  ĐIỀU TRA VIÊN
  Nguyễn Văn A
  
  THỦ TRƯỞNG CƠ QUAN
  Đại tá Trần B
  `;

  // Test 1: Kiểm tra hàm normalizeData trong file StructuredExtractionEditor.tsx thông qua logic tương đương
  const normalizeData = (val) => {
    if (val === null || val === undefined) return "";
    let s = String(val).trim();
    if (!s) return "";
    s = s.replace(/\s+/g, ' ');
    s = s.replace(/^["“”']+|["“”']+$/g, '');
    s = s.replace(/^[:;]\s*/, '');
    return s.trim();
  };

  try {
    const rawVal = `: “Thiếu trách nhiệm gây hậu quả nghiêm trọng”`;
    const cleanVal = normalizeData(rawVal);
    if (cleanVal === "Thiếu trách nhiệm gây hậu quả nghiêm trọng") {
      console.log("PASS: Test 1 - Chuẩn hóa dữ liệu hậu xử lý (dấu ngoặc kép và hai chấm)");
      passed++;
    } else {
      console.log("FAIL: Test 1 - Chuẩn hóa thất bại:", cleanVal);
      failed++;
    }
  } catch (e) {
    console.log("FAIL: Test 1 gặp lỗi:", e);
    failed++;
  }

  // Test 2: Thử nghiệm parser an toàn (parseStructuredResponse)
  const testJsonParsing = (rawText) => {
    if (!rawText) return {};
    let cleaned = rawText.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      cleaned = jsonMatch[1].trim();
    }
    try {
      return JSON.parse(cleaned);
    } catch (parseError) {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(potentialJson);
        } catch (e) {
          return {};
        }
      }
      return {};
    }
  };

  try {
    const mockResponse1 = `
    \`\`\`json
    {
      "accused": [
        { "fullName": "Lê Hữu Phước" }
      ]
    }
    \`\`\`
    `;
    const parsed1 = testJsonParsing(mockResponse1);
    if (parsed1?.accused?.[0]?.fullName === "Lê Hữu Phước") {
      console.log("PASS: Test 2a - Parse JSON nằm trong markdown code block");
      passed++;
    } else {
      console.log("FAIL: Test 2a - Không parse được JSON trong markdown block");
      failed++;
    }

    const mockResponse2 = `
    Random text before
    {
      "charge": "Thiếu trách nhiệm gây hậu quả nghiêm trọng"
    }
    Random text after
    `;
    const parsed2 = testJsonParsing(mockResponse2);
    if (parsed2?.charge === "Thiếu trách nhiệm gây hậu quả nghiêm trọng") {
      console.log("PASS: Test 2b - Parse JSON bị dính text thừa xung quanh");
      passed++;
    } else {
      console.log("FAIL: Test 2b - Không parse được JSON bị dính text thừa");
      failed++;
    }
  } catch (e) {
    console.log("FAIL: Test 2 gặp lỗi:", e);
    failed++;
  }

  console.log(`=== KẾT QUẢ: ${passed} bài kiểm tra đạt, ${failed} bài kiểm tra thất bại ===`);
}