export async function onRequestPost({ request }) {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Không tìm thấy nội dung văn bản." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let processedText = text;

    // 1. Mã hóa họ tên (Nguyễn Văn A, Trần Văn B...)
    const namePatterns = [
      /Nguyễn Văn A/g,
      /Trần Văn B/g,
      /Nguyễn Thị C/g,
      /Nguyễn Văn [B-Z]/g,
      /Trần Thị [A-Z]/g,
    ];
    namePatterns.forEach((pattern) => {
      processedText = processedText.replace(pattern, "Nguyễn Văn ***");
    });

    // 2. Mã hóa địa chỉ cụ thể
    const addressPattern =
      /\d+\s+Đường\s+[^,]+,\s+Quận\s+\d+,\s+Thành\s+phố\s+Hồ\s+Chí\s+Minh/gi;
    processedText = processedText.replace(
      addressPattern,
      "Số ***, Đường ***, Quận 1, TP Hồ Chí Minh"
    );

    // 3. Mã hóa số CCCD (Ví dụ: 12 số định danh)
    const cccdPattern = /\d{12}/g;
    processedText = processedText.replace(cccdPattern, "079*********");

    return new Response(
      JSON.stringify({
        success: true,
        anonymizedText: processedText,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `Lỗi xử lý anonymize: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}