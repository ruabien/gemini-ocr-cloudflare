/**
 * Spacing and Punctuation normalization module.
 *
 * Implements Step 8:
 *   - No 2 consecutive spaces.
 *   - No space before: , . : ; )
 *   - Exactly one space after punctuation marks (except when ending a line or followed by another punctuation).
 *
 * Implements Step 9:
 *   - Chuẩn hóa dấu ngoặc: (Nay là... hoặc (nay là... -> giữ nguyên case.
 *   - Đảm bảo đúng khoảng trắng cho dấu ngoặc.
 */

export function normalizeSpacingAndPunctuation(text: string): string {
  const lines = text.split(/\r?\n/);
  const result: string[] = [];

  for (let line of lines) {
    if (line.trim() === "") {
      result.push("");
      continue;
    }

    // Step 8.1: Remove consecutive spaces. Tabs and newlines were mostly handled or we normalize spaces.
    let currentLine = line.replace(/[\t ]+/g, " ");

    // Step 8.2: No space before , . : ; )
    // Also handling closing quotes ”
    currentLine = currentLine.replace(/\s+([,.:;)\”])/g, "$1");

    // Step 8.3: Exactly one space after punctuation ( , . : ; ) if followed by word characters or numbers.
    // E.g., "a,b" -> "a, b". "a.b" -> "a. b" (Except for numbers like 1.000 or 1,5, handled carefully).
    // To safely handle numbers (e.g. 5.000 or 1,5), we only add space if followed by a letter.
    // Note: Vietnamese upper/lower chars are matched using Unicode property escapes if possible, or a basic A-Z match
    // since `docxTextNormalizer` also handles it.
    // For simplicity, we add space if followed by letter.
    currentLine = currentLine.replace(/([,.:;])([A-Za-zĐÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴđáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ])/g, "$1 $2");

    // Specific case for closing parenthesis followed by a letter (e.g. ")Nay" -> ") Nay")
    currentLine = currentLine.replace(/(\))([A-Za-zĐÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴđáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ])/g, "$1 $2");

    // Step 9: Normalize parenthesis spacing
    // Ensure no space right after opening parenthesis '('
    currentLine = currentLine.replace(/\(\s+/g, "(");
    // Ensure space before '(' if preceded by a letter/number
    currentLine = currentLine.replace(/([^\s(])\(/g, "$1 (");

    // Ensure no space right before closing parenthesis ')' -> already handled in 8.2

    // Final trim just in case
    result.push(currentLine.trim());
  }

  return result.join("\n");
}