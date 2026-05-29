import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Helper to parse a line of text into an array of docx TextRun objects,
 * identifying bold (**) and italic (*) markdown formatting.
 * @param {string} line - text line to parse
 * @returns {TextRun[]} array of docx TextRun instances
 */
function parseLineToTextRuns(line) {
  const runs = [];
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g;
  const parts = line.split(regex);
  
  parts.forEach(part => {
    if (!part) return;
    
    if (part.startsWith('***') && part.endsWith('***')) {
      runs.push(new TextRun({
        text: part.slice(3, -3),
        bold: true,
        italic: true,
        font: "Times New Roman",
        size: 28 // 14pt
      }));
    } else if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
        font: "Times New Roman",
        size: 28 // 14pt
      }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        italic: true,
        font: "Times New Roman",
        size: 28 // 14pt
      }));
    } else {
      runs.push(new TextRun({
        text: part,
        font: "Times New Roman",
        size: 28 // 14pt
      }));
    }
  });
  
  if (runs.length === 0 && line) {
    runs.push(new TextRun({
      text: line,
      font: "Times New Roman",
      size: 28 // 14pt
    }));
  }
  
  return runs;
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
    const docxRuns = parseLineToTextRuns(line);
    return new Paragraph({
      children: docxRuns,
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
