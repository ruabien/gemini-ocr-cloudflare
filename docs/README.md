# Tài liệu Quy trình & Quy chuẩn Nội dung Hướng dẫn (Knowledge Center) - LexOCR

Tài liệu này định nghĩa quy chuẩn và quy trình làm việc để quản lý, cập nhật và xuất bản các bài viết hướng dẫn trong chuyên mục Knowledge của LexOCR (https://lexocr.com/knowledge).

---

## 1. Kiến trúc Hệ thống Hiện tại

Chuyên mục Knowledge của LexOCR hoạt động dựa trên mô hình kết hợp giữa Single Page Application (SPA) của React và Cloudflare Pages Functions để tối ưu SEO:

1. **Giao diện bài viết (Frontend):** 
   - Mỗi bài viết được triển khai dưới dạng một React component TSX độc lập nằm trong thư mục `src/knowledge/content/`.
   - Các component này sử dụng các component dùng chung như `KnowledgeArticleTemplate`, `TipBox`, `NoteBox`, `ResultBox`, `ArticleImage` để đảm bảo tính nhất quán về giao diện.
2. **Quản lý Metadata:**
   - Thông tin metadata của toàn bộ bài viết (bao gồm tiêu đề, mô tả, ngày đăng, thời gian đọc, ảnh đại diện, từ khóa, bài viết liên quan) được cấu hình tập trung trong file `shared/knowledgeArticles.ts` dưới dạng mảng `knowledgeArticles` kiểu `KnowledgeArticleMeta`.
3. **Định tuyến (Routing):**
   - Route `/knowledge/[slug]` sẽ tải component `KnowledgeArticle.tsx`, tại đây component bài viết tương ứng sẽ được chọn và render dựa trên giá trị `slug`.
4. **Cloudflare SEO (Server-side Metadata):**
   - Cloudflare Pages Function tại `functions/knowledge/[[slug]].ts` nhận yêu cầu từ client, đối chiếu slug để tìm metadata tương ứng từ `shared/knowledgeArticles.ts`.
   - Nó sử dụng `HTMLRewriter` để chèn động các thẻ meta SEO (`title`, `description`, `canonical`, `og:image`, `og:title`, v.v.) trực tiếp vào HTML trả về, giúp bot tìm kiếm (Googlebot, Bingbot,...) lập chỉ mục chuẩn xác.

> **QUAN TRỌNG:** Kiến trúc này đang hoạt động ổn định và phải được giữ nguyên. Markdown chỉ được sử dụng làm nguồn nội dung bàn giao, không phải hệ thống render trực tiếp trên production. Không cài thêm thư viện MDX hoặc Markdown renderer nào vào ứng dụng web.

---

## 2. Quy trình Phối hợp Chuẩn (ChatGPT & Cline)

Quy trình quản lý và xuất bản một bài viết mới hoặc cập nhật bài cũ diễn ra theo các bước sau:

```
[ChatGPT] Nghiên cứu & viết bài (Markdown gốc)
  │
  ▼
[Người dùng] Kiểm duyệt và phê duyệt nội dung
  │
  ▼
[Lưu trữ] Lưu file Markdown vào thư mục `content/knowledge/`
  │
  ▼
[Cline] Đọc Markdown và chuyển đổi sang React component TSX trong `src/knowledge/content/`
  │
  ▼
[Cline] Đăng ký metadata vào `shared/knowledgeArticles.ts`
  │
  ▼
[Cline] Cấu hình ánh xạ slug trong `src/knowledge/KnowledgeArticle.tsx`
  │
  ▼
[Cline] Chạy lint, typecheck và chạy build để kiểm tra lỗi
  │
  ▼
[Người dùng] Duyệt sản phẩm và tiến hành deploy lên Cloudflare Pages
```

### Quy tắc đồng bộ:
- Không chỉnh sửa câu chữ hoặc cấu trúc nội dung bài viết trực tiếp trong file TSX mà không đồng bộ lại file Markdown nguồn tại `content/knowledge/`.
- File Markdown trong `content/knowledge/` là "Nguồn chân lý duy nhất" (Single Source of Truth) về mặt nội dung.

---

## 3. Cấu trúc Thư mục Tài liệu Nội bộ

Hệ thống tài liệu được tổ chức như sau:

```
docs/
├── README.md                  # Hướng dẫn tổng quan (File này)
├── standards/                 # Quy chuẩn triển khai nội dung
│   ├── article-template.md    # Template cấu trúc bài viết Markdown chuẩn
│   ├── style-guide.md         # Quy chuẩn văn phong, cấu trúc bài viết tiếng Việt
│   ├── metadata-standard.md   # Quy chuẩn ánh xạ Front Matter sang Production Metadata
│   ├── image-guideline.md     # Quy ước quản lý và sử dụng hình ảnh
│   ├── internal-linking.md    # Chiến lược liên kết nội bộ (Internal Links)
│   └── cline-workflow.md      # Quy trình làm việc tự động hóa dành cho Cline
└── roadmap/                   # Định hướng phát triển nội dung
    ├── topic-cluster.md       # Phân nhóm nội dung (Topic Cluster)
    ├── keyword-roadmap.md     # Kế hoạch từ khóa SEO
    └── publishing-plan.md     # Kế hoạch xuất bản và trạng thái triển khai
```

Mục tiêu của hệ thống tài liệu này nhằm chuẩn hóa quy trình biên tập nội dung, tối ưu hóa SEO và thiết lập quy tắc hoạt động tự động hóa an toàn cho AI coding assistant (Cline) mà không làm ảnh hưởng đến hiệu năng hay mã nguồn của website LexOCR.