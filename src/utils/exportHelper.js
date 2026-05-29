import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Helper to parse a line of text into an array of docx TextRun objects,
 * identifying bold (**) and italic (*) markdown formatting.
 * @param {string} line - text line to parse
 * @returns {TextRun[]} array of docx TextRun instances
 */
function parseLineToTextRuns(line) {
  if (!line) return [];
  const runs = [];
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g;
  let match;
  let lastIndex = 0;
  
  while ((match = regex.exec(line)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];
    
    // Add normal text before the match
    if (matchIndex > lastIndex) {
      const normalText = line.substring(lastIndex, matchIndex);
      if (normalText) {
        runs.push(new TextRun({
          text: normalText,
          font: "Times New Roman",
          size: 28 // 14pt
        }));
      }
    }
    
    // Process the matched formatted text and strip markdown stars
    let text = matchText;
    let bold = false;
    let italic = false;
    
    if (matchText.startsWith('***') && matchText.endsWith('***')) {
      text = matchText.slice(3, -3);
      bold = true;
      italic = true;
    } else if (matchText.startsWith('**') && matchText.endsWith('**')) {
      text = matchText.slice(2, -2);
      bold = true;
    } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
      text = matchText.slice(1, -1);
      italic = true;
    }
    
    if (text) {
      runs.push(new TextRun({
        text: text,
        bold: bold,
        italic: italic,
        font: "Times New Roman",
        size: 28 // 14pt
      }));
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining normal text after the last match
  if (lastIndex < line.length) {
    const remainingText = line.substring(lastIndex);
    if (remainingText) {
      runs.push(new TextRun({
        text: remainingText,
        font: "Times New Roman",
        size: 28 // 14pt
      }));
    }
  }
  
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
      alignment: AlignmentType.JUSTIFIED,
      spacing: { 
        before: 120, // 6 pt
        after: 120   // 6 pt
      }
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
