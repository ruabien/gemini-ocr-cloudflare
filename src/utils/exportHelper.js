import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Clean and export text to a TXT file (maintaining Unicode UTF-8 with BOM).
 * @param {string} text - Raw text to export
 * @param {string} filename - Target filename
 */
export function exportTxt(text, filename) {
  if (!text) {
    throw new Error("Không có nội dung để xuất file.");
  }
  const cleanText = text.replace(/<!--[\s\S]*?-->/g, '').replace(/\[IMAGE_PLACEHOLDER:.*?\]/g, '');
  const blob = new Blob(['\ufeff' + cleanText], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
}

/**
 * Clean and export text to a Markdown file.
 * @param {string} text - Raw text to export
 * @param {string} filename - Target filename
 */
export function exportMarkdown(text, filename) {
  if (!text) {
    throw new Error("Không có nội dung để xuất file.");
  }
  const cleanText = text.replace(/<!--[\s\S]*?-->/g, '').replace(/\[IMAGE_PLACEHOLDER:.*?\]/g, '');
  const blob = new Blob(['\ufeff' + cleanText], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, filename);
}

/**
 * Export OCR text and assets to a professional DOCX file using direct docx import.
 * @param {string|Array} textOrPages - OCR text or array of { text, imageFile }
 * @param {string} filename - Output file name
 * @param {object} options - Export options (e.g. { wordNd30: true })
 */
export async function exportDocx(textOrPages, filename, options = {}) {
  let text = "";
  if (typeof textOrPages === 'string') {
    text = textOrPages;
  } else if (Array.isArray(textOrPages)) {
    // Merge all pages with newlines
    text = textOrPages.map(p => p.text).join('\n');
  } else {
    throw new Error("Dữ liệu đầu vào không hợp lệ để xuất DOCX.");
  }

  // Clean HTML comment blocks and image placeholders
  let cleanedText = text.replace(/<!--[\s\S]*?-->/g, '');
  cleanedText = cleanedText.replace(/\[IMAGE_PLACEHOLDER:.*?\]/g, '');

  // Split cleaned text into separate lines and map to Paragraphs with formatted TextRuns
  const docParagraphs = cleanedText.split('\n').map(line => {
    const runs = [];
    // Regex quét toàn bộ các cụm **đậm** và *nghiêng* toàn cục
    const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];

      // 1. Thêm đoạn văn bản thường trước từ khóa (nếu có)
      if (matchIndex > lastIndex) {
        runs.push(new TextRun({
          text: line.substring(lastIndex, matchIndex),
          font: "Times New Roman",
          size: 28
        }));
      }

      // 2. Xử lý đoạn text định dạng được tìm thấy
      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        runs.push(new TextRun({
          text: matchText.slice(2, -2), // Cắt bỏ 2 dấu sao
          bold: true,
          font: "Times New Roman",
          size: 28
        }));
      } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
        runs.push(new TextRun({
          text: matchText.slice(1, -1), // Cắt bỏ 1 dấu sao
          italic: true,
          font: "Times New Roman",
          size: 28
        }));
      }

      lastIndex = regex.lastIndex;
    }

    // 3. Thêm đoạn văn bản thường còn sót lại ở cuối dòng (nếu có)
    if (lastIndex < line.length) {
      runs.push(new TextRun({
        text: line.substring(lastIndex),
        font: "Times New Roman",
        size: 28
      }));
    }

    // Nếu dòng trống, tạo một dòng trống để giãn dòng
    if (runs.length === 0) {
      runs.push(new TextRun({ text: "" }));
    }

    // Khởi tạo Paragraph chứa mảng các cụm chữ đã chẻ nhỏ
    return new Paragraph({
      children: runs,
      alignment: AlignmentType.JUSTIFIED, // Căn đều 2 bên
      spacing: { before: 120, after: 120 } // Khoảng cách đoạn 6pt
    });
  });

  // Construct Document with Decree 30 margins
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { 
            top: 1134,    // 20mm
            bottom: 1134, // 20mm
            left: 1701,   // 30mm (for binding judicial dossier)
            right: 1134   // 20mm
          }
        }
      },
      children: docParagraphs
    }]
  });

  // Pack the OpenXML file using Packer
  const blob = await Packer.toBlob(doc);
  const mimeBlob = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  saveAs(mimeBlob, filename);
}
