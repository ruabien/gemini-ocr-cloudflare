/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Docx Text Normalizer
 *
 * Provides utilities to normalize OCR'd Vietnamese legal text for DOCX export.
 * - Merges broken lines according to configurable rules.
 * - Preserves legal structure (headings, list items, signatures, etc.).
 * - Exposes helper predicates used by server-side export logic.
 */

export interface DocxNormalizeOptions {
  /** Merge lines that have been broken by OCR between sentences. */
  mergeBrokenLines: boolean;
  /** Preserve legal structure (headings, list items, signatures, etc.) without merging. */
  preserveLegalStructure: boolean;
}

/**
 * Default options:
 *   mergeBrokenLines = false
 *   preserveLegalStructure = true
 */
export const defaultOptions: DocxNormalizeOptions = {
  mergeBrokenLines: false,
  preserveLegalStructure: true,
};

/* -------------------------------------------------------------------------- */
/* Helper predicates – used both in the front‑end UI and back‑end export API  */
/* -------------------------------------------------------------------------- */

/**
 * A. Quốc hiệu / tiêu ngữ
 */
export function isQuocHieuTieuNgu(line: string): boolean {
  const txt = line.trim().toUpperCase();
  const patterns = [
    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", // duplicate for safety
    "ĐỘC LẬP - TỰ DO - HẠNH PHÚC",
    "ĐỘC LẬP - TỰ DO - HẠNH PHÚC",
    "CỘNG HÒA",
    "ĐỘC LẬP",
    "TỰ DO",
    "HẠNH PHÚC",
  ];
  return patterns.some(p => txt === p);
}

/**
 * B. Cơ quan ban hành
 */
export function isCoQuanBanHanh(line: string): boolean {
  const txt = line.trim().toUpperCase();
  const keywords = [
    "TÒA ÁN",
    "VIỆN KIỂM SÁT",
    "ỦY BAN NHÂN DÂN",
    "UBND",
    "CƠ QUAN CẢNH SÁT",
  ];
  return keywords.some(k => txt.startsWith(k));
}

/**
 * C. Tiêu đề văn bản
 */
export function isTieuDeVanBan(line: string): boolean {
  const txt = line.trim().toUpperCase();
  const titles = [
    "THÔNG BÁO",
    "BIÊN BẢN",
    "QUYẾT ĐỊNH",
    "BẢN ÁN",
    "CÁO TRẠNG",
    "KẾT LUẬN ĐIỀU TRA",
  ];
  return titles.some(t => txt.startsWith(t));
}

/**
 * D. Mục / Tiểu mục (list prefixes)
 */
export function isMucTieuMuc(line: string): boolean {
  const txt = line.trim();
  // Roman numerals, digits, letters with parenthesis, dash, plus
  const patterns = [
    /^[IVXLCDM]+\.\s*/,   // I., II., III. etc.
    /^\d+\.\s*/,          // 1., 2., 3.
    /^[a-z]\)\s*/,        // a) b) c)
    /^[a-z]\.\s*/,        // a. b. c.
    /^[-+]\s*/,           // - , +
  ];
  return patterns.some(p => p.test(txt));
}

/**
 * E. Nhãn pháp lý / ký tên
 */
export function isKyTen(line: string): boolean {
  const txt = line.trim().toUpperCase();
  const labels = [
    "KÍNH GỬI",
    "NGUYÊN ĐƠN",
    "BỊ ĐƠN",
    "NGƯỜI CÓ QUYỀN LỢI",
    "NGƯỜI ĐẠI DIỆN",
    "BỊ CAN",
    "BỊ CÁO",
    "NGƯỜI BỊ HẠI",
    "ĐỊA CHỈ",
    "NƠI CƯ TRÚ",
    "THƯỜNG TRÚ",
    "TẠM TRÚ",
    "THEO ĐƠN",
    "KÈM THEO",
    "NƠI NHẬN",
    "THẨM PHÁN",
    "KIỂM SÁT VIÊN",
    "CHỦ TỌA",
    "NGƯỜI LẬP BIÊN BẢN",
    "ĐÃ KÝ",
    "NGƯỜI LẬP BIÊN BẢN",
    "NGƯỜI LẬP",
    "KÝ TÊN",
  ];
  return labels.some(l => txt.startsWith(l));
}

/**
 * F. All‑caps line (or near‑all caps)
 */
