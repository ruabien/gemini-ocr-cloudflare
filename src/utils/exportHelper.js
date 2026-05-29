import { Document, Packer, Paragraph, TextRun } from 'docx';
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
  const blob = new Blob(['\ufeff' + text], { type: "text/plain;charset=utf-8" });
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
  const blob = new Blob(['\ufeff' + text], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, filename);
}

/**
 * Export OCR text to a standard DOCX file containing only the text content.
 * @param {string} text - OCR text to export
 * @param {string} filename - Target filename
 */
export async function exportDocx(text, filename) {
  if (!text) {
    throw new Error("Không có nội dung để xuất file.");
  }

  const children = [];

  // Document body paragraphs only
  const paragraphs = text.split('\n');
  paragraphs.forEach(pText => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: pText,
            size: 24 // 12pt
          })
        ],
        spacing: { after: 120 } // 6pt space after paragraph
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
