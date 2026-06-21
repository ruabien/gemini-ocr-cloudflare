const ocrText = `Nguyên đơn: Ông Đỗ Thanh H**, sinh năm 1974
Địa chỉ: 746 đường 30/4, phường Hưng Lợi, quận Ninh Kiều, thành phố Cần Thơ.
Người đại diện theo ủy quyền: **Ông Vũ Thế Binh**, sinh năm 1976
Địa chỉ: Ấp Bến Tràm, xã Cửa Dương, thành phố Phú Quốc, tỉnh Kiên Giang.

Bị đơn: Ông Võ Ngọc Hùng**, sinh năm 1956
Địa chỉ: 146A4/19 tổ 19, khu vực 1, phường An Khánh, quận Ninh Kiều, thành phố Cần Thơ.`;

function extractRoleBlock(
  text,
  startLabels,
  stopLabels
) {
  if (!text) return "";

  let startIdx = -1;
  let matchedStartLen = 0;

  for (const label of startLabels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedLabel, "i");
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
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedLabel, "i");
    const match = remainingText.match(regex);
    if (match && match.index !== undefined) {
      if (match.index < stopIdx) {
        stopIdx = match.index;
      }
    }
  }

  return remainingText.substring(0, stopIdx).trim();
}

function removeRepresentativeSegments(block) {
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

function cleanPersonSegment(segment) {
  let cleaned = segment.replace(/^[\s,;:\-\*\u2022\d\.\)\(]+/g, "").trim();
  if (!cleaned) return "";

  const addrRegex = /(?:địa\s+chỉ|nơi\s+cư\s+trú|trụ\s+sở|đkhktt|địa\s+chỉ\s+tại)\s*[:\-]?\s*/i;
  const addrMatch = cleaned.match(addrRegex);

  let infoPart = "";
  let addrPart = "";

  if (addrMatch && addrMatch.index !== undefined) {
    infoPart = cleaned.substring(0, addrMatch.index).trim();
    addrPart = cleaned.substring(addrMatch.index + addrMatch[0].length).trim();
  } else {
    infoPart = cleaned;
  }

  const formatPart = (p) => {
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

function extractPersonsFromRoleBlock(block) {
  if (!block) return [];

  let cleanBlock = block.replace(/\*\*/g, "").replace(/^[:\-\s,;]+/, "").trim();

  const starterRegex = /(?:^|[\r\n]+|;)\s*(?:\d+[\.\)\-]\s*|[\-\*\u2022]\s*)?(Ông|Bà|Anh|Chị|Công\s+ty|Hộ\s+gia\s+đình|Cơ\s+quan|Tổ\s+chức)\b/ig;
  
  const matches = [];
  let match;
  while ((match = starterRegex.exec(cleanBlock)) !== null) {
    matches.push({ index: match.index, length: match[0].length });
  }

  if (matches.length === 0) {
    const trimmed = cleanBlock.trim();
    const cleaned = trimmed ? cleanPersonSegment(trimmed) : "";
    return cleaned ? [cleaned] : [];
  }

  const segments = [];
  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].index;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : cleanBlock.length;
    const segment = cleanBlock.substring(startIdx, endIdx).trim();
    if (segment) {
      segments.push(segment);
    }
  }

  const result = [];
  for (const seg of segments) {
    const cleaned = cleanPersonSegment(seg);
    if (cleaned) {
      result.push(cleaned);
    }
  }

  return result;
}

const nguyenDonBlock = extractRoleBlock(ocrText, ["Nguyên đơn", "Người khởi kiện"], ["Bị đơn", "Người bị kiện", "Người có quyền", "Người liên quan", "Quan hệ pháp luật", "Thẩm phán", "Thời hạn"]);
const biDonBlock = extractRoleBlock(ocrText, ["Bị đơn", "Người bị kiện"], ["Người có quyền", "Người liên quan", "Quan hệ pháp luật", "Thẩm phán", "Thời hạn", "Nội dung", "Theo đơn", "Căn cứ"]);

console.log("--- NGUYÊN ĐƠN BLOCK ---");
console.log(nguyenDonBlock);
console.log("--- NGUYÊN ĐƠN BLOCK CLEANED ---");
const cleanedNguyenDonBlock = removeRepresentativeSegments(nguyenDonBlock);
console.log(cleanedNguyenDonBlock);
console.log("--- NGUYÊN ĐƠN PERSONS ---");
console.log(extractPersonsFromRoleBlock(cleanedNguyenDonBlock));

console.log("\n--- BỊ ĐƠN BLOCK ---");
console.log(biDonBlock);
console.log("--- BỊ ĐƠN BLOCK CLEANED ---");
const cleanedBiDonBlock = removeRepresentativeSegments(biDonBlock);
console.log(cleanedBiDonBlock);
console.log("--- BỊ ĐƠN PERSONS ---");
console.log(extractPersonsFromRoleBlock(cleanedBiDonBlock));