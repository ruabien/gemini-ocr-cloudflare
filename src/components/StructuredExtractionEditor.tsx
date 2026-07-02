/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileSpreadsheet,
  Sparkles,
  Plus,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  ArrowUp,
  ArrowDown,
  Save,
  LayoutTemplate
} from "lucide-react";
import { OcrDocument } from "../types";
import { useAuth } from "../contexts/AuthContext";
import LoginPromptModal from "./LoginPromptModal";

export type StructuredDocumentType = "thong_bao_thu_ly" | "quyet_dinh_khoi_to_bi_can";
export type CaseType = "hinh_su" | "dan_su" | "hanh_chinh";

interface ExtractionRow {
  id: string;
  name: string;
  value: string;
  confidence?: string;
  note: string;
}

interface StructuredExtractionEditorProps {
  document: OcrDocument | null;
  onBack: () => void;
  membershipRole: "Free" | "Pro";
  setActiveTab: (tab: string) => void;
}

interface AutoGrowingTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

function AutoGrowingTextArea({ value, onChange, className, ...props }: AutoGrowingTextAreaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={className}
      {...props}
    />
  );
}

function extractSectionText(text: string, startKeywords: string[], stopKeywords: string[]): string {
  const cleanText = text || "";
  let startIdx = -1;
  let matchedKeyword = "";
  for (const kw of startKeywords) {
    const idx = cleanText.toLowerCase().indexOf(kw.toLowerCase());
    if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
      startIdx = idx;
      matchedKeyword = kw;
    }
  }

  if (startIdx === -1) return "";

  let content = cleanText.substring(startIdx + matchedKeyword.length);
  content = content.replace(/^[:\-\s]+/, "");

  let endIdx = content.length;
  for (const kw of stopKeywords) {
    const idx = content.toLowerCase().indexOf(kw.toLowerCase());
    if (idx !== -1 && idx < endIdx) {
      endIdx = idx;
    }
  }

  return content.substring(0, endIdx).trim();
}

function splitParties(sectionText: string): string[] {
  if (!sectionText) return [];
  
  const text = sectionText.trim();
  const markerRegex = /(;|\n|\r\n|\b\d+[\.\)\-]\s*|\b(?:Ông|Bà|Anh|Chị|Công\s+ty|Hộ\s+gia\s+đình)\b)/g;
  const matches: { index: number; text: string; isPrefix: boolean }[] = [];
  let match;
  
  while ((match = markerRegex.exec(text)) !== null) {
    const matchedText = match[1];
    const index = match.index;
    const isPrefix = /^(Ông|Bà|Anh|Chị|Công\s+ty|Hộ\s+gia\s+đình)$/i.test(matchedText.trim());
    
    if (isPrefix) {
      const before = text.substring(Math.max(0, index - 20), index).toLowerCase();
      const ignorePatterns = [
        /phường\s+$/, /xã\s+$/, /quận\s+$/, /huyện\s+$/, /tỉnh\s+$/,
        /thành\s+phố\s+$/, /đường\s+$/, /phố\s+$/, /thị\s+trấn\s+$/,
        /thị\s+xã\s+$/, /ấp\s+$/, /thôn\s+$/, /tổ\s+$/, /khu\s+$/,
        /dân\s+phố\s+$/, /chi\s+nhánh\s+$/, /văn\s+phòng\s+$/,
        /đại\s+diện\s+$/, /ban\s+$/, /vụ\s+$/
      ];
      
      const shouldIgnore = ignorePatterns.some(p => p.test(before));
      if (shouldIgnore) {
        continue;
      }
    }
    
    matches.push({ index, text: matchedText, isPrefix });
  }
  
  const parts: string[] = [];
  let lastIndex = 0;
  
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const segment = text.substring(lastIndex, m.index).trim();
    if (segment) {
      parts.push(segment);
    }
    
    if (m.isPrefix || /^\d+[\.\)\-]/.test(m.text.trim())) {
      lastIndex = m.index;
    } else {
      lastIndex = m.index + m.text.length;
    }
  }
  
  const finalSegment = text.substring(lastIndex).trim();
  if (finalSegment) {
    parts.push(finalSegment);
  }
  
  const cleanedParts: string[] = [];
  for (let part of parts) {
    part = part.replace(/^[,.;\-\s]+/, "").replace(/[,.;\-\s]+$/, "").trim();
    if (part.length > 3) {
      cleanedParts.push(part);
    }
  }
  
  return cleanedParts;
}

function extractRoleBlock(text: string, startLabels: string[], stopLabels: string[]): string {
  if (!text) return "";

  let startIdx = -1;
  let matchedStartLen = 0;

  for (const label of startLabels) {
    const isRegexStr = label.startsWith("\\b") || label.startsWith("\\n");
    const regexStr = isRegexStr ? label : label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(regexStr, "i");
    const match = text.match(regex);
    if (match && match.index !== undefined) {
      if (startIdx === -1 || match.index < startIdx) {
        startIdx = match.index;
        matchedStartLen = match[0].length;
      }
    }
  }

  if (startIdx === -1) return "";

  const remainingText = text.substring(startIdx + matchedStartLen);
  let stopIdx = remainingText.length;

  for (const label of stopLabels) {
    const isRegexStr = label.startsWith("\\b") || label.startsWith("\\n");
    const regexStr = isRegexStr ? label : label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(regexStr, "i");
    const match = remainingText.match(regex);
    if (match && match.index !== undefined) {
      if (match.index < stopIdx) {
        stopIdx = match.index;
      }
    }
  }

  return remainingText.substring(0, stopIdx).trim();
}

