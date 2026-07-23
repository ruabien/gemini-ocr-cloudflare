# Quy trình Vận hành của Cline (Cline Workflow)

Tài liệu này quy định các bước làm việc bắt buộc dành cho Cline khi tham gia vào quy trình quản lý, chuyển đổi và xuất bản bài viết Knowledge trên LexOCR.

---

## 1. Nguồn nội dung (Single Source of Truth)

- File Markdown lưu tại `content/knowledge/` là bản nội dung đã được người dùng phê duyệt và là **nguồn chân lý duy nhất**.
- Cline phải luôn đọc nội dung từ file Markdown nguồn trước khi thực hiện bất kỳ thao tác tạo hay sửa đổi file TSX nào trên ứng dụng.

---

## 2. Các Giới Hạn và Nguyên Tắc (Điều Cline KHÔNG ĐƯỢC làm)

Để đảm bảo tính toàn vẹn của nội dung và cấu trúc hệ thống, Cline tuyệt đối **KHÔNG ĐƯỢC**:
- **Tự viết thêm nội dung:** Không tự ý sáng tạo thông tin, đưa thêm ý kiến cá nhân hoặc phân tích ngoài nội dung Markdown nguồn cung cấp.
- **Tự xóa hoặc rút gọn nội dung:** Phải chuyển đổi toàn vẹn 100% văn bản từ Markdown sang component TSX.
- **Tự diễn đạt lại câu chữ:** Giữ nguyên từng câu, từng từ của bài viết đã được phê duyệt.
- **Tự thay đổi tiêu đề hoặc Heading:** Các thẻ H1, H2, H3, H4 phải trùng khớp hoàn toàn.
- **Tự thay đổi Slug:** Phải sử dụng slug được quy định sẵn trong Front Matter.
- **Tự tối ưu SEO bằng cách sửa nội dung:** Không tự ý thay đổi mật độ từ khóa hoặc chèn thêm từ khóa vào văn bản gốc.
- **Tự thêm/xóa FAQ hoặc CTA:** Chỉ chuyển đổi đúng những gì có trong Markdown nguồn.
- **Tự tạo số liệu, dẫn chứng:** Tránh tuyệt đối việc bịa đặt hoặc tự động bổ sung số liệu chứng minh.
- **Tự cài đặt thư viện/package:** Không cài thêm bất cứ package npm nào ngoài các thư viện hiện có trong `package.json`.
- **Tự chuyển đổi kiến trúc sang Markdown/MDX Renderer:** Không cài đặt các thư viện như `react-markdown` hay thiết lập MDX webpack loader.
- **Tự ý thay đổi UI/UX chung:** Không sửa đổi các component hiển thị dùng chung hoặc bố cục layout trang chi tiết.

---

## 3. Các Hành Động Được Phép (Điều Cline CẦN thực hiện)

Khi xuất bản một bài viết từ bản Markdown nguồn, Cline thực hiện các bước sau:

1. **Đọc Markdown:** Đọc file Markdown nguồn tại `content/knowledge/` và phân tích Front Matter cũng như cấu trúc nội dung.
2. **Tạo React Component TSX:**
   - Tạo file `.tsx` mới trong thư mục `src/knowledge/content/` đặt tên theo quy tắc PascalCase (ví dụ: `ChuyenPdfScanSangWord.tsx`).
   - Sử dụng các thẻ JSX tương ứng để render heading, đoạn văn, blockquote, danh sách, và bảng biểu.
   - Chuyển đổi phần Câu hỏi thường gặp thành component Accordion/FAQ nếu giao diện có sẵn component này.
   - Chuyển đổi internal link thành thẻ JSX `<a>` hoặc component Link tương ứng với class CSS chuẩn.
3. **Ánh xạ Metadata:**
   - Đọc các trường dữ liệu từ Front Matter.
   - Ánh xạ chính xác các trường này và thêm một phần tử cấu hình bài viết mới vào mảng `knowledgeArticles` trong `shared/knowledgeArticles.ts`.
4. **Cấu hình Ánh xạ Route:**
   - Cập nhật file ánh xạ slug của bài viết (ví dụ: `src/knowledge/KnowledgeArticle.tsx` hoặc `src/knowledge/knowledgeNavigation.ts`) để liên kết component bài viết mới với slug tương ứng.
5. **Kiểm tra Cloudflare SEO:**
   - Xác nhận file cấu hình SEO của Cloudflare Pages Function (tại `functions/knowledge/[[slug]].ts`) đã có thể nhận diện và lấy đúng metadata của slug mới.
6. **Kiểm tra Kỹ thuật:**
   - Chạy các lệnh kiểm tra cú pháp, formatter (nếu có), TypeScript check (`npm run type-check`) và chạy thử lệnh build (`npm run build`) để đảm bảo không phát sinh lỗi compile.
7. **Báo cáo tài sản còn thiếu:** Báo cáo cho người dùng nếu phát hiện thiếu hình ảnh hoặc đường link nội bộ chưa hợp lệ trước khi hoàn tất.

---

## 4. Quy trình xử lý khi phát hiện Vấn đề

Nếu trong quá trình xử lý, Cline phát hiện một trong các lỗi sau:
- Trùng lặp slug với bài viết đã có.
- Front Matter bị thiếu các trường dữ liệu bắt buộc.
- Liên kết nội bộ trỏ đến một trang không tồn tại.
- Thiếu tệp ảnh thực tế trong thư mục `public/images/knowledge/{slug}/`.
- Cấu trúc Markdown nguồn bị lỗi cú pháp hoặc không thể ánh xạ sang React component hiện tại.

**Quy trình xử lý bắt buộc:**
1. **Dừng thực hiện:** Ngay lập tức tạm dừng công việc tại phần phát hiện lỗi.
2. **Báo cáo chi tiết:** Gửi thông báo rõ ràng cho người dùng về file, dòng, nội dung bị lỗi và nguyên nhân cụ thể.
3. **Đề xuất giải pháp:** Đưa ra các phương án khắc phục kỹ thuật cụ thể.
4. **Chờ phê duyệt:** Chỉ tiếp tục triển khai khi nhận được sự đồng ý rõ ràng từ người dùng.

---

## 5. Định nghĩa Hoàn thành (Definition of Done)

Một bài viết được coi là đã xuất bản thành công khi đáp ứng đầy đủ các tiêu chí:
- [ ] File TSX của bài viết được tạo đúng thư mục `src/knowledge/content/` và không có lỗi cú pháp.
- [ ] Nội dung hiển thị trong component TSX khớp hoàn toàn 100% với bản Markdown gốc đã duyệt.
- [ ] Metadata của bài viết được khai báo đầy đủ và đúng kiểu dữ liệu trong `shared/knowledgeArticles.ts`.
- [ ] Route ánh xạ `/knowledge/{slug}` hoạt động bình thường, render đúng component bài viết.
- [ ] Cloudflare Function trả về đúng SEO metadata tương ứng với slug trên môi trường Server-side.
- [ ] Các liên kết nội bộ trong bài viết hoạt động chính xác, không bị gãy (broken links).
- [ ] Dự án vượt qua các bước kiểm tra Type-check và Build thành công mà không có cảnh báo nghiêm trọng nào.