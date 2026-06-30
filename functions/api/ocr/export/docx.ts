import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import {
  normalizeTextForDocx,
  isQuocHieuTieuNgu,
  isCoQuanBanHanh,
  isTieuDeVanBan,
  isSoHieu,
  isMucTieuMuc,
  isKyTen
} from "../../../../src/utils/docxTextNormalizer";

export async function onRequestPost({ request }: { request: any }) {
  try {
    const { text, fileName, mergeBrokenLines } = await request.json();
    const contentText = text || "";

    // Mặc định gộp dòng trừ khi mergeBrokenLines = false
    const options = {
      mergeBrokenLines: mergeBrokenLines !== false,
      preserveLegalStructure: true
    };
    const normalizedText = normalizeTextForDocx(contentText, options);

    // Split text into lines/paragraphs
    const lines = normalizedText.split(/\r?\n/);

    const paragraphs = lines.map((line: string) => {
      const trimmed = line.trim();
      const isQuocHieu = isQuocHieuTieuNgu(line);
      const isCoQuan = isCoQuanBanHanh(line);
      const isTieuDe = isTieuDeVanBan(line);
      const isSo = isSoHieu(line);
      const isDanhSach = isMucTieuMuc(line);
      const isKy = isKyTen(line);

      // Alignment: center for headings, otherwise justified
      const alignment = (isQuocHieu || isCoQuan || isTieuDe || isSo)
        ? AlignmentType.CENTER
        : AlignmentType.JUSTIFIED;

      // First‑line indent is omitted for headings, list items, signatures, and empty lines
      const needsIndent = !(
        isQuocHieu ||
        isCoQuan ||
        isTieuDe ||
        isSo ||
        isDanhSach ||
        isKy ||
        trimmed.length === 0
      );
      const indent = needsIndent ? { firstLine: 720 } : undefined;

      return new Paragraph({
        alignment,
        ...(indent ? { indent } : {}),
        spacing: {
          before: 120, // 6pt = 120 twentieths of a point (dxa)
          after: 120,  // 6pt = 120 twentieths of a point (dxa)
          line: 240,   // Single line spacing (12pt * 20)
        },
        children: [
          new TextRun({
            text: line,
            font: "Times New Roman",
            size: 28, // 14pt = 28 half-points
            color: "000000", // Black color
          }),
        ],
      });
    });

    const doc = new Document({
      defaultTabStop: 720, // Default tab stop: 1.27 cm (720 dxa)
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 28, // 14pt
              color: "000000",
            },
            paragraph: {
              alignment: AlignmentType.JUSTIFIED,
              spacing: {
                before: 120,
                after: 120,
                line: 240,
              },
              indent: {
                firstLine: 720,
              },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906,  // A4 Page width (210mm in twips)
                height: 16838, // A4 Page height (297mm in twips)
              },
              margin: {
                top: 1134,    // 2 cm (20mm in twips)
                bottom: 1134, // 2 cm (20mm in twips)
                left: 1701,   // 3 cm (30mm in twips)
                right: 1134,  // 2 cm (20mm in twips)
              },
            },
          },
          children: paragraphs,
        },
      ],
    });

    const arrayBuffer = await Packer.toArrayBuffer(doc);
    const docBuffer = new Uint8Array(arrayBuffer);
    const safeFileName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "Van_Ban_OCR";

    return new Response(docBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeFileName}_ND30.docx"`,
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `Lỗi xử lý export docx: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}