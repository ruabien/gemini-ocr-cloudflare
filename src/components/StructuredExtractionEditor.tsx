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
import { extractStructuredData } from "../utils/extractionService";
import { useAuth } from "../contexts/AuthContext";
import LoginPromptModal from "./LoginPromptModal";

export type CaseType = "dan_su" | "hinh_su" | "hanh_chinh" | "khac";

const defaultSchemas: Record<CaseType, string[]> = {
  dan_su: [
    "Số thụ lý",
    "Ngày thụ lý",
    "Quan hệ pháp luật",
    "Nguyên đơn 1",
    "Bị đơn 1",
    "Người có quyền lợi, nghĩa vụ liên quan 1"
  ],
  hinh_su: [
    "Số quyết định / số văn bản",
    "Ngày ban hành",
    "Cơ quan ban hành",
    "Bị can/Bị cáo 1",
    "Năm sinh",
    "Nơi cư trú",
    "Nghề nghiệp",
    "Số CCCD/CMND",
    "Tội danh",
    "Điều luật áp dụng"
  ],
  hanh_chinh: [
    "Số thụ lý",
    "Ngày thụ lý",
    "Người khởi kiện 1",
    "Người bị kiện 1",
    "Quyết định/hành vi bị kiện",
    "Yêu cầu khởi kiện"
  ],
  khac: [
    "Trường 1",
    "Trường 2"
  ]
};

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
  userGeminiKey?: string;
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

