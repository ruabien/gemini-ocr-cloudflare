import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";

export async function onRequestPost({ request }: { request: any }) {
  try {
    const { text, fileName } = await request.json();
    const contentText = text || "";

    // Split text into lines/paragraphs, keeping all lines exactly as in the OCR result
    const lines = contentText.split(/\r?\n/);

    const paragraphs = lines.map((line: string) => {
      return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: {
          firstLine: 720, // 1.27 cm (twips/dxa: 1.27 * 567 = ~720)
        },
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