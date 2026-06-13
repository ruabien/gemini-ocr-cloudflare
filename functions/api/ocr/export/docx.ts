import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";

export async function onRequestPost({ request }: { request: any }) {
  try {
    const { text, fileName } = await request.json();
    const contentText = text || "";

    // Split text into lines/paragraphs
    const lines = contentText.split("\n");

    const paragraphs = lines.map((line: string) => {
      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: "Times New Roman",
            size: 28, // 14pt = 28 half-points
          }),
        ],
        spacing: {
          after: 120, // 6pt = 120 twentieths of a point (dxa)
          line: 348,  // 1.45 line spacing (12pt * 20 * 1.45 = ~348 dxa)
        },
        alignment: AlignmentType.JUSTIFIED,
      });
    });

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1134,    // 20mm (1mm = 56.7 dxa)
                bottom: 1134, // 20mm
                left: 1701,   // 30mm
                right: 850,   // 15mm
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