# Kế hoạch Xuất bản (Publishing Plan)

Tài liệu này định nghĩa quy trình và trạng thái của từng bài viết Knowledge Center trong quá trình chuẩn bị và xuất bản lên môi trường production.

| Tiêu đề bài viết | Slug | Ngày dự kiến | Trạng thái nội dung (Markdown) | Trạng thái TSX | Trạng thái ảnh | Trạng thái SEO | Ngày xuất bản |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Chuyển PDF scan sang Word: Hướng dẫn đơn giản bằng OCR | `chuyen-pdf-scan-sang-word` | 2026‑06‑15 | ✅ Đã duyệt | ✅ TSX tạo xong | ✅ Ảnh có | ✅ SEO OK | 2026‑06‑20 |
| Hướng dẫn tạo Gemini API Key và cấu hình LexOCR | `huong-dan-tao-gemini-api-key` | 2026‑07‑01 | ✅ Đã duyệt | ✅ TSX tạo xong | ✅ Ảnh có | ✅ SEO OK | 2026‑07‑05 |
| OCR PDF scan sang Word miễn phí bằng Google Gemini | `ocr-pdf-scan-sang-word-mien-phi` | 2026‑07‑10 | ✅ Đã duyệt | ✅ TSX tạo xong | ✅ Ảnh có | ✅ SEO OK | 2026‑07‑15 |
| Ẩn danh tài liệu pháp lý (dự kiến) | `anonymize-legal-documents` | 2026‑08‑01 | ⬜ Đang chuẩn bị | ⬜ Chưa tạo TSX | ⬜ Chưa có ảnh | ⬜ Chưa SEO | ⬜ Chưa xuất bản |
| Trích xuất dữ liệu có cấu trúc từ PDF (dự kiến) | `structured-data-extraction` | 2026‑09‑01 | ⬜ Đang chuẩn bị | ⬜ Chưa tạo TSX | ⬜ Chưa có ảnh | ⬜ Chưa SEO | ⬜ Chưa xuất bản |

**Ghi chú:**
- Các cột “Trạng thái” được đánh dấu bằng:
  - ✅ Hoàn thành
  - ⬜ Chưa bắt đầu / Đang chuẩn bị
- Khi một mục chuyển sang trạng thái “✅” thì Cline phải cập nhật tương ứng trong `shared/knowledgeArticles.ts` và trong hệ thống Routing/SEO.