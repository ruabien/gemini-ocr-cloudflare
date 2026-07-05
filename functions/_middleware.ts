export const onRequest = async (context: { request: Request; next: () => Promise<Response> }) => {
  const url = new URL(context.request.url);
  const acceptHeader = context.request.headers.get("accept") || "";

  // Explicitly serve auth.md if requested
  if (url.pathname === "/auth.md") {
    try {
      // Fetch the auth.md file from the public asset directory
      const response = await context.next();
      if (response.status === 200) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Content-Type", "text/markdown; charset=utf-8");
        newHeaders.set("Access-Control-Allow-Origin", "*");
        return new Response(response.body, {
          status: 200,
          headers: newHeaders,
        });
      }
    } catch (e) {
      // Fallback in case fetch fails
    }
  }

  // Check if request is asking for markdown
  if (acceptHeader.includes("text/markdown")) {
    // Only return markdown for page routes, not static assets or api endpoints
    const isApi = url.pathname.startsWith("/api");
    const isStatic = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webmanifest|json|txt|xml|woff|woff2|ttf|eot|md)$/i.test(url.pathname);

    if (!isApi && !isStatic) {
      const markdown = `# Trợ lý số hóa hồ sơ tư pháp bằng AI (LexOCR)

LexOCR là công cụ chuyển đổi hình ảnh, tài liệu scan sang định dạng văn bản (OCR) chuyên biệt cho ngành tư pháp Việt Nam, sử dụng mô hình trí tuệ nhân tạo Gemini AI tiên tiến nhất hiện nay để đảm bảo độ chính xác vượt trội.

## Điểm nổi bật
- **Độ chính xác cao**: Nhận diện chuẩn xác văn bản tiếng Việt hành chính, pháp lý, kể cả các bản scan mờ, bản chụp camera điện thoại nghiêng, lệch.
- **Bảo mật tối đa**: Thiết kế stateless không lưu trữ tài liệu người dùng. Toàn bộ thao tác truyền tải dữ liệu được mã hóa an toàn qua HTTPS.
- **Trình chỉnh sửa thông minh**: Tích hợp công cụ chỉnh sửa song song hai màn hình (ảnh gốc - văn bản trích xuất) giúp kiểm soát, rà soát lỗi dễ dàng.
- **Tính năng lọc thông tin nhạy cảm (Anonymize)**: Tự động phát hiện và ẩn đi các thông tin nhạy cảm trong hồ sơ như Họ tên, Số CCCD/CMND, Địa chỉ, Số điện thoại để bảo mật tuyệt đối trước khi chia sẻ.
- **Định dạng pháp lý nâng cao**: Tự động nhận diện cấu trúc tiêu đề, danh mục, điều khoản pháp luật của văn bản và chuẩn hóa thụt lề, khoảng cách dòng.
- **Xuất file linh hoạt**: Hỗ trợ tải xuống kết quả dưới dạng tài liệu Microsoft Word (.docx) hoặc Excel (.xlsx).

## Câu hỏi thường gặp (FAQ)
- **Hệ thống có lưu hồ sơ của tôi không?**
  Không. LexOCR không lưu trữ bất kỳ hình ảnh hay văn bản kết quả nào của bạn. Dữ liệu chỉ được xử lý tạm thời trong bộ nhớ đệm RAM và giải phóng ngay sau khi phản hồi hoàn tất.
- **Có giới hạn số lượng trang không?**
  Hệ thống hỗ trợ xử lý tài liệu PDF scan lên tới 100MB và ảnh đơn lẻ dung lượng cao.
- **Tôi có cần tài khoản để sử dụng không?**
  Bạn có thể trải nghiệm các tính năng cơ bản ngay lập tức. Để nâng cấp giới hạn và sử dụng các tính năng nâng cao, bạn có thể đăng ký tài khoản miễn phí.

## Bắt đầu sử dụng
Để bắt đầu, hãy truy cập [LexOCR](https://lexocr.com/) bằng trình duyệt web để tải lên tài liệu của bạn.`;

      const tokenCount = Math.ceil(markdown.length / 4);

      return new Response(markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "x-markdown-tokens": String(tokenCount),
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }

  return context.next();
};