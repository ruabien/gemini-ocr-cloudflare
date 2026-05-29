import { saveAs } from 'file-saver';

// Helper to access docx library loaded from CDN via window.docx
const getDocxLib = () => {
  if (typeof window !== 'undefined' && window.docx) {
    return window.docx;
  }
  throw new Error("Thư viện docx.js chưa được tải hoàn tất từ CDN.");
};

/**
 * Clean and export text to a TXT file (maintaining Unicode UTF-8 with BOM).
 * @param {string} text - Raw text to export
 * @param {string} filename - Target filename
 */
export function exportTxt(text, filename) {
  if (!text) {
    throw new Error("Không có nội dung để xuất file.");
  }
  const cleanText = text.replace(/<!--[\s\S]*?-->/g, '');
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
  const cleanText = text.replace(/<!--[\s\S]*?-->/g, '');
  const blob = new Blob(['\ufeff' + cleanText], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, filename);
}

/**
 * Export OCR text and assets to a professional DOCX file using window.docx.
 * @param {string|Array} textOrPages - OCR text or array of { text, imageFile }
 * @param {string} filename - Output file name
 * @param {object} options - Export options (e.g. { wordNd30: true })
 */
export async function exportDocx(textOrPages, filename, options = {}) {
  const { Document, Packer, Paragraph, TextRun } = getDocxLib();

  let text = "";
  if (typeof textOrPages === 'string') {
    text = textOrPages;
  } else if (Array.isArray(textOrPages)) {
    // Merge all pages with newlines
    text = textOrPages.map(p => p.text).join('\n');
  } else {
    throw new Error("Dữ liệu đầu vào không hợp lệ để xuất DOCX.");
  }

  // Clean all HTML comment blocks from the text to remove layout comments
  const cleanedText = text.replace(/<!--[\s\S]*?-->/g, '');

  // Split cleaned text into separate lines and map to Paragraphs
  const docParagraphs = cleanedText.split('\n').map(line => {
    return new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: "Times New Roman",
          size: 28 // 14pt
        })
      ],
      spacing: { after: 120 } // paragraph margin spacing
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
            right: 850    // 15mm
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
