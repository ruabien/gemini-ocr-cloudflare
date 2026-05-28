/**
 * Thuật toán nối dòng thông minh (Smart Line Join) và chuẩn hóa văn bản OCR.
 * @param {string} text - Văn bản trích xuất gốc.
 * @returns {string} Văn bản đã được làm sạch ngắt dòng.
 */
export const cleanTextNewlines = (text) => {
  if (!text) return "";
  return text
    .replace(/\r\n/g, '\n')
    // Loại bỏ các dòng không có chữ mà chỉ chứa khoảng trắng hoặc tab
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('\n')
    // Khử dòng trống liên tiếp thành duy nhất 1 dấu xuống dòng
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

export const normalizeOcrText = (text) => {
  if (!text) return "";
  
  // Chuẩn hóa dấu xuống dòng thành \n
  let normalized = text.replace(/\r\n/g, '\n');
  
  // Tách các đoạn văn bằng dấu xuống dòng kép để bảo toàn các đoạn văn thực sự
  const paragraphs = normalized.split(/\n{2,}/);
  
  const processedParagraphs = paragraphs.map(paragraph => {
    // Tách các dòng trong đoạn, loại bỏ khoảng trắng thừa
    const lines = paragraph.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    
    let result = [lines[0]];
    
    for (let i = 1; i < lines.length; i++) {
      const prevLine = result[result.length - 1];
      const currentLine = lines[i];
      const lastChar = prevLine[prevLine.length - 1];
      
      // Các ký tự kết thúc câu phổ biến
      const isSentenceEnd = ['.', '?', '!', ':'].includes(lastChar);
      
      // Kiểm tra cấu trúc tiêu đề điều khoản (ví dụ: "1.", "a)", "Điều 1:")
      // Hoặc dòng hiện tại/trước đó bắt đầu bằng tiêu đề mục
      const isHeaderPattern = /^(?:Điều\s+\d+|[I|V|X]+\.|\d+\.|\w\))\s+/i.test(currentLine) || 
                              /^(?:Điều\s+\d+|[I|V|X]+\.|\d+\.|\w\))\s+/i.test(prevLine) ||
                              /^[-\u2022]\s+/.test(currentLine);
                              
      if (isSentenceEnd || isHeaderPattern) {
        // Giữ lại hoặc tạo dấu xuống dòng đơn (\n) để các dòng đứng sát nhau
        result.push('\n');
        result.push(currentLine);
      } else {
        // Nối dòng bằng khoảng trắng
        result[result.length - 1] = prevLine + ' ' + currentLine;
      }
    }
    
    return result.join('');
  });
  
  // Gộp các đoạn văn lại bằng dấu xuống dòng đơn và làm sạch
  const joinedText = processedParagraphs.filter(Boolean).join('\n');
  return cleanTextNewlines(joinedText);
};
