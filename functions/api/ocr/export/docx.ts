const MOCK_LEGAL_DOC_TEXT = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---------------
UBND THÀNH PHỐ HÀ NỘI
SỞ TÀI CHÍNH
Số: 042/QĐ-STC

Hà Nội, ngày 15 tháng 10 năm 2023

QUYẾT ĐỊNH
Về việc phê duyệt dự toán kinh phí triển khai hệ thống OCR tập trung`;

export async function onRequestPost({ request }) {
  try {
    const { text, fileName } = await request.json();
    const contentText = text || MOCK_LEGAL_DOC_TEXT;

    // Tạo tài liệu định dạng Word HTML tương thích tối đa để đảm bảo lề và font chữ Times New Roman đúng Nghị định 30/2020/NĐ-CP
    // Lề: lề trái 30mm, lề phải 15mm, lề trên 20mm, lề dưới 20mm
    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Quyết định lưu trữ</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 210mm 297mm; /* Khổ giấy A4 chuẩn Nghị định 30 */
            margin: 20mm 15mm 20mm 30mm; /* Lề chuẩn: Trên-Dưới 20, Trái 30, Phải 15 */
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 14pt; /* Cỡ chữ nội dung chuẩn: 13-14pt */
            line-height: 1.45; /* Giãn dòng chuẩn 1.0 - 1.5 */
            color: #000000;
          }
          p {
            margin: 0 0 6pt 0;
            text-align: justify; /* Căn lề hai bên */
          }
          .text-center {
            text-align: center;
          }
          .text-right {
            text-align: right;
          }
          .font-bold {
            font-weight: bold;
          }
          .font-italic {
            font-style: italic;
          }
        </style>
      </head>
      <body>
        ${contentText.replace(/\n/g, "<br/>")}
      </body>
      </html>
    `;

    const encoder = new TextEncoder();
    const docBuffer = encoder.encode(wordHtml);

    const safeFileName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "Van_Ban_OCR";

    return new Response(docBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/msword",
        "Content-Disposition": `attachment; filename="${safeFileName}_ND30.doc"`,
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `Lỗi xử lý export docx: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}