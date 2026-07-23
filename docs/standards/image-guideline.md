# Hướng dẫn Quản lý và Sử dụng Hình ảnh (Image Guideline)

Tài liệu này quy định cách quản lý thư mục, định dạng file, đặt tên và kết xuất hình ảnh trong các bài viết thuộc Knowledge Center của LexOCR.

## 1. Quy ước Thư mục Lưu trữ Ảnh

Tất cả hình ảnh sử dụng cho bài viết Knowledge phải được lưu trữ trong thư mục public tương ứng:

```
public/images/knowledge/{slug}/
```

Trong đó `{slug}` là slug duy nhất của bài viết. Ví dụ, bài viết có slug `chuyen-pdf-scan-sang-word` sẽ lưu ảnh tại:
`public/images/knowledge/chuyen-pdf-scan-sang-word/`

> **Lưu ý:** Giao diện bài viết trên frontend sẽ truy cập ảnh qua đường dẫn tương đối `/images/knowledge/{slug}/{filename}`.

## 2. Quy chuẩn Định dạng và Đặt tên File

- **Định dạng ưa thích:** **WebP** (`.webp`) để tối ưu hóa dung lượng tải trang và SEO hình ảnh.
- **Tên file khuyến nghị (mô tả mục đích sử dụng):**
  - `hero.webp`: Ảnh đại diện chính của bài viết (ở đầu bài viết).
  - `pdf-vs-scan.webp`: Ảnh so sánh giữa file PDF văn bản và PDF quét.
  - `ocr-vs-ai.webp`: Ảnh mô tả sự khác biệt hoặc quy trình OCR truyền thống và AI OCR.
  - `ai-workflow.webp`: Sơ đồ quy trình hoạt động của AI.
  - `lexocr-ai.webp`: Ảnh giao diện làm việc chính của LexOCR.
  - `{step-number}-{action-description}.webp`: Ví dụ: `step-1-google-ai-studio.webp` để chỉ các bước thực hiện.
- **Quy tắc đặt tên file:**
  - Viết thường hoàn toàn, không dấu.
  - Sử dụng dấu gạch ngang `-` để phân tách các từ (kebab-case).
  - Tránh đặt tên chung chung vô nghĩa như `image1.png`, `capture.jpg`.

## 3. Quy chuẩn Thẻ Mô tả Ảnh (Alt Text)

- **Bắt buộc:** Mọi hình ảnh được nhúng vào bài viết phải có thuộc tính `alt` (Alt text).
- **Quy tắc viết Alt text:**
  - Mô tả rõ ràng nội dung hiển thị trong bức ảnh để hỗ trợ trình đọc màn hình (cho người khiếm thị) và bot tìm kiếm (Googlebot Image).
  - Không nhồi nhét từ khóa SEO một cách gượng ép.
  - Phải ghi bằng tiếng Việt có dấu, mô tả đúng hành động hoặc giao diện trong ảnh.
  - Ví dụ tốt: `alt="Giao diện làm việc chính sau khi đăng nhập Google AI Studio"`
  - Ví dụ không tốt: `alt="Gemini API Key, Google AI Studio, OCR LexOCR, OCR PDF"`

## 4. Cách sử dụng Hình ảnh trong Markdown và React/TSX

### A. Trong bản gốc Markdown:

Sử dụng cú pháp Markdown chuẩn với đường dẫn tương đối `/images/...`:

```markdown
![Giao diện đăng nhập Google AI Studio bằng tài khoản Gmail](/images/knowledge/huong-dan-tao-gemini-api-key/step-1-google-ai-studio.webp)
```

### B. Trong React Component (TSX):

Sử dụng component `ArticleImage` (được định nghĩa trong `src/knowledge/KnowledgeArticle.tsx`) để tự động áp dụng các style nhất quán và thêm chú thích (caption) dưới ảnh:

```tsx
import { ArticleImage } from '../KnowledgeArticle';

// Trong JSX:
<ArticleImage
  src="/images/knowledge/huong-dan-tao-gemini-api-key/step-1-google-ai-studio.webp"
  alt="Giao diện đăng nhập Google AI Studio bằng tài khoản Gmail"
  caption="Giao diện làm việc chính sau khi đăng nhập Google AI Studio"
/>
```

## 5. Xử lý khi Thiếu Hình ảnh (Assets)

Trong trường hợp Cline tạo hoặc cập nhật file TSX từ Markdown nhưng file ảnh thực tế chưa được bàn giao hoặc chưa upload lên thư mục `public/`:
- **Không tự tạo ảnh giả (placeholder image) dạng nhị phân/file thực tế.**
- **Cách xử lý:** Giữ nguyên đường dẫn `/images/knowledge/{slug}/{filename}.webp` cùng thẻ `alt` chuẩn trong code TSX. 
- **Tuyệt đối:** Không được làm build hệ thống thất bại hoặc crash giao diện do thiếu asset ảnh. Component `KnowledgeImage` cần có cơ chế hiển thị thay thế an toàn hoặc ẩn đi nếu lỗi tải ảnh xảy ra.