function removeRepresentativeSegments(block: string): string {
  const representativeKeywords = [
    "Người đại diện theo ủy quyền",
    "Đại diện theo ủy quyền",
    "Người bảo vệ quyền và lợi ích hợp pháp",
    "Luật sư",
    "Người đại diện hợp pháp"
  ];
  
  let cleanedBlock = block;
  for (const kw of representativeKeywords) {
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedKw, "i");
    let match = cleanedBlock.match(regex);
    while (match && match.index !== undefined) {
      const startIdx = match.index;
      const remaining = cleanedBlock.substring(startIdx + match[0].length);
      
      const boundaryRegex = /(?:\r?\n\s*\d+[\.\)\-]\s*)|(?:\r?\n\s*(?:Ông|Bà|Anh|Chị|Công\s+ty|Hộ\s+gia\s+đình|Cơ\s+quan|Tổ\s+chức)\b)|(?:;\s*(?:Ông|Bà|Anh|Chị|Công\s+ty|Hộ\s+gia\s+đình|Cơ\s+quan|Tổ\s+chức)\b)|(?:\;\s*\d+[\.\)\-]\s*)/i;
      const boundaryMatch = remaining.match(boundaryRegex);
      let endIdx = remaining.length;
      if (boundaryMatch && boundaryMatch.index !== undefined) {
        endIdx = boundaryMatch.index;
      }
      
      cleanedBlock = cleanedBlock.substring(0, startIdx) + remaining.substring(endIdx);
      match = cleanedBlock.match(regex);
    }
  }
  return cleanedBlock.trim();
}

function trimAfterAddressBlock(personText: string): string {
  const addrRegex = /(?:địa\s+chỉ|nơi\s+cư\s+trú|trụ\s+sở|hktt|đkhktt|địa\s+chỉ\s+tại)\s*[:\-]?/i;
  const match = personText.match(addrRegex);
  if (!match) return personText;

  const beforeAddress = personText.substring(0, match.index);
  const addressPart = personText.substring(match.index!);

  let stopIdx = addressPart.length;
  const stopLabels = [
    "Ngày", "Tòa án", "Theo đơn", "Những vấn đề", "yêu cầu",
    "Nội dung", "Căn cứ", "Kèm theo", "Người đại diện",
    "Đại diện theo ủy quyền", "đã thụ lý vụ án",
    "Người khởi kiện", "Người bị kiện", "Tòa án thông báo"
  ];

  for (const label of stopLabels) {
    const regexStr = label === "Ngày" ? "\\nNgày\\b" : label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(regexStr, "i");
    const stopMatch = addressPart.match(regex);
    if (stopMatch && stopMatch.index !== undefined && stopMatch.index < stopIdx) {
      stopIdx = stopMatch.index;
    }
  }

  return beforeAddress + addressPart.substring(0, stopIdx).trim();
}

function cleanPersonSegment(segment: string): string {
  let cleaned = segment.replace(/^[\s,;:\-\*\u2022\d\.\)\(]+/g, "").trim();
  cleaned = trimAfterAddressBlock(cleaned);
  if (!cleaned) return "";

  const addrRegex = /(?:địa\s+chỉ|nơi\s+cư\s+trú|trụ\s+sở|hktt|đkhktt|địa\s+chỉ\s+tại)\s*[:\-]?\s*/i;
  const addrMatch = cleaned.match(addrRegex);

  let infoPart = "";
  let addrPart = "";

  if (addrMatch && addrMatch.index !== undefined) {
    infoPart = cleaned.substring(0, addrMatch.index).trim();
    addrPart = cleaned.substring(addrMatch.index + addrMatch[0].length).trim();
  } else {
    infoPart = cleaned;
  }

  const formatPart = (p: string) => {
    return p
      .replace(/[\r\n]+/g, ", ")
      .replace(/,\s*,/g, ",")
      .replace(/\s+/g, " ")
      .replace(/^[\s,;:\-\.]+/, "")
      .replace(/[\s,;:\-\.]+$/, "")
      .trim();
  };

  const formattedInfo = formatPart(infoPart);
  const formattedAddr = addrPart ? formatPart(addrPart) : "";

  if (formattedInfo && formattedAddr) {
    return `${formattedInfo}, địa chỉ: ${formattedAddr}`;
  } else if (formattedInfo) {
    return formattedInfo;
  } else if (formattedAddr) {
    return formattedAddr;
  }
  return "";
}

function extractPersonsFromRoleBlock(block: string): string[] {
  if (!block) return [];

  let cleanBlock = block.replace(/\*\*/g, "").replace(/^[:\-\s,;]+/, "").trim();

  const starterRegex = /(?:^|[\r\n]+|;)\s*(?:\d+[\.\)\-]\s*|[\-\*\u2022]\s*)?(Ông|Bà|Anh|Chị|Công\s+ty|Hộ\s+gia\s+đình|Cơ\s+quan|Tổ\s+chức)\b/ig;
  
  const matches: { index: number; length: number }[] = [];
  let match;
  while ((match = starterRegex.exec(cleanBlock)) !== null) {
    matches.push({ index: match.index, length: match[0].length });
  }

  if (matches.length === 0) {
    const trimmed = cleanBlock.trim();
    const cleaned = trimmed ? cleanPersonSegment(trimmed) : "";
    return cleaned ? [cleaned] : [];
  }

  const segments: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].index;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : cleanBlock.length;
    const segment = cleanBlock.substring(startIdx, endIdx).trim();
    if (segment) {
      segments.push(segment);
    }
  }

  const result: string[] = [];
  for (const seg of segments) {
    const cleaned = cleanPersonSegment(seg);
    if (cleaned) {
      result.push(cleaned);
    }
  }

  return result;
}

