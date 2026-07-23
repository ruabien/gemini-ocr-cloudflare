# Quy chuẩn Liên kết Nội bộ (Internal Linking)

Tài liệu này quy định chiến lược xây dựng liên kết nội bộ trong các bài viết thuộc Knowledge Center của LexOCR nhằm tối ưu hóa SEO và gia tăng trải nghiệm người dùng.

## 1. Tầm quan trọng của Liên kết Nội bộ

Liên kết nội bộ giúp:
- Hướng dẫn người dùng tìm thấy các tài liệu bổ trợ hoặc các bước tiếp theo nhanh nhất.
- Truyền sức mạnh SEO (Link Juice) giữa các trang.
- Giúp Googlebot dễ dàng thu thập dữ liệu cấu trúc website.

## 2. Quy tắc cơ bản khi chèn Internal Link

- **Đường dẫn tương đối:** Luôn sử dụng URL tương đối, không được hardcode domain `https://lexocr.com`.
  - *Ví dụ đúng:* `/knowledge/chuyen-pdf-scan-sang-word`
  - *Ví dụ sai:* `https://lexocr.com/knowledge/chuyen-pdf-scan-sang-word`
- **Chỉ liên kết đến bài đã xuất bản:** Chỉ đặt link đến các bài đã đăng ký trong `shared/knowledgeArticles.ts`. Trừ phi giao diện hiện tại có cơ chế hiển thị bài viết "đang cập nhật" hoặc "sắp ra mắt".
- **Anchor Text rõ ràng:** Anchor text (phần chữ hiển thị chứa link) phải mô tả chính xác nội dung trang đích.
  - *Ví dụ tốt:* "tham khảo [Hướng dẫn tạo Gemini API Key](/knowledge/huong-dan-tao-gemini-api-key)"
  - *Ví dụ không tốt:* "bấm vào [đây](/knowledge/huong-dan-tao-gemini-api-key) để xem hướng dẫn"
- **Không lạm dụng liên kết:** Tránh lặp đi lặp lại cùng một link nhiều lần trong một đoạn văn ngắn hoặc trong toàn bài viết. Tối đa 2 lần xuất hiện cùng một liên kết trong một bài viết.
- **Đối chiếu dữ liệu:** Trước khi thêm link mới, Cline phải kiểm tra xem slug đích có tồn tại trong `shared/knowledgeArticles.ts` hay không.

## 3. Phân loại bài viết trong Cấu trúc Topic Cluster

Khi triển khai liên kết nội bộ, cần phân loại rõ vai trò của bài viết để định hướng dòng chảy liên kết:

1. **Pillar Article (Bài cột trụ):** 
   - Là bài viết bao quát, toàn diện về một chủ đề lớn (ví dụ: Hướng dẫn số hóa và xử lý hồ sơ tài liệu).
   - Pillar Article liên kết tới tất cả các Cluster Article liên quan.
2. **Cluster Article (Bài bổ trợ chuyên sâu):**
   - Giải quyết một bài toán cụ thể, ngách nhỏ hơn (ví dụ: Chuyển PDF scan sang Word, Cách trích xuất bảng biểu).
   - Cluster Article luôn luôn phải có liên kết ngược lại bài viết cột trụ chính (Pillar Article).
3. **Bài hướng dẫn liên quan:**
   - Liên kết giữa các bài bổ trợ cùng thuộc một nhóm chủ đề (ví dụ: từ bài hướng dẫn OCR miễn phí dẫn sang bài hướng dẫn tạo API Key).
4. **Bài hỗ trợ xử lý lỗi:**
   - Liên kết người dùng từ bài hướng dẫn tính năng sang các trang hướng dẫn xử lý lỗi khi quá trình OCR gặp trục trặc (ví dụ: lỗi Rate Limit, lỗi không nhận dạng được chữ viết tay).

## 4. Cách triển khai Link trong React/TSX

- Ưu tiên dùng thẻ `<a>` tiêu chuẩn hoặc component điều hướng của project nếu có. 
- Đối với liên kết nội bộ trong phần nội dung bài viết, chuyển đổi thẻ Markdown `[Anchor Text](/knowledge/slug)` thành `<a href="/knowledge/slug" className="text-blue-650 hover:text-blue-800 underline font-semibold">Anchor Text</a>`.
- Đối với mục **Bài viết liên quan**, sử dụng cơ chế `relatedSlugs` trong `shared/knowledgeArticles.ts` để component `KnowledgeRelatedArticles` tự động render giao diện chuẩn.