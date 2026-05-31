import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';

/**
 * Helper to download a Blob object on the client side and clean up memory immediately
 * to prevent memory leaks with large files.
 * @param {Blob} blob - The blob data to download
 * @param {string} filename - Output file name
 */
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Clean and export text to a TXT file (maintaining Unicode UTF-8 with BOM).
 * @param {string} text - Raw text to export
 * @param {string} filename - Target filename
 */
export function exportTxt(text, filename) {
  if (!text) {
    throw new Error("Không có nội dung để xuất file.");
  }
  const cleanText = text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[IMAGE_PLACEHOLDER:.*?\]/g, '');
  const blob = new Blob(['\ufeff' + cleanText], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}

/**
 * Chuyển đổi và định dạng văn bản OCR thô thành văn bản Markdown có cấu trúc
 * @param {string} text - Văn bản gốc
 * @param {object} metadata - Thông tin siêu dữ liệu
 * @param {object} options - Các tùy chọn bổ sung
 * @returns {string} Văn bản Markdown đã định dạng
 */
export function formatTextToMarkdown(text, metadata = {}) {
  if (!text) return '';

  // 1. Clean HTML comment blocks and image placeholders
  let cleanedText = text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[IMAGE_PLACEHOLDER:.*?\]/g, '');

  const rawLines = cleanedText.split(/\r?\n/);
  const formattedLines = [];

  // Helper functions
  const isAllUppercase = (str) => {
    const trimmed = str.trim();
    if (!trimmed) return false;
    // Phải chứa ít nhất một chữ cái (tiếng Việt hoặc tiếng Anh)
    if (!/[a-zA-ZĂÂĐÊÔƠƯÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬẾỀỂỄỆỐỒỔỖỘỚỜỞỠỢỨỪỬỮỰ]/.test(trimmed)) {
      return false;
    }
    // Không kết thúc bằng dấu chấm, phẩy, hỏi, hoặc cảm thán của một câu văn thường
    if (/[.,?!]$/.test(trimmed)) {
      return false;
    }
    if (trimmed.length > 150) {
      return false;
    }
    return trimmed === trimmed.toUpperCase();
  };

  const isDieuHeader = (str) => {
    return /^Điều\s+\d+/i.test(str.trim());
  };

  const isMarkdownHeader = (str) => {
    return /^#+\s+/.test(str.trim());
  };

  const isNumberedList = (str) => {
    return /^\d+\.\s+/.test(str.trim());
  };

  const isLetterList = (str) => {
    return /^[a-zđ]\)\s+/i.test(str.trim());
  };

  const isBulletList = (str) => {
    return /^[-*+]\s+/.test(str.trim());
  };

  // Build metadata block
  const metaLines = [];
  metaLines.push('# Kết quả OCR');
  metaLines.push('');
  metaLines.push('## Thông tin xử lý');
  metaLines.push(`- Tệp gốc: ${metadata.fileName || 'N/A'}`);
  metaLines.push(`- Engine: ${metadata.engine || 'Gemini'}`);
  metaLines.push(`- Thời gian: ${metadata.duration ? metadata.duration + 's' : 'N/A'}`);
  metaLines.push(`- Số ký tự: ${metadata.charCount || text.length}`);
  metaLines.push(`- Chế độ OCR: ${metadata.ocrMode || 'Mặc định'}`);
  metaLines.push('');
  metaLines.push('## Nội dung OCR');
  metaLines.push('');

  let lastAddedType = 'empty'; // 'empty', 'heading', 'list-item', 'paragraph'

  const addLine = (lineText, type) => {
    formattedLines.push(lineText);
    lastAddedType = type;
  };

  const addEmptyLine = () => {
    if (lastAddedType !== 'empty') {
      formattedLines.push('');
      lastAddedType = 'empty';
    }
  };

  // Check if it's a single long line (e.g. paragraph without line breaks)
  const isSingleLongLine = rawLines.length <= 2 && cleanedText.length > 200;
  if (isSingleLongLine) {
    addEmptyLine();
    addLine(cleanedText.trim(), 'paragraph');
  } else {
    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i];
      const trimmed = rawLine.trim();

      if (!trimmed) {
        addEmptyLine();
        continue;
      }

      if (isMarkdownHeader(trimmed)) {
        addEmptyLine();
        addLine(trimmed, 'heading');
      } else if (isDieuHeader(trimmed)) {
        addEmptyLine();
        addLine(`### ${trimmed}`, 'heading');
      } else if (isAllUppercase(trimmed)) {
        addEmptyLine();
        addLine(`## ${trimmed}`, 'heading');
      } else if (isLetterList(trimmed)) {
        if (lastAddedType !== 'list-item') {
          addEmptyLine();
        }
        addLine(`   - ${trimmed}`, 'list-item');
      } else if (isNumberedList(trimmed) || isBulletList(trimmed)) {
        if (lastAddedType !== 'list-item') {
          addEmptyLine();
        }
        addLine(trimmed, 'list-item');
      } else {
        addEmptyLine();
        addLine(trimmed, 'paragraph');
      }
    }
  }

  return metaLines.join('\n') + formattedLines.join('\n');
}

