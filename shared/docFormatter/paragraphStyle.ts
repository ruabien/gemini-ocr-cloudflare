/**
 * Paragraph Style module.
 *
 * Implements logic to classify a paragraph and determine its styles:
 * - isHeadingPhapLy (Heading pháp lý)
 * - isHeadingToanChuHoa (Heading toàn chữ hoa)
 * - isMucSoCap1 (Mục số cấp 1: 1., 2., 3.)
 */

export function isHeadingPhapLy(line: string): boolean {
  const trimmed = line.trim();
  // We consider "Điều", "Khoản", "Mục", "Phần", "Chương" etc. as legal headings
  const prefixes = ["Điều", "Phần", "Chương", "Mục", "Khoản", "Thứ"];
  return prefixes.some((p) => trimmed.startsWith(p + " "));
}

export function isHeadingToanChuHoa(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const upper = trimmed.toUpperCase();
  if (trimmed !== upper) return false;
  
  // Specific large titles that should be centered
  const largeTitles = [
    "BẢN ÁN",
    "QUYẾT ĐỊNH",
    "THÔNG BÁO",
    "BIÊN BẢN",
    "CÁO TRẠNG",
    "KẾT LUẬN"
  ];
  return largeTitles.some(title => upper === title || upper.startsWith(title + " ") || upper.startsWith(title + ".") || upper.startsWith(title + ":"));
}

export function isMucSoCap1(line: string): boolean {
  const trimmed = line.trim();
  return /^\d+\.(?:\s|$)/.test(trimmed);
}

export function isRomanNumeral(line: string): boolean {
  const trimmed = line.trim();
  return /^[IVXLCDM]+\.(?:\s|$)/i.test(trimmed);
}