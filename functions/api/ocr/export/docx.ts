import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import { clean as docClean } from "../../../../shared/docFormatter";
import { isHeading } from "../../../../shared/docFormatter/heading";
import { getParagraphConfig } from "../../../../shared/docFormatter/docxStyles";
import {
  normalizeTextForDocx,
  isQuocHieuTieuNgu,
  isCoQuanBanHanh,
  isTieuDeVanBan,
  isSoHieu,
  isMucTieuMuc,
  isKyTen,
  flattenTextForManualLineBreak,
  removePageBreakMarkers
} from "../../../../shared/docxTextNormalizer";

export async function onRequestPost({ request }: { request: any }) {
  try {
    const { text, fileName, mode } = await request.json();
    const contentText = text || "";
    const cleanedContent = removePageBreakMarkers(contentText);

    let paragraphs: Paragraph[];

    if (mode === "manual_edit" || mode === "flatten_center") {
      const flattened = flattenTextForManualLineBreak(cleanedContent);
      paragraphs = [
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            before: 120, // 6pt = 120 twentieths of a point (dxa)
            after: 120,  // 6pt = 120 twentieths of a point (dxa)
            line: 240,   // Single line spacing (12pt * 20)
          },
          children: [
            new TextRun({
              text: flattened,
              font: "Times New Roman",
              size: 28, // 14pt = 28 half-points
              color: "000000",
            }),
          ],
        }),
      ];
    } else {
      const normalizedText = docClean(cleanedContent);
      const lines = normalizedText.split(/\r?\n/);
      paragraphs = lines.map((line: string) => {
        const config = getParagraphConfig(line, mode);
        return new Paragraph({
          alignment: config.alignment === 1 ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
          indent: config.indent,
          spacing: config.spacing,
          heading: config.heading === 3 ? HeadingLevel.HEADING_3 : undefined,
          keepNext: (config as any).keepNext,
          children: config.children.map((c) => new TextRun(c)),
        });
      });
    }

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
              ...((mode === "manual_edit" || mode === "flatten_center")
                ? {}
                : {
                    indent: {
                      firstLine: 720,
                    },
                  }),
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
    const suffix = (mode === "manual_edit" || mode === "flatten_center") ? "ThuCong" : "ND30";

    return new Response(docBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeFileName}_${suffix}.docx"`,
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `Lỗi xử lý export docx: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}