export function isAllUpper(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Count letters
  const letters = trimmed.replace(/[^A-Za-zÁÀÂÃĐÊÉÍÔÕÚĂ...]/g, "");
  const upperCount = letters.replace(/[^A-ZÁÀÂÃĐÊÉÍÔÕÚĂ...]/g, "").length;
  // Consider near‑all caps if >80% letters are uppercase
  return letters.length > 0 && upperCount / letters.length >= 0.8;
}

/* -------------------------------------------------------------------------- */
/* Core normalizer                                                            */
/* -------------------------------------------------------------------------- */

export function normalizeTextForDocx(
  input: string,
  options?: Partial<DocxNormalizeOptions>
): string {
  const opts: DocxNormalizeOptions = {
    ...defaultOptions,
    ...options,
  };

  // 1. Chuẩn hóa line ending \r\n -> \n và loại bỏ khoảng trắng thừa đầu/cuối mỗi dòng
  const rawLines = input.split(/\r?\n/).map((line) => line.trim());

  // 2. Nếu KHÔNG được phép gộp dòng, chỉ trả về văn bản đã chuẩn hóa khoảng trắng/xuống dòng
  if (!opts.mergeBrokenLines) {
    return rawLines.join("\n");
  }

  const resultLines: string[] = [];

  let i = 0;
  while (i < rawLines.length) {
    let line = rawLines[i];
    const trimmed = line.trim();

    // Preserve empty lines as paragraph separators
    if (trimmed === "") {
      resultLines.push("");
      i++;
      continue;
    }

    // If we must preserve legal structure, do NOT merge this line with the next
    if (opts.preserveLegalStructure) {
      const currentIsHeading =
        isQuocHieuTieuNgu(line) ||
        isCoQuanBanHanh(line) ||
        isTieuDeVanBan(line) ||
        isSoHieu(line);

      const nextLine = rawLines[i + 1] ?? "";
      const nextIsHeading =
        isQuocHieuTieuNgu(nextLine) ||
        isCoQuanBanHanh(nextLine) ||
        isTieuDeVanBan(nextLine) ||
        isSoHieu(nextLine);

      const nextIsList = isMucTieuMuc(nextLine);
      const nextIsLegal = isKyTen(nextLine);
      const nextAllUpper = isAllUpper(nextLine);

      // Stop merging if current line ends with terminal punctuation
      const endsWithPunct = /[.:;!?)]$|”$/.test(trimmed);
      if (endsWithPunct) {
        resultLines.push(line);
        i++;
        continue;
      }

      // Do not merge if current line is short (≤25 chars)
      if (trimmed.length <= 25) {
        resultLines.push(line);
        i++;
        continue;
      }

      // Do not merge if the next line is a heading, list item, legal label, or all‑caps
      if (nextIsHeading || nextIsList || nextIsLegal || nextAllUpper) {
        resultLines.push(line);
        i++;
        continue;
      }
    }

    // Perform merging with subsequent lines while conditions allow it
    while (i + 1 < rawLines.length) {
      const next = rawLines[i + 1];
      const nextTrim = next.trim();

      // Stop if next is empty – it signals a paragraph break
      if (nextTrim === "") break;

      // Do not merge if next line is a heading / list / legal label / all‑caps
      if (
        isQuocHieuTieuNgu(next) ||
        isCoQuanBanHanh(next) ||
        isTieuDeVanBan(next) ||
        isSoHieu(next) ||
        isMucTieuMuc(next) ||
        isKyTen(next) ||
        isAllUpper(next)
      ) {
        break;
      }

      // Do not merge if current line ends with punctuation
      if (/[.:;!?)]$|”$/.test(line.trim())) break;

      // Merge the next line
      line = line.trimEnd() + " " + nextTrim;
      i++; // advance pointer past the merged line
    }

    resultLines.push(line);
    i++;
  }

  // Join with standard newline
  return resultLines.join("\n");
}

/**
 * Detects a document/section number line, e.g. "Số: 042/QĐ‑STC" or "Số 112/2024/QĐ‑TLDS".
 */
export function isSoHieu(line: string): boolean {
  const txt = line.trim().toUpperCase();
  // Look for "SỐ" followed by optional punctuation and then a mix of numbers/letters/slash/dash
  return /^SỐ[:\s]*[0-9A-Z\/\-\.\s]+$/i.test(txt);
}

export function flattenTextForManualLineBreak(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