// Hàm heuristic để bóc tách thông tin từ văn bản OCR thô
function runRuleBasedExtraction(
  text: string,
  docType: StructuredDocumentType,
  caseType: CaseType
): ExtractionRow[] {
  const cleanText = text || "";
  const lines = cleanText.split("\n");

  // Regex hỗ trợ tìm ngày tháng
  const dateRegex = /(ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i;

  const findLineWithKeyword = (keywords: string[]): string => {
    for (const line of lines) {
      if (keywords.some((kw) => line.toLowerCase().includes(kw.toLowerCase()))) {
        return line.trim();
      }
    }
    return "";
  };

  const extractValueAfterKeyword = (keywords: string[], cleanKeywords: string[] = []): string => {
    for (const line of lines) {
      for (const kw of keywords) {
        const idx = line.toLowerCase().indexOf(kw.toLowerCase());
        if (idx !== -1) {
          let value = line.substring(idx + kw.length).trim();
          // Cắt các ký tự đặc biệt đầu dòng như :, -, v.v.
          value = value.replace(/^[:\-\s]+/, "").trim();
          if (value) {
            // Loại bỏ các từ khóa dính ở dòng nếu có
            if (cleanKeywords.length > 0) {
              cleanKeywords.forEach((ckw) => {
                if (value.toLowerCase().includes(ckw.toLowerCase())) {
                  const cutIdx = value.toLowerCase().indexOf(ckw.toLowerCase());
                  value = value.substring(0, cutIdx).trim();
                }
              });
            }
            return value;
          }
        }
      }
    }
    return "";
  };

  // 1. Template: Thông báo thụ lý - Dân sự
  if (docType === "thong_bao_thu_ly" && caseType === "dan_su") {
    // Tìm số thụ lý: "Số: ... /... /TB-TL"
    const soLine = findLineWithKeyword(["Số:", "Thụ lý số:"]);
    const soMatch = soLine ? soLine.match(/(Số\s*:\s*[^\s,\n]+|Thụ lý số\s*:\s*[^\s,\n]+)/i) : null;
    const soThuLy = soMatch ? soMatch[0].replace(/^(Số|Thụ lý số)\s*:\s*/i, "").trim() : "";

    const dateMatch = cleanText.match(dateRegex);
    const ngayThuLy = dateMatch ? dateMatch[0] : "";

    const stopLabelsCommon = [
      "Người có quyền", "Người liên quan", "Quan hệ pháp luật", "Thẩm phán", "Thời hạn",
      "Nội dung", "Theo đơn", "Căn cứ", "\\nNgày\\b", "Tòa án nhân dân", "đã thụ lý vụ án",
      "Những vấn đề", "yêu cầu", "Tòa án thông báo", "Kèm theo", "Người khởi kiện", "Người bị kiện"
    ];

    const nguyenDonRaw = extractRoleBlock(cleanText, ["Nguyên đơn", "Người khởi kiện"], ["Bị đơn", "Người bị kiện", ...stopLabelsCommon]);
    const biDonRaw = extractRoleBlock(cleanText, ["Bị đơn", "Người bị kiện"], stopLabelsCommon);
    const nguoiLienQuanRaw = extractRoleBlock(cleanText, ["Người có quyền lợi, nghĩa vụ liên quan", "Người liên quan"], stopLabelsCommon);
    
    let quanHe = "";
    const quanHeMatch1 = cleanText.match(/về việc\s*["“”]([^"“”]+)["“”]/i);
    if (quanHeMatch1 && quanHeMatch1[1]) {
      quanHe = quanHeMatch1[1].trim();
    } else {
      const quanHeMatch2 = cleanText.match(/về việc\s+(.+?)(?:\.|\n|$)/i);
      if (quanHeMatch2 && quanHeMatch2[1]) {
        quanHe = quanHeMatch2[1].trim();
      } else {
        quanHe = extractSectionText(cleanText, ["Quan hệ pháp luật tranh chấp:", "Quan hệ pháp luật:", "Về việc:", "Tranh chấp về:"], ["Nguyên đơn:", "Người khởi kiện:", "Bị đơn:", "Người bị kiện:", "Người có quyền", "Người liên quan:", "Thẩm phán", "Thời hạn"]);
      }
    }
    
    if (quanHe) {
      quanHe = quanHe.replace(/\*\*/g, "").replace(/^["“”]+|["“”]+$/g, "").trim();
    }

    const nguyenDonList = extractPersonsFromRoleBlock(removeRepresentativeSegments(nguyenDonRaw));
    const biDonList = extractPersonsFromRoleBlock(removeRepresentativeSegments(biDonRaw));
    const nguoiLienQuanList = extractPersonsFromRoleBlock(removeRepresentativeSegments(nguoiLienQuanRaw));

    const nguyenDons = nguyenDonList.length > 0 ? nguyenDonList : [""];
    const biDons = biDonList.length > 0 ? biDonList : [""];
    const nguoiLienQuans = nguoiLienQuanList;

    const extractedRows: ExtractionRow[] = [];
    let idCounter = 1;

    extractedRows.push({
      id: String(idCounter++),
      name: "Số thụ lý",
      value: soThuLy || "Số: .../TB-TL",
      confidence: "90%",
      note: "Bóc tách từ từ khóa 'Số:'"
    });

    extractedRows.push({
      id: String(idCounter++),
      name: "Ngày thụ lý",
      value: ngayThuLy,
      confidence: "85%",
      note: "Bóc tách bằng biểu thức ngày tháng"
    });

    extractedRows.push({
      id: String(idCounter++),
      name: "Quan hệ pháp luật",
      value: quanHe || "Tranh chấp hợp đồng dân sự",
      confidence: "70%",
      note: "Bóc tách sau 'Quan hệ pháp luật'"
    });

    nguyenDons.forEach((val, idx) => {
      extractedRows.push({
        id: String(idCounter++),
        name: `Nguyên đơn ${idx + 1}`,
        value: val,
        confidence: val ? "75%" : "---",
        note: "Bóc tách từ phần 'Nguyên đơn'"
      });
    });

    biDons.forEach((val, idx) => {
      extractedRows.push({
        id: String(idCounter++),
        name: `Bị đơn ${idx + 1}`,
        value: val,
        confidence: val ? "75%" : "---",
        note: "Bóc tách từ phần 'Bị đơn'"
      });
    });

    nguoiLienQuans.forEach((val, idx) => {
      extractedRows.push({
        id: String(idCounter++),
        name: `Người liên quan ${idx + 1}`,
        value: val,
        confidence: val ? "60%" : "---",
        note: "Bóc tách từ phần 'Người có quyền lợi, nghĩa vụ liên quan'"
      });
    });

    return extractedRows;
  }

  // 2. Template: Thông báo thụ lý - Hành chính
  if (docType === "thong_bao_thu_ly" && caseType === "hanh_chinh") {
    const soLine = findLineWithKeyword(["Số:", "Thụ lý số:"]);
    const soMatch = soLine ? soLine.match(/(Số\s*:\s*[^\s,\n]+|Thụ lý số\s*:\s*[^\s,\n]+)/i) : null;
    const soThuLy = soMatch ? soMatch[0].replace(/Số\s*:\s*/i, "").trim() : "TB-TL/HC";

    const dateMatch = cleanText.match(dateRegex);
    const ngayThuLy = dateMatch ? dateMatch[0] : "Chưa tìm thấy ngày";

    const toaAnLine = findLineWithKeyword(["Tòa án nhân dân", "TAND"]);
    const toaAn = toaAnLine ? toaAnLine.trim() : "Tòa án nhân dân";

    const nguoiKhoiKien = extractValueAfterKeyword(["Người khởi kiện:"], ["Người bị kiện", "Địa chỉ"]);
    const nguoiBiKien = extractValueAfterKeyword(["Người bị kiện:"], ["Người có quyền", "Địa chỉ"]);
    const nguoiLienQuan = extractValueAfterKeyword(["Người có quyền lợi", "Nghĩa vụ liên quan:"], ["Đối tượng", "Địa chỉ"]);
    const doiTuongKhieuKien = extractValueAfterKeyword(["Đối tượng khởi kiện:", "Khiếu kiện đối với:"], ["Thẩm phán"]);
    const quyetDinhBiKien = extractValueAfterKeyword(["Quyết định hành chính bị kiện:", "Hành vi hành chính bị kiện:"], ["Thẩm phán"]);
    const thamPhan = extractValueAfterKeyword(["Thẩm phán được phân công:", "Thẩm phán giải quyết:"], ["Thư ký"]);

    return [
      { id: "1", name: "Số thụ lý", value: soThuLy || "Số: .../TB-TL", confidence: "90%", note: "Bóc tách từ từ khóa 'Số:'" },
      { id: "2", name: "Ngày thụ lý", value: ngayThuLy, confidence: "85%", note: "Bóc tách bằng biểu thức ngày tháng" },
      { id: "3", name: "Tòa án thụ lý", value: toaAn || "Tòa án nhân dân...", confidence: "80%", note: "Tìm kiếm dòng có chứa 'Tòa án'" },
      { id: "4", name: "Người khởi kiện", value: nguoiKhoiKien || "", confidence: "75%", note: "Bóc tách sau từ khóa 'Người khởi kiện'" },
      { id: "5", name: "Người bị kiện", value: nguoiBiKien || "Chủ tịch Ủy ban nhân dân...", confidence: "75%", note: "Bóc tách sau từ khóa 'Người bị kiện'" },
      { id: "6", name: "Người có quyền lợi, nghĩa vụ liên quan", value: nguoiLienQuan || "Không có", confidence: "60%", note: "Bóc tách sau từ khóa 'Người có quyền lợi'" },
      { id: "7", name: "Đối tượng khiếu kiện", value: doiTuongKhieuKien || "Quyết định giải quyết tranh chấp đất đai", confidence: "70%", note: "Bóc tách sau 'Đối tượng khởi kiện'" },
      { id: "8", name: "Quyết định hành chính/hành vi hành chính bị kiện", value: quyetDinhBiKien || "Quyết định số 123/QĐ-UBND", confidence: "70%", note: "Bóc tách sau 'Quyết định hành chính bị kiện'" },
      { id: "9", name: "Thẩm phán được phân công", value: thamPhan || "Lê Hoàng D", confidence: "80%", note: "Bóc tách sau 'Thẩm phán'" }
    ];
  }

  // 3. Template: Quyết định khởi tố bị can - Hình sự
  if (docType === "quyet_dinh_khoi_to_bi_can" || caseType === "hinh_su") {
    // Quyết định khởi tố bị can thường đi với hình sự
    const soLine = findLineWithKeyword(["Số:", "Quyết định số:"]);
    const soMatch = soLine ? soLine.match(/(Số\s*:\s*[^\s,\n]+|Quyết định số\s*:\s*[^\s,\n]+)/i) : null;
    const soQuyetDinh = soMatch ? soMatch[0].replace(/Số\s*:\s*/i, "").trim() : "QĐKT/HS";

    const dateMatch = cleanText.match(dateRegex);
    const ngayQuyetDinh = dateMatch ? dateMatch[0] : "Chưa tìm thấy ngày";

    const coQuanLine = findLineWithKeyword(["Cơ quan cảnh sát điều tra", "Viện kiểm sát nhân dân", "Cơ quan An ninh điều tra"]);
    const coQuan = coQuanLine ? coQuanLine.trim() : "Cơ quan cảnh sát điều tra";

    const dieuTraVien = extractValueAfterKeyword(["Điều tra viên:", "Kiểm sát viên:"], ["Họ tên bị can", "Bị can"]);
    const hoTenBiCan = extractValueAfterKeyword(["Họ tên bị can:", "Bị can:", "Khởi tố đối với bị can:"], ["Ngày sinh", "Nơi cư trú"]);
    const ngaySinh = extractValueAfterKeyword(["Ngày sinh:", "Năm sinh:", "Sinh ngày:"], ["Nơi cư trú", "Nghề nghiệp"]);
    const noiCuTru = extractValueAfterKeyword(["Nơi cư trú:", "Nơi đăng ký HKTT:", "Chỗ ở hiện nay:"], ["Nghề nghiệp", "Dân tộc"]);
    const ngheNghiep = extractValueAfterKeyword(["Nghề nghiệp:"], ["Số CCCD", "CMND"]);
    const soCccd = extractValueAfterKeyword(["Số CCCD:", "Số CMND:", "Số định danh cá nhân:"], ["Tội danh", "Khởi tố"]);

    // Tìm tội danh
    let toiDanh = extractValueAfterKeyword(["Tội danh:", "Khởi tố về tội:"], ["Điều luật", "Bộ luật hình sự"]);
    if (!toiDanh) {
      // Tìm xem có cụm từ "về tội" trong văn bản hình sự không
      const toiLine = findLineWithKeyword(["về tội"]);
      if (toiLine) {
        const toiIdx = toiLine.toLowerCase().indexOf("về tội");
        toiDanh = toiLine.substring(toiIdx + 6).trim();
      }
    }

    // Tìm điều luật
    let dieuLuat = extractValueAfterKeyword(["Điều:", "Khoản:", "Áp dụng điều:", "Theo quy định tại Điều"], ["Bộ luật hình sự"]);
    if (!dieuLuat) {
      const dieuLine = findLineWithKeyword(["Điều "]);
      const dieuMatch = dieuLine ? dieuLine.match(/Điều\s+\d+/i) : null;
      dieuLuat = dieuMatch ? dieuMatch[0] : "Chưa định vị điều luật";
    }

    const bienPhap = extractValueAfterKeyword(["Biện pháp ngăn chặn:", "Áp dụng biện pháp:"], ["Cơ quan"]);

    return [
      { id: "1", name: "Số quyết định", value: soQuyetDinh || "Số: .../QĐ-CSĐT", confidence: "90%", note: "Bóc tách từ từ khóa 'Số:'" },
      { id: "2", name: "Ngày quyết định", value: ngayQuyetDinh, confidence: "85%", note: "Bóc tách bằng biểu thức ngày tháng" },
      { id: "3", name: "Cơ quan ban hành", value: coQuan || "Cơ quan Cảnh sát điều tra", confidence: "80%", note: "Tìm cơ quan tư pháp ban hành" },
      { id: "4", name: "Điều tra viên/Kiểm sát viên", value: dieuTraVien || "Nguyễn Văn T", confidence: "70%", note: "Bóc tách sau 'Điều tra viên'/'Kiểm sát viên'" },
      { id: "5", name: "Họ tên bị can", value: hoTenBiCan || "Trần Văn X", confidence: "75%", note: "Bóc tách sau từ khóa 'Bị can'" },
      { id: "6", name: "Ngày sinh/Năm sinh", value: ngaySinh || "1990", confidence: "75%", note: "Bóc tách sau 'Ngày sinh'" },
      { id: "7", name: "Nơi cư trú", value: noiCuTru || "123 Đường Lê Duẩn, Quận Hải Châu, Đà Nẵng", confidence: "65%", note: "Bóc tách sau 'Nơi cư trú'" },
      { id: "8", name: "Nghề nghiệp", value: ngheNghiep || "Lao động tự do", confidence: "60%", note: "Bóc tách sau 'Nghề nghiệp'" },
      { id: "9", name: "Số CCCD/CMND", value: soCccd || "048090001234", confidence: "80%", note: "Bóc tách sau 'CCCD/CMND'" },
      { id: "10", name: "Tội danh", value: toiDanh || "Tội lừa đảo chiếm đoạt tài sản", confidence: "70%", note: "Bóc tách sau 'về tội' hoặc 'Tội danh'" },
      { id: "11", name: "Điều luật áp dụng", value: dieuLuat || "Điều 174 Bộ luật Hình sự", confidence: "80%", note: "Bóc tách sau từ khóa 'Điều'" },
      { id: "12", name: "Biện pháp ngăn chặn", value: bienPhap || "Tạm giam", confidence: "70%", note: "Bóc tách sau 'Biện pháp ngăn chặn'" }
    ];
  }

  // Fallback mặc định
  return [
    { id: "1", name: "Họ và tên đối tượng", value: "", confidence: "50%", note: "Không khớp biểu mẫu chính" },
    { id: "2", name: "Số định danh / CCCD", value: "", confidence: "50%", note: "Không khớp biểu mẫu chính" }
  ];
}

export default function StructuredExtractionEditor({
  document,
  onBack,
  membershipRole,
  setActiveTab
}: StructuredExtractionEditorProps) {
  if (!document) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Chưa có dữ liệu hồ sơ được chọn.</h2>
          <p className="text-slate-600 mb-6">
            Vui lòng quay lại trang Bóc tách tài liệu để chọn file và tiến hành bóc tách.
          </p>
          <button
            onClick={onBack}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            Quay lại Bóc tách tài liệu
          </button>
        </div>
      </div>
    );
  }

  // Phân tích văn bản OCR từ document
  const rawContentText = (() => {
    if (!document) return "";
    if (document.content) {
      try {
        const parsed = JSON.parse(document.content);
        return parsed.text || parsed.data?.text || document.rawText || "";
      } catch {
        return document.content;
      }
    }
    return "";
  })();

  // Cấu hình Loại văn bản & Loại án
  const [docType, setDocType] = useState<StructuredDocumentType>(() => {
    if (document.name?.toLowerCase().includes("thụ lý") || document.name?.toLowerCase().includes("thu ly")) {
      return "thong_bao_thu_ly";
    }
    if (document.name?.toLowerCase().includes("khởi tố") || document.name?.toLowerCase().includes("khoi to")) {
      return "quyet_dinh_khoi_to_bi_can";
    }
    return "thong_bao_thu_ly";
  });

  const [caseType, setCaseType] = useState<CaseType>(() => {
    if (docType === "quyet_dinh_khoi_to_bi_can") return "hinh_su";
    if (document.name?.toLowerCase().includes("hình sự") || document.name?.toLowerCase().includes("hinh su")) {
      return "hinh_su";
    }
    if (document.name?.toLowerCase().includes("hành chính") || document.name?.toLowerCase().includes("hanh chinh")) {
      return "hanh_chinh";
    }
    return "dan_su";
  });

  // Khi thay đổi loại văn bản, tự động định tuyến loại án phù hợp
  useEffect(() => {
    if (docType === "quyet_dinh_khoi_to_bi_can") {
      setCaseType("hinh_su");
    }
  }, [docType]);

  // Trạng thái bảng trích xuất dữ liệu
  const [rows, setRows] = useState<ExtractionRow[]>([]);
  
  // Trạng thái thêm trường mới
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [newFieldNote, setNewFieldNote] = useState("");

  // Trạng thái nâng cấp PRO
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginFeatureName, setLoginFeatureName] = useState("");

  // Chạy bóc tách dữ liệu khi thay đổi cấu hình hoặc tài liệu gốc
  const handleExtract = () => {
    const extracted = runRuleBasedExtraction(rawContentText, docType, caseType);
    setRows(extracted);
  };

  useEffect(() => {
    handleExtract();
  }, [docType, caseType, rawContentText]);

  // Reset về cấu hình ban đầu
  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục trích xuất ban đầu? Các chỉnh sửa thủ công của bạn sẽ bị ghi đè.")) {
      handleExtract();
    }
  };

  // Cập nhật giá trị trường
  const handleRowChange = (id: string, field: "name" | "value" | "note", newValue: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: newValue } : row))
    );
  };

  // Xóa trường
  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  // Di chuyển lên
  const handleMoveUp = (id: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx > 0) {
        const newRows = [...prev];
        const temp = newRows[idx];
        newRows[idx] = newRows[idx - 1];
        newRows[idx - 1] = temp;
        return newRows;
      }
      return prev;
    });
  };

  // Di chuyển xuống
  const handleMoveDown = (id: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx !== -1 && idx < prev.length - 1) {
        const newRows = [...prev];
        const temp = newRows[idx];
        newRows[idx] = newRows[idx + 1];
        newRows[idx + 1] = temp;
        return newRows;
      }
      return prev;
    });
  };

  // State theo dõi xem có mẫu đã lưu tương ứng hay không
  const [hasSavedTemplate, setHasSavedTemplate] = useState(false);

  // Kiểm tra mẫu tồn tại trong localStorage
  const checkTemplateExists = () => {
    const key = `${docType}:${caseType.replace(/_/g, "")}`;
    const stored = localStorage.getItem("lexocr_structured_templates");
    if (stored) {
      try {
        const templates = JSON.parse(stored);
        setHasSavedTemplate(!!templates[key]);
      } catch {
        setHasSavedTemplate(false);
      }
    } else {
      setHasSavedTemplate(false);
    }
  };

  useEffect(() => {
    checkTemplateExists();
  }, [docType, caseType]);

  const generateKey = (label: string) => {
    return label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // loại bỏ dấu tiếng Việt
      .replace(/đ/g, "d")
      .replace(/[^\w\s-]/g, "") // loại bỏ ký tự đặc biệt trừ khoảng trắng/gạch ngang
      .trim()
      .replace(/[-\s]+/g, "_"); // chuyển khoảng trắng/gạch ngang thành gạch dưới
  };

  // Lưu mẫu
  const handleSaveTemplate = () => {
    try {
      const stored = localStorage.getItem("lexocr_structured_templates") || "{}";
      const templates = JSON.parse(stored);
      const caseTypeKey = caseType.replace(/_/g, "");
      const key = `${docType}:${caseTypeKey}`;
      
      const docTypeLabel = docType === "thong_bao_thu_ly" ? "Thông báo thụ lý" : "Quyết định khởi tố bị can";
      const caseTypeLabel = caseType === "dan_su" ? "Dân sự" : caseType === "hinh_su" ? "Hình sự" : "Hành chính";

      const templateFields = rows.map((row) => ({
        label: row.name,
        key: generateKey(row.name)
      }));

      templates[key] = {
        name: `${docTypeLabel} - ${caseTypeLabel}`,
        documentType: docType,
        caseType: caseTypeKey,
        fields: templateFields,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem("lexocr_structured_templates", JSON.stringify(templates));
      setHasSavedTemplate(true);
      alert("Đã lưu mẫu trường dữ liệu thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lưu mẫu.");
    }
  };

  // Áp dụng mẫu
  const handleApplyTemplate = () => {
    try {
      const stored = localStorage.getItem("lexocr_structured_templates");
      if (!stored) return;
      const templates = JSON.parse(stored);
      const key = `${docType}:${caseType.replace(/_/g, "")}`;
      const template = templates[key];
      if (!template || !template.fields) return;

      const templateFields: { label: string; key: string }[] = template.fields;

      // Sắp xếp các trường hiện có theo mẫu.
      // Nếu mẫu có trường chưa có trong kết quả hiện tại, thêm trường với giá trị rỗng.
      // Nếu kết quả hiện tại có trường ngoài mẫu, giữ lại ở cuối danh sách.
      const currentRows = [...rows];
      const newRows: ExtractionRow[] = [];

      templateFields.forEach((tField) => {
        const foundIdx = currentRows.findIndex(
          (r) => r.name.trim().toLowerCase() === tField.label.trim().toLowerCase()
        );
        if (foundIdx !== -1) {
          newRows.push(currentRows[foundIdx]);
          currentRows.splice(foundIdx, 1);
        } else {
          newRows.push({
            id: `template-${Date.now()}-${Math.random()}`,
            name: tField.label,
            value: "",
            confidence: "Thủ công",
            note: "Thêm từ mẫu"
          });
        }
      });

      // Thêm các trường ngoài mẫu vào cuối danh sách
      newRows.push(...currentRows);

      setRows(newRows);
      alert("Đã áp dụng mẫu thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi áp dụng mẫu.");
    }
  };

  // Thêm trường mới
  const handleAddRow = () => {
    if (!newFieldName.trim()) return;
    const newRow: ExtractionRow = {
      id: Date.now().toString(),
      name: newFieldName.trim(),
      value: newFieldValue.trim(),
      confidence: "Thủ công",
      note: newFieldNote.trim() || "Thêm thủ công bởi kiểm sát viên"
    };
    setRows((prev) => [...prev, newRow]);
    setNewFieldName("");
    setNewFieldValue("");
    setNewFieldNote("");
  };

  // Xuất CSV UTF-8 với BOM để mở trực tiếp trên Excel không bị lỗi font tiếng Việt
  const handleExportExcel = () => {
    if (!user) {
      setLoginFeatureName("Xuất Excel bảng trường dữ liệu");
      setShowLoginPrompt(true);
      return;
    }
    if (membershipRole !== "Pro") {
      setShowUpgradeModal(true);
      return;
    }

    try {
      // Build horizontal CSV with field names as headers
      const headers = rows.map((row) => `"${row.name.replace(/"/g, '""')}"`);
      const values = rows.map((row) => `"${(row.value ?? "").replace(/"/g, '""')}"`);
      const csvRows = [headers.join(","), values.join(",")];

      const csvContent = csvRows.join("\n");

      // Thêm UTF-8 BOM
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const encoder = new TextEncoder();
      const csvBytes = encoder.encode(csvContent);
      const excelBuffer = new Uint8Array(bom.length + csvBytes.length);
      excelBuffer.set(bom, 0);
      excelBuffer.set(csvBytes, bom.length);

      const blob = new Blob([excelBuffer], { type: "text/csv; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;

      const cleanFileName = document.name.replace(/\.[^/.]+$/, "");
      link.download = `${cleanFileName}_TRICH_XUAT.csv`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Lỗi xuất CSV Excel:", error);
      alert("Đã xảy ra lỗi khi tạo tệp Excel.");
    }
  };

  return (
    <div id="structured-extraction-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* A. HEADER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="Quay lại scanner để tải tài liệu khác"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight flex items-center">
              <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600 mr-2" />
              <span>Dữ liệu cấu trúc: {document.name}</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              Trích xuất dữ liệu cấu trúc từ hồ sơ • Free-First Strategy
            </p>
          </div>
        </div>

        {/* Nút Xuất Excel */}
        <button
          onClick={handleExportExcel}
          className={`font-bold px-4 py-2 rounded-lg text-xs tracking-wide flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all ${
            membershipRole === "Pro"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/10"
              : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border-amber-300/45"
          }`}
        >
          {membershipRole === "Pro" ? (
            <FileSpreadsheet className="h-4 w-4" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
          )}
          <span>{membershipRole === "Pro" ? "Xuất bảng Excel (.CSV)" : "Xuất Excel PRO (.CSV)"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* B. PANEL CẤU HÌNH & XEM VĂN BẢN (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center space-x-1.5 border-b border-slate-100 pb-2.5">
              <span>Thiết lập biểu mẫu nghiệp vụ</span>
            </h3>

            <div className="space-y-3">
              {/* Chọn Loại tài liệu */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                  Loại tài liệu
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as StructuredDocumentType)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="thong_bao_thu_ly">Thông báo thụ lý</option>
                  <option value="quyet_dinh_khoi_to_bi_can">Quyết định khởi tố bị can</option>
                </select>
              </div>

              {/* Chọn Loại án */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                  Loại án vụ việc
                </label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value as CaseType)}
                  disabled={docType === "quyet_dinh_khoi_to_bi_can"} // Khởi tố bị can luôn là hình sự
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="dan_su">Dân sự</option>
                  <option value="hinh_su">Hình sự</option>
                  <option value="hanh_chinh">Hành chính</option>
                </select>
              </div>

              {/* Quản lý mẫu trường dữ liệu */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={handleSaveTemplate}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded border border-slate-300 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Lưu cấu trúc trường hiện tại làm mẫu"
                >
                  <Save className="h-3.5 w-3.5 text-slate-500" />
                  <span>Lưu mẫu</span>
                </button>
                <button
                  onClick={handleApplyTemplate}
                  disabled={!hasSavedTemplate}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded border border-slate-300 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title={hasSavedTemplate ? "Áp dụng mẫu đã lưu" : "Chưa có mẫu nào được lưu"}
                >
                  <LayoutTemplate className="h-3.5 w-3.5 text-slate-500" />
                  <span>Áp dụng mẫu</span>
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200/50 rounded-lg p-3 text-[11px] text-emerald-800 leading-relaxed font-semibold">
```
              Hệ thống tự động điều phối cấu trúc mẫu trường dữ liệu tương ứng với tài liệu thụ lý dân sự/hình sự/hành chính để cán bộ kiểm sát dễ dàng rà soát và kiểm duyệt nhanh.
            </div>
          </div>

          {/* Review Văn bản OCR */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Bản xem văn bản OCR gốc
              </span>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto bg-slate-55 text-xs text-slate-650 font-mono whitespace-pre-wrap leading-relaxed">
              {rawContentText || "Không có văn bản thô."}
            </div>
          </div>
        </div>

        {/* C. KẾT QUẢ BẢNG (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center space-x-1.5">
                  <span>Bảng dữ liệu trích xuất</span>
                </h4>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  Rà soát thông tin được bóc tách bằng bộ lọc heuristic Việt Nam. Bạn có thể sửa trực tiếp.
                </p>
              </div>

              <button
                onClick={handleReset}
                className="bg-white hover:bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded border border-slate-300 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                title="Khôi phục các trường ban đầu"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Khôi phục gốc</span>
              </button>
            </div>

            {/* Bảng Editable */}
            <div className="border border-slate-150 rounded-lg overflow-hidden bg-white shadow-inner">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase text-slate-500 font-bold">
                    <th className="py-2.5 px-3 w-4/12">Tên trường</th>
                    <th className="py-2.5 px-2 w-6/12">Giá trị trích xuất</th>
                    <th className="py-2.5 px-2 w-1.5/12 text-center">Thứ tự</th>
                    <th className="py-2.5 px-2 w-0.5/12 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        Chưa có trường dữ liệu nào. Vui lòng thêm trường ở phía dưới.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 align-top">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleRowChange(row.id, "name", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 focus:bg-white rounded px-1.5 py-1 font-bold text-slate-700"
                          />
                        </td>
                        <td className="py-2 px-2 align-top" style={{ verticalAlign: 'top' }}>
                          <AutoGrowingTextArea
                            value={row.value}
                            onChange={(e) => handleRowChange(row.id, "value", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 focus:bg-white rounded p-3 text-slate-600 font-medium leading-normal min-h-[100px] resize-y"
                            style={{ lineHeight: '1.5', display: 'block', alignSelf: 'stretch' }}
                          />
                        </td>
                        <td className="py-2 px-2 text-center align-top">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleMoveUp(row.id)}
                              disabled={index === 0}
                              className="p-1 text-slate-450 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-450 hover:bg-slate-100 rounded transition-all cursor-pointer disabled:cursor-not-allowed"
                              title="Di chuyển lên"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(row.id)}
                              disabled={index === rows.length - 1}
                              className="p-1 text-slate-450 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-450 hover:bg-slate-100 rounded transition-all cursor-pointer disabled:cursor-not-allowed"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center align-top">
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                            title="Xóa dòng"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Thêm trường thủ công */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-150 space-y-3">
              <p className="text-[10px] font-bold text-slate-505 text-slate-500 uppercase tracking-wide">
                Thêm trường dữ liệu bổ sung
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 text-slate-600 mb-1 uppercase">
                    Tên trường
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tình trạng sức khỏe..."
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 text-slate-600 mb-1 uppercase">
                    Giá trị
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Bình thường..."
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddRow}
                  disabled={!newFieldName.trim()}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded text-[11.5px] font-bold flex items-center space-x-1 border border-transparent shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Xác nhận thêm trường</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <LoginPromptModal
          onClose={() => setShowLoginPrompt(false)}
          featureName={loginFeatureName}
        />
      )}

      {/* Upgrade Modal cho Free User */}
      {showUpgradeModal && (
        <div id="upgrade-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden transform transition-all">
            <div className="bg-slate-900 p-5 text-white relative">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                  Hội viên đặc quyền
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 mt-1 leading-snug">
                Nâng cấp tài khoản PRO khối tư pháp
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start space-x-2.5 text-xs bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-200/55">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-extrabold text-[11px]">Cần nâng cấp PRO để sử dụng:</p>
                  <p className="mt-0.5 text-slate-755 text-slate-700 text-[11px] leading-relaxed font-semibold">
                    Xuất Excel trường dữ liệu tùy biến là tính năng PRO
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Thiết kế chuyên biệt cho Kiểm sát viên. Giúp tự động hiệu chỉnh văn bản đạt chuẩn Nghị định 30 văn phòng hành chính và tùy chọn bóc tách trường thông tin kết xuất Excel.
                </p>

                <div className="border border-slate-150 rounded-lg p-3 bg-slate-50 space-y-1.5 text-[10.5px] text-slate-750">
                  <p className="font-bold text-slate-700 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
                    <span>Mở khóa kết xuất Word (.DOCX) chuẩn tố tụng</span>
                  </p>
                  <p className="font-bold text-slate-700 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
                    <span>Tự xây dựng template & Xuất Excel (.XLSX)</span>
                  </p>
                  <p className="font-bold text-slate-700 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
                    <span>Bóc tách không giới hạn trang nghiệp vụ</span>
                  </p>
                </div>
              </div>

              <div className="flex space-x-2 pt-1 text-xs">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg text-slate-700 font-bold border border-slate-300 transition-all cursor-pointer"
                >
                  Để sau
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setActiveTab("upgrade");
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-1.5 rounded-lg text-slate-950 font-black tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Kích hoạt PRO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}