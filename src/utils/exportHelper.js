import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

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
  const cleanText = text.replace(/<!--[\s\S]*?-->/g, '').replace(/\[IMAGE_PLACEHOLDER:.*?\]/g, '');
  const blob = new Blob(['\ufeff' + cleanText], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
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
  downloadBlob(blob, filename);
}

/**
 * Export OCR text and assets to a professional DOCX file using direct docx import.
 * Optimized with traditional for-loops, node reduction, and immediate Blob cleanup.
 * @param {string|Array} textOrPages - OCR text or array of { text, imageFile }
 * @param {string} filename - Output file name
 * @param {object} options - Export options (e.g. { wordNd30: true })
 */
export async function exportDocx(textOrPages, filename, options = {}) {
  let text = "";
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
