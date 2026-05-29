import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  BorderStyle, 
  PageBreak 
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
 * Tokenizer & parser for inline Markdown styles (*italic*, **bold**, ***bold italic***, <u>underline</u>).
 * @param {string} text - Inline text content
 * @param {object} defaultOptions - Default formatting settings (font, size, bold, italic)
 * @returns {TextRun[]} Array of TextRun components
 */
function parseInline(text, defaultOptions = {}) {
  const runs = [];
  if (!text) {
    return [new TextRun({ text: "", ...defaultOptions })];
  }

  // Regex to split by bold-italic, bold, italic, and underline tags.
  const regex = /(\*\*\*.*?\*\*\*|___.*?___|\*\*.*?\*\*|__.*?__|\*.*?\*|_[^_]+?_|<u>.*?<\/u>)/g;
  const parts = text.split(regex);

  for (const part of parts) {
    if (!part) continue;

    let isBold = defaultOptions.bold || false;
    let isItalic = defaultOptions.italic || false;
    let isUnderline = defaultOptions.underline || false;
    let content = part;

    if ((part.startsWith('***') && part.endsWith('***')) || (part.startsWith('___') && part.endsWith('___'))) {
      isBold = true;
      isItalic = true;
      content = part.slice(3, -3);
    } else if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      isBold = true;
      content = part.slice(2, -2);
    } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      isItalic = true;
      content = part.slice(1, -1);
    } else if (part.startsWith('<u>') && part.endsWith('</u>')) {
      isUnderline = true;
      content = part.slice(3, -4);
    }

    runs.push(
      new TextRun({
        text: content,
        bold: isBold,
        italic: isItalic,
        underline: isUnderline ? {} : undefined,
        size: defaultOptions.size || 26, // 13pt by default
        font: defaultOptions.font || "Times New Roman"
      })
    );
  }

  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text: "",
        size: defaultOptions.size || 26,
        font: defaultOptions.font || "Times New Roman"
      })
    );
  }

  return runs;
}

/**
 * Parser for Markdown tables.
 * @param {string[]} tableLines - Line content of the table
 * @returns {Table} Word Table element
 */
function parseMarkdownTable(tableLines) {
  const rows = [];

  const getCells = (line) => {
    const cells = line.split('|').map(c => c.trim());
    if (cells[0] === '') cells.shift();
    if (cells[cells.length - 1] === '') cells.pop();
    return cells;
  };

  // Header row
  const headerCells = getCells(tableLines[0]);

  // Skip separator row if it exists
  let startIndex = 1;
  if (tableLines[1] && tableLines[1].includes('-')) {
    startIndex = 2;
  }

  // Add Table Header Row
  rows.push(
    new TableRow({
      tableHeader: true,
      children: headerCells.map(cellText => {
        return new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: parseInline(cellText, { bold: true, size: 22, font: "Times New Roman" }) // 11pt bold for headers
            })
          ],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 4, color: "000000" }
          }
        });
      })
    })
  );

  // Add Data Rows
  for (let i = startIndex; i < tableLines.length; i++) {
    const dataCells = getCells(tableLines[i]);
    while (dataCells.length < headerCells.length) dataCells.push('');
    const cells = dataCells.slice(0, headerCells.length);

    rows.push(
      new TableRow({
        children: cells.map(cellText => {
          return new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 60, after: 60 },
                children: parseInline(cellText, { size: 22, font: "Times New Roman" }) // 11pt normal for content
              })
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "000000" }
            }
          });
        })
      })
    );
  }

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" }
    },
    rows: rows
  });
}

/**
 * Advanced export OCR text to a structured, Decree 30 compliant DOCX file.
 * @param {string} text - Cleaned OCR text containing Markdown
 * @param {string} filename - Target filename
 */
