import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  ImageRun 
} from 'docx';
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
 * Helper to convert file to Image object.
 */
async function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = (err) => {
      reject(err);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Helper to crop signature/stamp or return full image buffer.
 */
async function getCroppedImageBuffer(file, type) {
  try {
    const img = await fileToImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let x = 0, y = 0, w = img.width, h = img.height;
    const lowerType = type.toLowerCase();

    if (lowerType.includes('signature') || lowerType.includes('chữ ký') || lowerType.includes('chuky') || lowerType.includes('ky')) {
      // Signature: typical bottom-right area (right 45%, bottom 28%)
      x = img.width * 0.5;
      y = img.height * 0.72;
      w = img.width * 0.45;
      h = img.height * 0.25;
    } else if (lowerType.includes('stamp') || lowerType.includes('con dấu') || lowerType.includes('condau') || lowerType.includes('dấu')) {
      // Stamp: typical bottom-left/center area (left/center 45%, bottom 28%)
      x = img.width * 0.15;
      y = img.height * 0.72;
      w = img.width * 0.45;
      h = img.height * 0.25;
    } else {
      // Keep entire image (diagrams, photos)
      x = 0;
      y = 0;
      w = img.width;
      h = img.height;
    }

    // Safeguard coordinates and bounds
    x = Math.max(0, Math.min(x, img.width - 1));
    y = Math.max(0, Math.min(y, img.height - 1));
    w = Math.max(10, Math.min(w, img.width - x));
    h = Math.max(10, Math.min(h, img.height - y));

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      return await file.arrayBuffer();
    }
    return await blob.arrayBuffer();
  } catch (err) {
    console.error("Lỗi khi cắt vùng ảnh, dùng ảnh gốc:", err);
    return await file.arrayBuffer();
  }
}

/**
 * Helper to get image dimensions.
 */
async function getImageDimensions(arrayBuffer) {
  return new Promise((resolve) => {
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Parses inline markdown like ***bolditalic***, **bold**, *italic*
 */
function parseInlineMarkdown(text) {
  const runs = [];
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g;
  const parts = text.split(regex);
  
  parts.forEach(part => {
    if (!part) return;
    if (part.startsWith('***') && part.endsWith('***')) {
      runs.push({
        text: part.slice(3, -3),
        bold: true,
        italics: true
      });
    } else if (part.startsWith('**') && part.endsWith('**')) {
      runs.push({
        text: part.slice(2, -2),
        bold: true
      });
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push({
        text: part.slice(1, -1),
        italics: true
      });
    } else {
      runs.push({
        text: part
      });
    }
  });
  
  if (runs.length === 0 && text) {
    runs.push({ text: text });
  }
  return runs;
}

/**
 * Formats a plain paragraph or checks for special Decree 30 styles
 */
function createParagraphFromText(line) {
  const runs = parseInlineMarkdown(line);
  let alignment = undefined;
  const trimmed = line.trim();

  // Rules for Decree 30 administrative layouts:
  // 1. Quốc hiệu - Tiêu ngữ: Căn giữa
  if (
    trimmed.toUpperCase().includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM") ||
    trimmed.includes("Độc lập - Tự do - Hạnh phúc") ||
    trimmed.toUpperCase().includes("ĐỘC LẬP - TỰ DO - HẠNH PHÚC")
  ) {
    alignment = "center";
  }

  // 2. Kính gửi: Căn giữa
  if (trimmed.toUpperCase().startsWith("KÍNH GỬI:")) {
    alignment = "center";
  }

  // 3. Địa danh ngày tháng: Căn phải, in nghiêng
  const dateRegex = /^[A-ZĐa-zà-ỹ\s]+,\s*ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d+$/i;
  if (dateRegex.test(trimmed)) {
    alignment = "right";
    runs.forEach(r => r.italics = true);
  }

  const docxRuns = runs.map(run => {
    return new TextRun({
      text: run.text,
      bold: run.bold,
      italics: run.italics,
      size: 26, // 13pt
      font: "Times New Roman"
    });
  });

  const paragraphOptions = {
    children: docxRuns,
    spacing: {
      line: 320, // 1.33 line spacing
      after: 120 // 6pt space after
    }
  };

  if (alignment) {
    paragraphOptions.alignment = alignment;
  }

  return new Paragraph(paragraphOptions);
}

/**
 * Parses markdown table syntax and generates docx.js Table
 */
function createDocxTable(tableLines) {
  const rowsData = tableLines
    .map(line => {
      const cells = line.split('|').map(c => c.trim());
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();
      return cells;
    })
    .filter(row => {
      const isSeparator = row.every(cell => /^:?-+:?$/.test(cell));
      return !isSeparator;
    });

  if (rowsData.length === 0) return null;

  const colCount = Math.max(...rowsData.map(r => r.length));

  // Detect if this table is the 2-column administrative header table
  const isHeaderTable = colCount === 2 && 
    (rowsData[0][0].toLowerCase().includes("ủy ban") || 
     rowsData[0][0].toLowerCase().includes("tòa án") || 
     rowsData[0][0].toLowerCase().includes("bộ") || 
     rowsData[0][0].toLowerCase().includes("sở") || 
     rowsData[0][0].toLowerCase().includes("công ty") || 
     rowsData[0][1].toLowerCase().includes("cộng hòa") || 
     rowsData[0][1].toLowerCase().includes("độc lập"));

  const tableRows = rowsData.map((rowCells, rowIndex) => {
    const cells = [];
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const cellText = rowCells[colIndex] || '';
      const cellRuns = parseInlineMarkdown(cellText).map(run => {
        let isItalic = run.italics;
        if (isHeaderTable && colIndex === 1 && rowIndex > 0 && cellText.toLowerCase().includes("ngày")) {
          isItalic = true;
        }
        return new TextRun({
          text: run.text,
          bold: run.bold || (rowIndex === 0 && !isHeaderTable),
          italics: isItalic,
          size: 24, // 12pt
          font: "Times New Roman"
        });
      });

      let cellAlignment = undefined;
      if (isHeaderTable) {
        cellAlignment = "center";
      }

      const cellParagraphOptions = {
        children: cellRuns,
        spacing: { after: 120, before: 60 }
      };

      if (cellAlignment) {
        cellParagraphOptions.alignment = cellAlignment;
      }

      const cellOptions = {
        children: [
          new Paragraph(cellParagraphOptions)
        ],
        borders: isHeaderTable ? {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        } : {
          top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
        }
      };

      if (rowIndex === 0 && !isHeaderTable) {
        cellOptions.shading = {
          fill: "F2F2F2"
        };
      }

      cells.push(new TableCell(cellOptions));
    }
    return new TableRow({ children: cells });
  });

  return new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  });
}