// Hàm heuristic để bóc tách thông tin từ văn bản OCR thô dựa trên danh sách trường
function extractValueForField(text: string, fieldName: string, lines: string[]): { value: string, confidence: string, note: string } {
  const nameLow = fieldName.toLowerCase();
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
          value = value.replace(/^[:\-\s]+/, "").trim();
          if (value) {
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

  if (nameLow.includes("số thụ lý") || nameLow.includes("số quyết định") || nameLow.includes("số văn bản")) {
    const soLine = findLineWithKeyword(["Số:", "Thụ lý số:", "Quyết định số:"]);
    const soMatch = soLine ? soLine.match(/(Số\s*:\s*[^\s,\n]+|Thụ lý số\s*:\s*[^\s,\n]+|Quyết định số\s*:\s*[^\s,\n]+)/i) : null;
    const value = soMatch ? soMatch[0].replace(/^(Số|Thụ lý số|Quyết định số)\s*:\s*/i, "").trim() : "";
    return { value, confidence: value ? "90%" : "---", note: "Tìm kiếm từ khóa Số/Quyết định" };
  }

  if (nameLow.includes("ngày thụ lý") || nameLow.includes("ngày ban hành") || nameLow.includes("ngày quyết định")) {
    const dateMatch = text.match(dateRegex);
    const value = dateMatch ? dateMatch[0] : "";
    return { value, confidence: value ? "85%" : "---", note: "Tìm kiếm định dạng ngày" };
  }

  if (nameLow.includes("quan hệ pháp luật") || nameLow.includes("tranh chấp")) {
    let quanHe = "";
    const quanHeMatch1 = text.match(/về việc\s*["“”]([^"“”]+)["“”]/i);
    if (quanHeMatch1 && quanHeMatch1[1]) {
      quanHe = quanHeMatch1[1].trim();
    } else {
      const quanHeMatch2 = text.match(/về việc\s+(.+?)(?:\.|\n|$)/i);
      if (quanHeMatch2 && quanHeMatch2[1]) {
        quanHe = quanHeMatch2[1].trim();
      } else {
        quanHe = extractSectionText(text, ["Quan hệ pháp luật tranh chấp:", "Quan hệ pháp luật:", "Về việc:", "Tranh chấp về:"], ["Nguyên đơn:", "Người khởi kiện:", "Bị đơn:", "Người bị kiện:", "Người có quyền", "Người liên quan:", "Thẩm phán", "Thời hạn"]);
      }
    }
    if (quanHe) quanHe = quanHe.replace(/\*\*/g, "").replace(/^["“”]+|["“”]+$/g, "").trim();
    return { value: quanHe, confidence: quanHe ? "70%" : "---", note: "Tìm từ khóa Quan hệ pháp luật/Về việc" };
  }

  const stopLabelsCommon = [
    "Người có quyền", "Người liên quan", "Quan hệ pháp luật", "Thẩm phán", "Thời hạn",
    "Nội dung", "Theo đơn", "Căn cứ", "\\nNgày\\b", "Tòa án nhân dân", "đã thụ lý vụ án",
    "Những vấn đề", "yêu cầu", "Tòa án thông báo", "Kèm theo", "Người khởi kiện", "Người bị kiện"
  ];

  if (nameLow.includes("nguyên đơn")) {
    const raw = extractRoleBlock(text, ["Nguyên đơn"], ["Bị đơn", "Người bị kiện", ...stopLabelsCommon]);
    const list = extractPersonsFromRoleBlock(removeRepresentativeSegments(raw));
    const value = list.length > 0 ? list.join("\n") : extractValueAfterKeyword(["Nguyên đơn:", "Nguyên đơn"]);
    return { value, confidence: value ? "75%" : "---", note: "Phân tích khối Nguyên đơn" };
  }

  if (nameLow.includes("bị đơn")) {
    const raw = extractRoleBlock(text, ["Bị đơn"], stopLabelsCommon);
    const list = extractPersonsFromRoleBlock(removeRepresentativeSegments(raw));
    const value = list.length > 0 ? list.join("\n") : extractValueAfterKeyword(["Bị đơn:", "Bị đơn"]);
    return { value, confidence: value ? "75%" : "---", note: "Phân tích khối Bị đơn" };
  }

  if (nameLow.includes("người khởi kiện")) {
    const raw = extractRoleBlock(text, ["Người khởi kiện"], ["Người bị kiện", "Bị đơn", ...stopLabelsCommon]);
    const list = extractPersonsFromRoleBlock(removeRepresentativeSegments(raw));
    const val2 = extractValueAfterKeyword(["Người khởi kiện:"]);
    const value = list.length > 0 ? list.join("\n") : val2;
    return { value, confidence: value ? "75%" : "---", note: "Phân tích khối Người khởi kiện" };
  }

  if (nameLow.includes("người bị kiện")) {
    const raw = extractRoleBlock(text, ["Người bị kiện"], ["Người có quyền", ...stopLabelsCommon]);
    const list = extractPersonsFromRoleBlock(removeRepresentativeSegments(raw));
    const val2 = extractValueAfterKeyword(["Người bị kiện:"]);
    const value = list.length > 0 ? list.join("\n") : val2;
    return { value, confidence: value ? "75%" : "---", note: "Phân tích khối Người bị kiện" };
  }

  if (nameLow.includes("người có quyền lợi") || nameLow.includes("người liên quan")) {
    const raw = extractRoleBlock(text, ["Người có quyền lợi, nghĩa vụ liên quan", "Người liên quan"], stopLabelsCommon);
    const list = extractPersonsFromRoleBlock(removeRepresentativeSegments(raw));
    const value = list.length > 0 ? list.join("\n") : extractValueAfterKeyword(["Người có quyền lợi, nghĩa vụ liên quan:"]);
    return { value, confidence: value ? "60%" : "---", note: "Phân tích khối Người có quyền lợi" };
  }

  if (nameLow.includes("cơ quan ban hành")) {
    const coQuanLine = findLineWithKeyword(["Cơ quan cảnh sát điều tra", "Viện kiểm sát nhân dân", "Cơ quan An ninh điều tra", "Tòa án nhân dân", "TAND"]);
    const value = coQuanLine ? coQuanLine.trim() : "";
    return { value, confidence: value ? "80%" : "---", note: "Tìm tên cơ quan" };
  }

  if (nameLow.includes("bị can") || nameLow.includes("bị cáo")) {
    const value = extractValueAfterKeyword(["Họ tên bị can:", "Bị can:", "Khởi tố đối với bị can:", "Bị cáo:"], ["Ngày sinh", "Nơi cư trú"]);
    return { value, confidence: value ? "75%" : "---", note: "Tìm từ khóa Bị can/Bị cáo" };
  }

  if (nameLow.includes("năm sinh") || nameLow.includes("ngày sinh")) {
    const value = extractValueAfterKeyword(["Ngày sinh:", "Năm sinh:", "Sinh ngày:"], ["Nơi cư trú", "Nghề nghiệp"]);
    return { value, confidence: value ? "75%" : "---", note: "Tìm từ khóa Năm sinh/Ngày sinh" };
  }

  if (nameLow.includes("cư trú") || nameLow.includes("địa chỉ")) {
    const value = extractValueAfterKeyword(["Nơi cư trú:", "Nơi đăng ký HKTT:", "Chỗ ở hiện nay:", "Địa chỉ:"], ["Nghề nghiệp", "Dân tộc"]);
    return { value, confidence: value ? "65%" : "---", note: "Tìm từ khóa Nơi cư trú/Địa chỉ" };
  }

  if (nameLow.includes("nghề nghiệp")) {
    const value = extractValueAfterKeyword(["Nghề nghiệp:"], ["Số CCCD", "CMND", "Dân tộc"]);
    return { value, confidence: value ? "60%" : "---", note: "Tìm từ khóa Nghề nghiệp" };
  }

  if (nameLow.includes("cccd") || nameLow.includes("cmnd") || nameLow.includes("định danh")) {
    const value = extractValueAfterKeyword(["Số CCCD:", "Số CMND:", "Số định danh cá nhân:", "CCCD/CMND:"], ["Tội danh", "Khởi tố", "Ngày cấp"]);
    return { value, confidence: value ? "80%" : "---", note: "Tìm từ khóa CCCD/CMND" };
  }

  if (nameLow.includes("tội danh") || nameLow.includes("về tội")) {
    let value = extractValueAfterKeyword(["Tội danh:", "Khởi tố về tội:"], ["Điều luật", "Bộ luật hình sự", "Quy định tại"]);
    if (!value) {
      const toiLine = findLineWithKeyword(["về tội"]);
      if (toiLine) {
        const toiIdx = toiLine.toLowerCase().indexOf("về tội");
        value = toiLine.substring(toiIdx + 6).trim();
      }
    }
    return { value, confidence: value ? "70%" : "---", note: "Tìm từ khóa Tội danh/về tội" };
  }

  if (nameLow.includes("điều luật") || nameLow.includes("áp dụng")) {
    let value = extractValueAfterKeyword(["Điều:", "Khoản:", "Áp dụng điều:", "Theo quy định tại Điều"], ["Bộ luật hình sự"]);
    if (!value) {
      const dieuLine = findLineWithKeyword(["Điều "]);
      const dieuMatch = dieuLine ? dieuLine.match(/Điều\s+\d+/i) : null;
      value = dieuMatch ? dieuMatch[0] : "";
    }
    return { value, confidence: value ? "80%" : "---", note: "Tìm từ khóa Điều luật" };
  }

  if (nameLow.includes("quyết định") || nameLow.includes("hành vi bị kiện") || nameLow.includes("đối tượng khởi kiện")) {
    const value = extractValueAfterKeyword(["Quyết định hành chính bị kiện:", "Hành vi hành chính bị kiện:", "Đối tượng khởi kiện:"], ["Thẩm phán", "Yêu cầu"]);
    return { value, confidence: value ? "70%" : "---", note: "Tìm từ khóa bị kiện" };
  }

  if (nameLow.includes("yêu cầu khởi kiện")) {
    const value = extractValueAfterKeyword(["Yêu cầu khởi kiện:", "Yêu cầu:"], ["Kèm theo"]);
    return { value, confidence: value ? "70%" : "---", note: "Tìm từ khóa Yêu cầu khởi kiện" };
  }

  return { value: "", confidence: "Thủ công", note: "Trường tùy chỉnh" };
}

async function runSchemaBasedExtraction(
  text: string,
  schema: string[],
  caseType: CaseType,
  userGeminiKey?: string
): Promise<ExtractionRow[]> {
  const cleanText = text || "";
  const lines = cleanText.split("\n");
  let normalizedFields: any = null;

  // 1. Chạy heuristic extraction (cũ) làm baseline
  const heuristicRows = schema.map((fieldName, index) => {
    const { value, confidence, note } = extractValueForField(cleanText, fieldName, lines);
    return {
      id: `field-${index}-${Date.now()}`,
      name: fieldName,
      value,
      confidence,
      note
    };
  });

  // Helper chuẩn hóa hậu xử lý dữ liệu (yêu cầu 8)
  const normalizeData = (val: any) => {
    if (val === null || val === undefined) return "";
    let s = String(val).trim();
    if (!s) return "";
    // Gộp nhiều khoảng trắng thành một, loại bỏ xuống dòng thừa
    s = s.replace(/\s+/g, ' ');
    // Loại bỏ dấu ":" hoặc ";" thừa ở đầu
    s = s.replace(/^[:;]\s*/, '');
    // Loại bỏ dấu ngoặc kép thừa ở đầu/cuối
    s = s.replace(/^["“”']+|["“”']+$/g, '');
    return s.trim();
  };

  try {
    let aiExtractedMap = new Map<string, string>();
    let multipleAccusedRows: ExtractionRow[] = []; // Để xử lý nhiều bị can

    if (caseType === "hinh_su") {
      // Prompt chuyên biệt cho Quyết định khởi tố bị can (yêu cầu 6)
      const customPromptText = `Hãy trích xuất thông tin từ văn bản OCR Quyết định khởi tố bị can (hoặc các văn bản hình sự).
VĂN BẢN OCR:
"""
${cleanText}
"""`;
      const customSystemText = `Bạn là trợ lý AI chuyên nghiệp phân tích văn bản tư pháp. Trích xuất thông tin từ OCR text thành JSON hợp lệ.

QUY TẮC BẮT BUỘC:
1. CHỈ trả về JSON thuần túy, KHÔNG bọc trong markdown (\`\`\`json), không giải thích.
2. Không suy đoán. Nếu không có thông tin, trả về null hoặc chuỗi rỗng "".
3. Hỗ trợ dữ liệu nhiều dòng: Nhãn có thể ở cuối dòng và giá trị ở dòng kế tiếp, hoặc địa chỉ kéo dài nhiều dòng.
4. Đối với Bị can: Ưu tiên phần mô tả nhân thân bị can sau cụm "Khởi tố bị can đối với", "Quyết định khởi tố bị can đối với", "Bị can", "Họ tên". Tuyệt đối không lấy nhầm tên Điều tra viên, Thủ trưởng cơ quan, Kiểm sát viên, hoặc người ký quyết định.
5. Nếu có nhiều bị can, đưa tất cả vào mảng "accused".

SCHEMA BẮT BUỘC TRẢ VỀ:
{
  "documentNumber": "Số quyết định hoặc số văn bản",
  "issueDate": "Ngày ban hành",
  "issuingAuthority": "Cơ quan ban hành",
  "accused": [
    {
      "fullName": "Họ và tên bị can",
      "dateOfBirth": "Năm sinh hoặc ngày tháng năm sinh",
      "gender": "Giới tính",
      "residence": "Nơi cư trú hoặc địa chỉ (ghép đầy đủ các dòng)",
      "occupation": "Nghề nghiệp",
      "nationality": "Quốc tịch (nếu có)",
      "ethnicity": "Dân tộc (nếu có)",
      "religion": "Tôn giáo (nếu có)",
      "identityNumber": "Số CCCD/CMND/Hộ chiếu (nếu có)",
      "identityIssueDate": "Ngày cấp (nếu có)",
      "identityIssuePlace": "Nơi cấp (nếu có)"
    }
  ],
  "charge": "Tội danh",
  "legalProvision": "Điều luật áp dụng (ví dụ: quy định tại khoản... Điều...)"
}`;

      // Gọi API với cấu hình không truyền template mặc định
      // Cast result to any to avoid TypeScript strict property checks
const result:any = await extractStructuredData(cleanText, {} as any, { apiKey: userGeminiKey }, { customSystemText, customPromptText });

      if (result && typeof result === 'object') {
 // @ts-ignore
if (import.meta.env.DEV) {
          // Helper to recursively normalize string values in an object
          const getNormalizedObject = (parsed: any): any => {
            if (!parsed) return parsed;
            if (Array.isArray(parsed)) {
              return parsed.map((item: any) => getNormalizedObject(item));
            }
            if (typeof parsed === 'object') {
              const norm: any = {};
              for (const [key, val] of Object.entries(parsed)) {
                if (val && typeof val === 'object') {
                  norm[key] = getNormalizedObject(val);
                } else {
                  norm[key] = normalizeData(val);
                }
              }
              return norm;
            }
            return normalizeData(parsed);
          };

          const normalizedResult = getNormalizedObject(result);
          console.log(`==============================\nNORMALIZED DATA\n==============================\n`, normalizedResult);

          const firstParsedAccused = Array.isArray(result.accused) ? result.accused[0] : (result.accused || null);
          const parsedFields = {
            documentNumber: result.documentNumber,
            issueDate: result.issueDate,
            issuingAuthority: result.issuingAuthority,
            accused: result.accused,
            "accused[0]": firstParsedAccused,
            fullName: firstParsedAccused?.fullName,
            birthYear: firstParsedAccused?.dateOfBirth ?? firstParsedAccused?.birthYear,
            identityNumber: firstParsedAccused?.identityNumber,
            occupation: firstParsedAccused?.occupation,
            residence: firstParsedAccused?.residence,
            charge: result.charge,
            legalProvision: result.legalProvision,
          };

          const firstNormalizedAccused = Array.isArray(normalizedResult?.accused) ? normalizedResult.accused[0] : (normalizedResult?.accused || null);
          normalizedFields = {
            documentNumber: normalizedResult?.documentNumber,
            issueDate: normalizedResult?.issueDate,
            issuingAuthority: normalizedResult?.issuingAuthority,
            accused: normalizedResult?.accused,
            "accused[0]": firstNormalizedAccused,
            fullName: firstNormalizedAccused?.fullName,
            birthYear: firstNormalizedAccused?.dateOfBirth ?? firstNormalizedAccused?.birthYear,
            identityNumber: firstNormalizedAccused?.identityNumber,
            occupation: firstNormalizedAccused?.occupation,
            residence: firstNormalizedAccused?.residence,
            charge: normalizedResult?.charge,
            legalProvision: normalizedResult?.legalProvision,
          };

          const isFieldLost = (beforeVal: any, afterVal: any): boolean => {
            if (beforeVal === null || beforeVal === undefined || beforeVal === "") return false;
            if (Array.isArray(beforeVal) && beforeVal.length === 0) return false;
            if (typeof beforeVal === 'object' && Object.keys(beforeVal).length === 0) return false;

            if (afterVal === null || afterVal === undefined || afterVal === "") return true;
            if (Array.isArray(afterVal) && afterVal.length === 0) return true;
            if (typeof afterVal === 'object' && Object.keys(afterVal).length === 0) return true;
            return false;
          };

          for (const key of Object.keys(parsedFields)) {
            if (isFieldLost((parsedFields as any)[key], (normalizedFields as any)[key])) {
              console.log(`MẤT DỮ LIỆU Ở BƯỚC PARSED → NORMALIZED (Trường: ${key})`);
            }
          }
        }

        // Map alias (yêu cầu 5)
        aiExtractedMap.set("Số quyết định / số văn bản", normalizeData(result.documentNumber));
        aiExtractedMap.set("Số quyết định", normalizeData(result.documentNumber));
        aiExtractedMap.set("Số QĐ", normalizeData(result.documentNumber));
        aiExtractedMap.set("Ngày ban hành", normalizeData(result.issueDate));
        aiExtractedMap.set("Ngày ra quyết định", normalizeData(result.issueDate));
        aiExtractedMap.set("Cơ quan ban hành", normalizeData(result.issuingAuthority));
        aiExtractedMap.set("Tội danh", normalizeData(result.charge));
        aiExtractedMap.set("Về tội", normalizeData(result.charge));
        aiExtractedMap.set("Có hành vi phạm tội", normalizeData(result.charge));
        aiExtractedMap.set("Điều luật áp dụng", normalizeData(result.legalProvision));
        
        const accusedList = Array.isArray(result.accused) ? result.accused : (result.accused ? [result.accused] : []);
        
        if (accusedList.length > 0) {
          // Map người đầu tiên vào các trường mặc định
          const first = accusedList[0];
          aiExtractedMap.set("Bị can/Bị cáo 1", normalizeData(first.fullName));
          aiExtractedMap.set("Bị can", normalizeData(first.fullName));
          aiExtractedMap.set("Họ tên bị can", normalizeData(first.fullName));
          aiExtractedMap.set("Năm sinh", normalizeData(first.dateOfBirth));
          aiExtractedMap.set("Ngày sinh", normalizeData(first.dateOfBirth));
          aiExtractedMap.set("Nơi cư trú", normalizeData(first.residence));
          aiExtractedMap.set("Địa chỉ", normalizeData(first.residence));
          aiExtractedMap.set("Nghề nghiệp", normalizeData(first.occupation));
          aiExtractedMap.set("Số CCCD/CMND", normalizeData(first.identityNumber));
          aiExtractedMap.set("CCCD", normalizeData(first.identityNumber));
          
          // Xử lý nhiều bị can (yêu cầu 3)
          if (accusedList.length > 1) {
            for (let i = 1; i < accusedList.length; i++) {
              const p = accusedList[i];
              const pIdx = i + 1;
              if (p.fullName) {
                multipleAccusedRows.push({ id: `field-multi-${Date.now()}-name-${pIdx}`, name: `Bị can/Bị cáo ${pIdx}`, value: normalizeData(p.fullName), confidence: "AI", note: "" });
              }
              if (p.dateOfBirth) {
                multipleAccusedRows.push({ id: `field-multi-${Date.now()}-dob-${pIdx}`, name: `Năm sinh (${pIdx})`, value: normalizeData(p.dateOfBirth), confidence: "AI", note: "" });
              }
              if (p.residence) {
                multipleAccusedRows.push({ id: `field-multi-${Date.now()}-res-${pIdx}`, name: `Nơi cư trú (${pIdx})`, value: normalizeData(p.residence), confidence: "AI", note: "" });
              }
            }
          }
        }
      }
    } else {
      // Generic template fallback
      const template = {
        fields: schema.map((label, idx) => ({
          id: label,
          description: "",
          dataType: "text",
          required: false,
          order: idx,
          example: ""
        }))
      };
       const result = await extractStructuredData(cleanText, template, { apiKey: userGeminiKey }, {});
      if (result) {
        Object.entries(result).forEach(([key, value]) => {
          aiExtractedMap.set(key, normalizeData(value));
        });
      }
    }

    // 3. Merge AI result vào heuristic baseline (ưu tiên AI, không cho phép rỗng ghi đè - yêu cầu 9)
    const finalRows = heuristicRows.map((row) => {
      const aiVal = aiExtractedMap.get(row.name);
      if (aiVal && aiVal !== "") {
        return {
          ...row,
          value: aiVal,
          confidence: "AI",
          note: "Trích xuất bằng AI"
        };
      }
      // Giữ nguyên baseline nếu AI trả rỗng
      return row;
    });

    const finalRowsAndMulti = [...finalRows, ...multipleAccusedRows];

 // @ts-ignore
if (import.meta.env.DEV && caseType === "hinh_su") {
      const getUiValue = (names: string[]) => {
        for (const name of names) {
          const r = finalRowsAndMulti.find(row => row.name === name);
          if (r && r.value !== undefined && r.value !== null && r.value !== "") {
            return r.value;
          }
        }
        return "";
      };

      const uiAccusedList: any[] = [];
      const uiFirstAccused: any = {};
      if (getUiValue(["Bị can/Bị cáo 1", "Bị can", "Họ tên bị can"])) {
        uiFirstAccused.fullName = getUiValue(["Bị can/Bị cáo 1", "Bị can", "Họ tên bị can"]);
        uiFirstAccused.dateOfBirth = getUiValue(["Năm sinh", "Ngày sinh"]);
        uiFirstAccused.residence = getUiValue(["Nơi cư trú", "Địa chỉ"]);
        uiFirstAccused.occupation = getUiValue(["Nghề nghiệp"]);
        uiFirstAccused.identityNumber = getUiValue(["Số CCCD/CMND", "CCCD"]);
        uiAccusedList.push(uiFirstAccused);
      }
      const extraAccusedMap = new Map<number, any>();
      finalRowsAndMulti.forEach(r => {
        const matchName = r.name.match(/^Bị can\/Bị cáo (\d+)$/);
        if (matchName) {
          const idx = parseInt(matchName[1], 10);
          if (!extraAccusedMap.has(idx)) extraAccusedMap.set(idx, {});
          extraAccusedMap.get(idx).fullName = r.value;
        }
        const matchDob = r.name.match(/^Năm sinh \((\d+)\)$/);
        if (matchDob) {
          const idx = parseInt(matchDob[1], 10);
          if (!extraAccusedMap.has(idx)) extraAccusedMap.set(idx, {});
          extraAccusedMap.get(idx).dateOfBirth = r.value;
        }
        const matchRes = r.name.match(/^Nơi cư trú \((\d+)\)$/);
        if (matchRes) {
          const idx = parseInt(matchRes[1], 10);
          if (!extraAccusedMap.has(idx)) extraAccusedMap.set(idx, {});
          extraAccusedMap.get(idx).residence = r.value;
        }
      });
      const sortedIndices = Array.from(extraAccusedMap.keys()).sort((a, b) => a - b);
      sortedIndices.forEach(idx => {
        uiAccusedList.push(extraAccusedMap.get(idx));
      });

      const uiFields = {
        documentNumber: getUiValue(["Số quyết định / số văn bản", "Số quyết định", "Số QĐ"]),
        issueDate: getUiValue(["Ngày ban hành", "Ngày ra quyết định"]),
        issuingAuthority: getUiValue(["Cơ quan ban hành"]),
        accused: uiAccusedList,
        "accused[0]": uiAccusedList[0] || null,
        fullName: uiFirstAccused.fullName || "",
        birthYear: uiFirstAccused.dateOfBirth || "",
        identityNumber: uiFirstAccused.identityNumber || "",
        occupation: uiFirstAccused.occupation || "",
        residence: uiFirstAccused.residence || "",
        charge: getUiValue(["Tội danh", "Về tội", "Có hành vi phạm tội"]),
        legalProvision: getUiValue(["Điều luật áp dụng"]),
      };

      console.log(`==============================\nMAPPING RESULT\n==============================\n`, finalRowsAndMulti);
      console.log(`Đặc biệt in riêng các trường:`);
      console.log(`- documentNumber:`, uiFields.documentNumber);
      console.log(`- issueDate:`, uiFields.issueDate);
      console.log(`- issuingAuthority:`, uiFields.issuingAuthority);
      console.log(`- accused:`, uiFields.accused);
      console.log(`- accused[0]:`, uiFields["accused[0]"]);
      console.log(`- fullName:`, uiFields.fullName);
      console.log(`- birthYear:`, uiFields.birthYear);
      console.log(`- identityNumber:`, uiFields.identityNumber);
      console.log(`- occupation:`, uiFields.occupation);
      console.log(`- residence:`, uiFields.residence);
      console.log(`- charge:`, uiFields.charge);
      console.log(`- legalProvision:`, uiFields.legalProvision);

      const isFieldLost = (beforeVal: any, afterVal: any): boolean => {
        if (beforeVal === null || beforeVal === undefined || beforeVal === "") return false;
        if (Array.isArray(beforeVal) && beforeVal.length === 0) return false;
        if (typeof beforeVal === 'object' && Object.keys(beforeVal).length === 0) return false;

        if (afterVal === null || afterVal === undefined || afterVal === "") return true;
        if (Array.isArray(afterVal) && afterVal.length === 0) return true;
        if (typeof afterVal === 'object' && Object.keys(afterVal).length === 0) return true;
        return false;
      };

      if (normalizedFields) {
        for (const key of Object.keys(normalizedFields)) {
          if (isFieldLost(normalizedFields[key], (uiFields as any)[key])) {
            console.log(`MẤT DỮ LIỆU Ở BƯỚC NORMALIZED → UI (Trường: ${key})`);
          }
        }
      }
    }

    return finalRowsAndMulti;

  } catch (e: any) {
    console.error("AI extraction failed:", e);
    // Yêu cầu 5: Không fallback âm thầm sang heuristic mà không thông báo
    if (e.message && e.message.includes("Chưa cấu hình Gemini API Key")) {
      const gotoSettings = confirm("Chưa tìm thấy Gemini API Key. Bạn có muốn xem hướng dẫn tạo Gemini API Key không?");
      if (gotoSettings) {
        window.history.pushState({}, '', '/knowledge/huong-dan-tao-gemini-api-key');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      // Trả về heuristic rows nhưng đánh dấu rõ đây là kết quả dự phòng
      return heuristicRows.map(r => ({
        ...r,
        note: r.note ? `${r.note} (Kết quả dự phòng - Thiếu API Key)` : "Kết quả dự phòng (Thiếu API Key)"
      }));
    }
    
    // Các lỗi khác
    return heuristicRows.map(r => ({
      ...r,
      note: r.note ? `${r.note} (Kết quả dự phòng - Lỗi AI)` : "Kết quả dự phòng (Lỗi AI)"
    }));
  }
}

export default function StructuredExtractionEditor({
  document,
  onBack,
  membershipRole,
  setActiveTab,
  userGeminiKey
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

  // Cấu hình Loại án
  const [caseType, setCaseType] = useState<CaseType>(() => {
    if (document.name?.toLowerCase().includes("hình sự") || document.name?.toLowerCase().includes("hinh su") || document.name?.toLowerCase().includes("khởi tố") || document.name?.toLowerCase().includes("khoi to")) {
      return "hinh_su";
    }
    if (document.name?.toLowerCase().includes("hành chính") || document.name?.toLowerCase().includes("hanh chinh")) {
      return "hanh_chinh";
    }
    return "dan_su";
  });

  // Trạng thái bảng trích xuất dữ liệu
  const [rows, setRows] = useState<ExtractionRow[]>([]);
  
  // Trạng thái thêm trường mới
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [newFieldNote, setNewFieldNote] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // Trạng thái nâng cấp PRO
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginFeatureName, setLoginFeatureName] = useState("");

  // Chạy bóc tách dữ liệu sử dụng mặc định
const handleExtract = async () => {
  const schema = defaultSchemas[caseType];
  const extracted = await runSchemaBasedExtraction(rawContentText, schema, caseType, userGeminiKey);
  setRows(extracted);
};

  useEffect(() => {
    handleExtract();
  }, [caseType, rawContentText]);

  // Khôi phục mặc định
  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục danh sách trường mặc định? Các chỉnh sửa sẽ bị ghi đè.")) {
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
    const key = caseType;
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
  }, [caseType]);

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
      const key = caseType;
      
      const caseTypeLabel = caseType === "dan_su" ? "Dân sự" : caseType === "hinh_su" ? "Hình sự" : caseType === "hanh_chinh" ? "Hành chính" : "Khác / Tùy chỉnh";

      const templateFields = rows.map((row) => ({
        label: row.name,
        key: generateKey(row.name)
      }));

      templates[key] = {
        name: `Mẫu - ${caseTypeLabel}`,
        caseType: caseType,
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
  const handleApplyTemplate = async () => {
    try {
      const stored = localStorage.getItem("lexocr_structured_templates");
      if (!stored) return;
      const templates = JSON.parse(stored);
      const key = caseType;
      const template = templates[key];
      if (!template || !template.fields) return;

      const templateFields: { label: string; key: string }[] = template.fields;
      const schema = templateFields.map((f: { label: string }) => f.label);
      const extracted = await runSchemaBasedExtraction(rawContentText, schema, caseType, userGeminiKey);
      
      setRows(extracted);
      alert("Đã áp dụng mẫu thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi áp dụng mẫu.");
    }
  };

  // Thêm trường mới
  const handleAddRow = () => {
    if (!newFieldName.trim()) return;
    const name = newFieldName.trim();
    // Nếu người dùng không nhập giá trị, thử trích xuất tự động
    let value = newFieldValue.trim();
    let confidence = "Thủ công";
    let note = newFieldNote.trim() || "Thêm thủ công bởi người dùng";
    
    if (!value) {
      const lines = rawContentText.split("\n");
      const extracted = extractValueForField(rawContentText, name, lines);
      if (extracted.value) {
        value = extracted.value;
        confidence = extracted.confidence;
        note = extracted.note;
      }
    }

    const newRow: ExtractionRow = {
      id: Date.now().toString(),
      name,
      value,
      confidence,
      note
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
    <div id="structured-extraction-view" className="space-y-6 w-full">
      {/* A. HEADER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-start space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-600 transition-colors cursor-pointer mt-1"
            title="Quay lại scanner để tải tài liệu khác"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-start">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 mr-2 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight uppercase">
                KẾT QUẢ TRÍCH XUẤT
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {document.name}
              </p>
            </div>
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
          <span>{membershipRole === "Pro" ? "Xuất bảng Excel" : "Xuất Excel PRO"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* B. PANEL CẤU HÌNH & XEM VĂN BẢN (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-100 pb-2">
              Thiết lập biểu mẫu nghiệp vụ
            </h3>

            <div className="space-y-2">
              {/* Chọn Loại án */}
              <div>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value as CaseType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="dan_su">Dân sự</option>
                  <option value="hinh_su">Hình sự</option>
                  <option value="hanh_chinh">Hành chính</option>
                  <option value="khac">Khác / Tùy chỉnh</option>
                </select>
              </div>

              {/* Quản lý mẫu trường dữ liệu */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveTemplate}
                  className="flex-1 bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-700 py-1.5 rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-transparent"
                  title="Lưu cấu trúc trường hiện tại làm mẫu"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Lưu mẫu</span>
                </button>
                <button
                  onClick={handleApplyTemplate}
                  disabled={!hasSavedTemplate}
                  className="flex-1 bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-700 py-1.5 rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed border border-transparent"
                  title={hasSavedTemplate ? "Áp dụng mẫu đã lưu" : "Chưa có mẫu nào được lưu"}
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  <span>Áp dụng mẫu</span>
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200/50 rounded-lg p-2.5 text-[11px] text-emerald-800 leading-relaxed font-semibold">
              AI sẽ tự động nhận diện biểu mẫu và trích xuất dữ liệu. Bạn chỉ cần kiểm tra lại trước khi xuất Excel.
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
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-1.5 uppercase">
                  <span>KẾT QUẢ TRÍCH XUẤT</span>
                </h4>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  Rà soát thông tin được bóc tách bằng bộ lọc heuristic Việt Nam. Bạn có thể sửa trực tiếp.
                </p>
              </div>

              <button
                onClick={handleReset}
                className="bg-white hover:bg-slate-50 text-slate-650 px-2.5 py-1.5 rounded border border-slate-350 text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                title="Khôi phục các trường ban đầu"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Khôi phục gốc</span>
              </button>
            </div>

            {/* Bảng Editable */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                    <th className="py-2 px-3 w-4/12">Tên trường</th>
                    <th className="py-2 px-2 w-6/12">Giá trị trích xuất</th>
                    <th className="py-2 px-1 w-1/12 text-center"></th>
                    <th className="py-2 px-1 w-1/12 text-center"></th>
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
                      <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-2 px-3 align-top">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleRowChange(row.id, "name", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 focus:bg-white rounded px-1.5 py-1 font-semibold text-slate-700"
                          />
                        </td>
                        <td className="py-2 px-2 align-top" style={{ verticalAlign: 'top' }}>
                          <AutoGrowingTextArea
                            value={row.value}
                            onChange={(e) => handleRowChange(row.id, "value", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 focus:bg-white rounded px-1.5 py-1 text-slate-800 font-medium leading-relaxed resize-none overflow-hidden min-h-[32px]"
                            style={{ display: 'block', alignSelf: 'stretch' }}
                          />
                        </td>
                        <td className="py-2 px-1 text-center align-top">
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            <button
                              onClick={() => handleMoveUp(row.id)}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-100 rounded transition-all cursor-pointer disabled:cursor-not-allowed"
                              title="Di chuyển lên"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(row.id)}
                              disabled={index === rows.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-100 rounded transition-all cursor-pointer disabled:cursor-not-allowed"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-1 text-center align-top">
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 mt-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
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
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <button
                onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-slate-650 text-slate-650 uppercase tracking-wide cursor-pointer hover:text-slate-800 transition-colors"
              >
                <div className="flex items-center space-x-1.5">
                  <Plus className="h-3.5 w-3.5 text-slate-500" />
                  <span>Thêm trường dữ liệu bổ sung</span>
                </div>
                {isAddFormOpen ? <ArrowUp className="h-3.5 w-3.5 text-slate-500" /> : <ArrowDown className="h-3.5 w-3.5 text-slate-500" />}
              </button>
              
              {isAddFormOpen && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">
                        Tên trường
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Tình trạng sức khỏe..."
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-750 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">
                        Giá trị
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Bình thường..."
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-750 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddRow}
                      disabled={!newFieldName.trim()}
                      className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded text-[11px] font-bold flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Xác nhận</span>
                    </button>
                  </div>
                </div>
              )}
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