/**
 * Clean and export text to a Markdown file.
 * @param {string} text - Raw text to export
 * @param {string} filename - Target filename
 * @param {object} metadata - Siêu dữ liệu bổ sung
 */
export function exportMarkdown(text, filename, metadata = {}) {
  if (!text) {
    throw new Error("Không có nội dung để xuất file.");
  }
  const formattedMarkdown = formatTextToMarkdown(text, metadata);
  const blob = new Blob(['\ufeff' + formattedMarkdown], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, filename);
}

/**
 * Export OCR text and assets to a professional DOCX file using direct docx import.
 * Optimized with traditional for-loops, node reduction, and immediate Blob cleanup.
 * @param {string|Array} textOrPages - OCR text or array of { text, imageFile }
 * @param {string} filename - Output file name
 * @param {object} options - Export options (e.g. { wordNd30: true })
 */
export async function exportDocx(textOrPages, filename) {
  let text;
  if (typeof textOrPages === 'string') {
    text = textOrPages;
  } else if (Array.isArray(textOrPages)) {
    // Merge all pages with newlines using traditional loop for speed
    const pagesCount = textOrPages.length;
    const pagesTextArray = [];
    for (let i = 0; i < pagesCount; i++) {
      pagesTextArray.push(textOrPages[i].text || '');
    }
    text = pagesTextArray.join('\n');
  } else {
    throw new Error("Dữ liệu đầu vào không hợp lệ để xuất DOCX.");
  }

  // Clean HTML comment blocks and image placeholders
  let cleanedText = text.replace(/<!--[\s\S]*?-->/g, '');
  cleanedText = cleanedText.replace(/\[IMAGE_PLACEHOLDER:.*?\]/g, '');

  const lines = cleanedText.split('\n');
  const linesCount = lines.length;
  const docParagraphs = [];

  // Optimized traditional for loop to avoid array .map allocations and speed up execution
  for (let i = 0; i < linesCount; i++) {
    const line = lines[i];
    const runs = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];

      // 1. Add normal text before the matched formatted token
      if (matchIndex > lastIndex) {
        const textVal = line.substring(lastIndex, matchIndex);
        if (textVal) {
          runs.push(new TextRun({
            text: textVal,
            font: "Times New Roman",
            size: 28
          }));
        }
      }

      // 2. Process formatted text run
      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        const textVal = matchText.slice(2, -2);
        if (textVal) {
          runs.push(new TextRun({
            text: textVal,
            bold: true,
            font: "Times New Roman",
            size: 28
          }));
        }
      } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
        const textVal = matchText.slice(1, -1);
        if (textVal) {
          runs.push(new TextRun({
            text: textVal,
            italic: true,
            font: "Times New Roman",
            size: 28
          }));
        }
      }

      lastIndex = regex.lastIndex;
    }

    // 3. Add remaining normal text after the last match
    if (lastIndex < line.length) {
      const textVal = line.substring(lastIndex);
      if (textVal) {
        runs.push(new TextRun({
          text: textVal,
          font: "Times New Roman",
          size: 28
        }));
      }
    }

    // If paragraph is empty, add a single empty TextRun to preserve the empty line spacing
    if (runs.length === 0) {
      runs.push(new TextRun({ text: "" }));
    }

    // Construct Paragraph with Decree 30 margins and spacing config
    docParagraphs.push(new Paragraph({
      children: runs,
      alignment: AlignmentType.JUSTIFIED,
      spacing: { 
        before: 120, // 6 pt
        after: 120   // 6 pt
      }
    }));
  }

  // Construct Document with Decree 30 margins
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { 
            top: 1134,    // 20mm
            bottom: 1134, // 20mm
            left: 1701,   // 30mm
            right: 1134   // 20mm
          }
        }
      },
      children: docParagraphs
    }]
  });

  // Pack and download with automated cleanup
  const blob = await Packer.toBlob(doc);
  const mimeBlob = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  downloadBlob(mimeBlob, filename);
}

/**
 * Xuất dữ liệu trích xuất ra file Excel (.xlsx)
 * @param {Array} rows - Mảng chứa dữ liệu các file, mỗi file là một đối tượng chứa các giá trị trích xuất
 * @param {Array} fields - Mảng các trường cấu hình
 * @param {string} filename - Tên file xuất ra
 * @param {boolean} includeFileName - Có thêm cột Tên file ở đầu hay không
 */
export function exportToExcel(rows, fields, filename = 'Du_lieu_trich_xuat.xlsx', includeFileName = false) {
  // Sắp xếp các trường theo thứ tự
  const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Tạo mảng dữ liệu cho SheetJS
  const headers = [];
  if (includeFileName) {
    headers.push('Tên tệp');
  }
  sortedFields.forEach(f => {
    headers.push(f.label || f.id);
  });

  const sheetData = [headers];

  rows.forEach(row => {
    const rowData = [];
    if (includeFileName) {
      rowData.push(row._fileName || 'N/A');
    }
    sortedFields.forEach(f => {
      let val = row[f.id];
      if (val === undefined || val === null) {
        val = '';
      }
      rowData.push(val);
    });
    sheetData.push(rowData);
  });

  // Tạo worksheet và workbook
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Du lieu trich xuat');
  
  // Ghi file
  XLSX.writeFile(workbook, filename);
}
