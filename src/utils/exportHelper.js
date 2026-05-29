import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
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
 * Export OCR text to a standard DOCX file.
 * @param {string} text - OCR text to export
 * @param {string} filename - Target filename
 * @param {Object} metadata - Optional metadata (e.g., engine, duration, pages, etc.)
 */
export async function exportDocx(text, filename, metadata = {}) {
  if (!text) {
    throw new Error("Không có nội dung để xuất file.");
  }

  const children = [];

  // 1. Title if present
  if (metadata.title) {
    children.push(
      new Paragraph({
        text: metadata.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );
  }

  // 2. Metadata Section (Time, engine, OCR mode, pages)
  const metadataLines = [];
  
  // Current time
  const now = new Date();
  const timeStr = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  metadataLines.push(`Thời gian xuất file: ${timeStr}`);

  if (metadata.processingTime) {
    metadataLines.push(`Thời gian số hóa: ${metadata.processingTime}`);
  }
  if (metadata.pageCount) {
    metadataLines.push(`Số trang: ${metadata.pageCount}`);
  }
  if (metadata.engineVersion) {
    metadataLines.push(`Phiên bản Engine: ${metadata.engineVersion}`);
  }
  if (metadata.ocrMode) {
    metadataLines.push(`Chế độ OCR: ${metadata.ocrMode}`);
  }

  if (metadataLines.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "--- THÔNG TIN HỒ SƠ SỐ HÓA ---",
            bold: true,
            size: 20, // 10pt
            color: "555555"
          })
        ],
        spacing: { before: 120, after: 60 }
      })
    );
    
    metadataLines.forEach(line => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              italic: true,
              size: 18, // 9pt
              color: "777777"
            })
          ],
          spacing: { after: 40 }
        })
      );
    });

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "---------------------------------",
            color: "CCCCCC"
          })
        ],
        spacing: { after: 240 }
      })
    );
  }

  // 3. Document body paragraphs
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