export async function exportDocx(text, filename) {
  if (!text) {
    throw new Error("Không có nội dung để xuất file.");
  }

  const lines = text.split('\n');
  const children = [];

  let quocHieu = "";
  let tieuNgu = "";
  let coQuanLine1 = "";
  let coQuanLine2 = "";
  let soKyHieu = "";
  let ngayThang = "";
  let tenVanBan = "";
  let trichYeu = "";
  let kinhGui = "";
  const headerLineIndices = new Set();

  // 1. Scan first 20 lines to extract Decree 30 header metadata
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for National Motto (Quốc hiệu)
    if (/cộng\s*hòa\s*xã\s*hội\s*chủ\s*nghĩa\s*việt\s*nam/i.test(line)) {
      quocHieu = line.replace(/\*\*/g, '').trim();
      headerLineIndices.add(i);
      continue;
    }

    // Check for Slogan (Tiêu ngữ)
    if (/độc\s*lập\s*[-–—]\s*tự\s*do\s*[-–—]\s*hạnh\s*phúc/i.test(line)) {
      tieuNgu = line.replace(/\*\*/g, '').trim();
      headerLineIndices.add(i);
      continue;
    }

    // Check for Organization (Cơ quan ban hành)
    if (/^([uủ][yỷýỳỹ]?\s*ban|^bộ\s|^sở\s|^ubnd|^hội\s*đồng|^tòa\s*án|^viện\s*kiểm\s*sát)/i.test(line)) {
      const cleanL = line.replace(/\*\*/g, '').trim();
      if (!coQuanLine1) {
        coQuanLine1 = cleanL;
      } else if (!coQuanLine2) {
        coQuanLine2 = cleanL;
      }
      headerLineIndices.add(i);
      continue;
    }

    // Check for Document Number (Số ký hiệu)
    const soMatch = line.match(/(s[oố]\s*:\s*[0-9a-zđ-/]+)/i);
    if (soMatch) {
      soKyHieu = soMatch[1].replace(/\*\*/g, '').trim();
      headerLineIndices.add(i);
      continue;
    }

    // Check for Date and Place of issue (Ngày tháng địa danh)
    if (/ngày\s*\d+\s*tháng\s*\d+\s*năm\s*\d+/i.test(line)) {
      ngayThang = line.replace(/[\*\*|\*]/g, '').trim();
      headerLineIndices.add(i);
      continue;
    }

    // Check for Document Title (Tên loại văn bản)
    if (/^(tờ\s+trình|quyết\s+định|công\s+văn|thông\s+báo|báo\s+cáo|kế\s+hoạch|biên\s+bản|giấy)/i.test(line)) {
      tenVanBan = line.replace(/[\*\*|##]/g, '').trim();
      headerLineIndices.add(i);
      continue;
    }

    // Check for Subject (Trích yếu nội dung)
    if (/^[vv]ề\s+việc/i.test(line)) {
      trichYeu = line.replace(/\*\*/g, '').trim();
      headerLineIndices.add(i);
      continue;
    }

    // Check for Addressee (Kính gửi)
    if (/^[k]ính\s+gửi\s*:/i.test(line)) {
      kinhGui = line.replace(/\*\*/g, '').trim();
      headerLineIndices.add(i);
      continue;
    }
  }

  // Heuristic: Absorb adjacent line as coQuanLine2 if it immediately follows coQuanLine1 in the top 10 lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (coQuanLine1 && !coQuanLine2 && !headerLineIndices.has(i)) {
      const prevIndex = lines.slice(0, i).map((l, idx) => ({ l: l.trim(), idx })).filter(x => x.l).pop()?.idx;
      if (prevIndex !== undefined && lines[prevIndex].trim() === lines[i - 1].trim()) { // checks if immediately following
        if (!/cộng\s*hòa/i.test(line) && !/độc\s*lập/i.test(line) && !/s[oố]\s*:/i.test(line) && !/ngày\s*\d+/i.test(line) && !/^(tờ\s+trình|quyết\s+định|công\s+văn)/i.test(line)) {
          coQuanLine2 = line.replace(/\*\*/g, '').trim();
          headerLineIndices.add(i);
        }
      }
    }
  }

  // Handle single-line agency names that should be split into 2 rows (NĐ 30 standard)
  if (coQuanLine1 && !coQuanLine2) {
    const splitMatch = coQuanLine1.match(/(.*?[uủ][yỷýỳỹ]?\s*ban\s+nhân\s+dân)\s+(thành\s*phố.*|tỉnh.*|huyện.*|quận.*)/i);
    if (splitMatch) {
      coQuanLine1 = splitMatch[1].trim();
      coQuanLine2 = splitMatch[2].trim();
    }
  }

  const isNd30 = (quocHieu || tieuNgu) && coQuanLine1;

  // Filter header lines out of normal body lines
  const bodyLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (isNd30 && headerLineIndices.has(i)) {
      continue;
    }
    bodyLines.push(lines[i]);
  }

  // 2. Build Decree 30 Header table if active
  if (isNd30) {
    const row0LeftParagraphs = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: coQuanLine1, font: "Times New Roman", size: 24 }) // 12pt
        ]
      })
    ];

    if (coQuanLine2) {
      row0LeftParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [
            new TextRun({ text: coQuanLine2, font: "Times New Roman", size: 26, bold: true }) // 13pt bold
          ]
        })
      );
    }

    // Adding separator line (horizontal line) below organization name
    row0LeftParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: "─".repeat(14), font: "Times New Roman", size: 16 })
        ]
      })
    );

    const row0RightParagraphs = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: quocHieu || "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", font: "Times New Roman", size: 26, bold: true }) // 13pt bold
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: tieuNgu || "Độc lập - Tự do - Hạnh phúc", font: "Times New Roman", size: 26, bold: true }) // 13pt bold
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: "─".repeat(20), font: "Times New Roman", size: 16 })
        ]
      })
    ];

    const headerTable = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 37.5, type: WidthType.PERCENTAGE },
              children: row0LeftParagraphs,
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              }
            }),
            new TableCell({
              width: { size: 62.5, type: WidthType.PERCENTAGE },
              children: row0RightParagraphs,
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 37.5, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 120, after: 120 },
                  children: [
                    new TextRun({ text: soKyHieu || "Số: ......../........", font: "Times New Roman", size: 26 })
                  ]
                })
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              }
            }),
            new TableCell({
              width: { size: 62.5, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 120, after: 120 },
                  children: [
                    new TextRun({ text: ngayThang || "................, ngày .... tháng .... năm 20...", font: "Times New Roman", size: 26, italic: true })
                  ]
                })
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              }
            })
          ]
        })
      ]
    });

    children.push(headerTable);

    // Spacer between header table and title
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "", font: "Times New Roman", size: 26 })]
      })
    );

    // Tên Văn Bản (centered, bold, 14pt)
    if (tenVanBan) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({ text: tenVanBan.toUpperCase(), font: "Times New Roman", size: 28, bold: true })
          ]
        })
      );
    }

    // Trích yếu (centered, bold, 14pt)
    if (trichYeu) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [
            new TextRun({ text: trichYeu, font: "Times New Roman", size: 28, bold: true })
          ]
        })
      );
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 240 },
          children: [
            new TextRun({ text: "─".repeat(14), font: "Times New Roman", size: 16 })
          ]
        })
      );
    }

    // Kính gửi (centered, bold, 14pt)
    if (kinhGui) {
      let cleanKinhGui = kinhGui;
      if (cleanKinhGui.toLowerCase().startsWith("kính gửi")) {
        const content = cleanKinhGui.slice(8).trim().replace(/^[:\s]*/, '');
        cleanKinhGui = `Kính gửi: ${content}`;
      }
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 240 },
          children: [
            new TextRun({ text: cleanKinhGui, font: "Times New Roman", size: 28, bold: true })
          ]
        })
      );
    }
  }

  // 3. Compile remaining markdown lines
  let currentTableLines = [];
  let inTable = false;

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i].trim();

    // Check for tables
    if (line.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        currentTableLines = [];
      }
      currentTableLines.push(line);
      continue;
    } else {
      if (inTable) {
        children.push(parseMarkdownTable(currentTableLines));
        currentTableLines = [];
        inTable = false;
      }
    }

    // Blank line
    if (!line) {
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: "", size: isNd30 ? 26 : 24, font: "Times New Roman" })]
        })
      );
      continue;
    }

    // Page Break
    if (/<!--\s*page:\s*\d+\s*-->/i.test(line) || /\[PAGE_MARKER_\d+\]/i.test(line)) {
      children.push(
        new Paragraph({
          children: [new PageBreak()]
        })
      );
      continue;
    }

    // Image Reference Placeholder
    if (/^\[Hình.*\]$/i.test(line)) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          children: [
            new TextRun({
              text: line,
              font: "Times New Roman",
              size: isNd30 ? 26 : 24,
              italic: true,
              bold: true
            })
          ]
        })
      );
      continue;
    }

    // Headings
    if (line.startsWith('## ')) {
      const headingText = line.substring(3).trim();
      children.push(
        new Paragraph({
          alignment: isNd30 ? AlignmentType.LEFT : AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
          children: parseInline(headingText, { bold: true, size: 28, font: "Times New Roman" }) // 14pt
        })
      );
      continue;
    }
    if (line.startsWith('### ')) {
      const headingText = line.substring(4).trim();
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 120, after: 60 },
          children: parseInline(headingText, { bold: true, size: 26, font: "Times New Roman" }) // 13pt
        })
      );
      continue;
    }
    if (line.startsWith('#### ')) {
      const headingText = line.substring(5).trim();
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 120, after: 60 },
          children: parseInline(headingText, { bold: true, size: 26, font: "Times New Roman" }) // 13pt
        })
      );
      continue;
    }

    // Lists (bullet & numbered)
    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      const content = bulletMatch[1];
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 720, firstLine: -360 }, // Hanging indent for dash
          spacing: { before: 60, after: 60, line: isNd30 ? 360 : 276 },
          children: [
            new TextRun({ text: "- ", font: "Times New Roman", size: isNd30 ? 26 : 24 }),
            ...parseInline(content, { size: isNd30 ? 26 : 24, font: "Times New Roman" })
          ]
        })
      );
      continue;
    }

    const numberedMatch = line.match(/^(\d+\.|[a-zA-Z]\))\s+(.*)/);
    if (numberedMatch) {
      const prefix = numberedMatch[1];
      const content = numberedMatch[2];
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 720, firstLine: -360 }, // Hanging indent for number prefix
          spacing: { before: 60, after: 60, line: isNd30 ? 360 : 276 },
          children: [
            new TextRun({ text: `${prefix} `, font: "Times New Roman", size: isNd30 ? 26 : 24 }),
            ...parseInline(content, { size: isNd30 ? 26 : 24, font: "Times New Roman" })
          ]
        })
      );
      continue;
    }

    // Alignments from basic HTML tags
    let alignment = AlignmentType.JUSTIFIED;
    let cleanedLine = line;
    if (line.includes('<center>') || line.includes('</center>')) {
      alignment = AlignmentType.CENTER;
      cleanedLine = line.replace(/<\/?center>/g, '');
    } else if (line.includes('text-align: right') || line.includes('text-align:right')) {
      alignment = AlignmentType.RIGHT;
      cleanedLine = line.replace(/<div.*?>|<\/div>/g, '');
    }

    // Normal body paragraphs
    children.push(
      new Paragraph({
        alignment: alignment,
        indent: (isNd30 && alignment === AlignmentType.JUSTIFIED) ? { firstLine: 720 } : undefined, // Thụt lề dòng đầu cho đoạn văn hành chính (1.27cm)
        spacing: { before: 0, after: isNd30 ? 0 : 120, line: isNd30 ? 360 : 276 }, // Giãn dòng 1.5 lines cho NĐ 30, 1.15 lines cho văn bản thường
        children: parseInline(cleanedLine, { size: isNd30 ? 26 : 24, font: "Times New Roman" })
      })
    );
  }

  // Append remaining table if active
  if (inTable) {
    children.push(parseMarkdownTable(currentTableLines));
  }

  // 4. Create Document structure and compile to Blob
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: isNd30 ? {
              top: "2cm",
              bottom: "2cm",
              left: "3cm",
              right: "2cm"
            } : {
              top: "2.5cm",
              bottom: "2.5cm",
              left: "3cm",
              right: "2.5cm"
            },
            size: {
              width: "21cm",
              height: "29.7cm" // A4 paper size standard
            }
          }
        },
        children: children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