/**
 * Export OCR text and assets to a professional DOCX file.
 * Supports single page or multi-page array, margins, and canvas crops.
 * @param {string|Array} textOrPages - OCR text or array of { text, imageFile }
 * @param {string} filename - Output file name
 * @param {object} options - Export options (e.g. { wordNd30: true })
 */
export async function exportDocx(textOrPages, filename, options = {}) {
  let pagesData = [];
  if (typeof textOrPages === 'string') {
    pagesData = [{ text: textOrPages, imageFile: null }];
  } else if (Array.isArray(textOrPages)) {
    pagesData = textOrPages;
  } else {
    throw new Error("Dữ liệu đầu vào không hợp lệ để xuất DOCX.");
  }

  // Clean all HTML comment blocks from each page text to avoid residual layout markers
  pagesData = pagesData.map(page => {
    let cleanText = page.text || '';
    cleanText = cleanText.replace(/<!--[\s\S]*?-->/g, '');
    return {
      ...page,
      text: cleanText
    };
  });

  const sections = [];

  for (let pageIdx = 0; pageIdx < pagesData.length; pageIdx++) {
    const page = pagesData[pageIdx];
    const text = page.text || '';
    const imageFile = page.imageFile;

    const children = [];
    const lines = text.split('\n');
    let currentTableLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Table line checking
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1) {
        currentTableLines.push(line);
      } else {
        if (currentTableLines.length > 0) {
          const table = createDocxTable(currentTableLines);
          if (table) children.push(table);
          currentTableLines = [];
        }

        // Image placeholder checking
        const imgMatch = trimmed.match(/\[(?:IMAGE_PLACEHOLDER|Hình minh họa):\s*([^\]]+)\]/i);
        if (imgMatch) {
          const placeholderType = imgMatch[1].trim();
          if (imageFile) {
            try {
              const imgBuffer = await getCroppedImageBuffer(imageFile, placeholderType);
              const dims = await getImageDimensions(imgBuffer);
              
              let displayW = 450;
              let displayH = 300;
              const isSignOrStamp = placeholderType.toLowerCase().includes('signature') || 
                                    placeholderType.toLowerCase().includes('chữ ký') || 
                                    placeholderType.toLowerCase().includes('stamp') || 
                                    placeholderType.toLowerCase().includes('dấu');
              
              if (isSignOrStamp) {
                displayW = 180;
                displayH = 100;
              }
              
              if (dims && dims.width && dims.height) {
                const ratio = dims.height / dims.width;
                if (isSignOrStamp) {
                  displayW = 180;
                  displayH = Math.round(180 * ratio);
                } else {
                  displayW = 450;
                  displayH = Math.round(450 * ratio);
                  if (displayH > 400) {
                    displayH = 400;
                    displayW = Math.round(400 / ratio);
                  }
                }
              }

              const imgRun = new ImageRun({
                data: imgBuffer,
                transformation: {
                  width: displayW,
                  height: displayH
                }
              });

              children.push(
                new Paragraph({
                  children: [imgRun],
                  alignment: isSignOrStamp ? "right" : "center",
                  spacing: { before: 120, after: 120 }
                })
              );
            } catch (err) {
              console.error("Lỗi khi chèn ảnh vào DOCX:", err);
              children.push(createParagraphFromText(line));
            }
          } else {
            children.push(createParagraphFromText(line));
          }
        } else {
          if (trimmed === '' && i > 0 && lines[i - 1].trim() === '') {
            continue;
          }
          children.push(createParagraphFromText(line));
        }
      }
    }

    if (currentTableLines.length > 0) {
      const table = createDocxTable(currentTableLines);
      if (table) children.push(table);
    }

    // Set page orientation and margins (A4, Decree 30 margins)
    const pageSetup = {
      size: {
        width: 11906, // A4 Width in DXA
        height: 16838 // A4 Height in DXA
      },
      margin: {
        top: 1134,    // 20mm
        bottom: 1134, // 20mm
        left: 1701,   // 30mm (for binding judicial dossier)
        right: 850    // 15mm
      }
    };

    sections.push({
      properties: {
        page: pageSetup
      },
      children: children
    });
  }

  // Create Document with styles
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 26 // 13pt
          },
          paragraph: {
            spacing: {
              line: 320, // 1.33 line spacing
              after: 120 // 6pt space after
            }
          }
        }
      }
    },
    sections: sections
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
