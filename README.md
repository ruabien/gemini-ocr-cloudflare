# LexOCR

Web OCR tiếng Việt — miễn phí, chạy trực tiếp trên trình duyệt.

Chuyển PDF scan và ảnh chụp tài liệu sang text tiếng Việt. Không cần đăng nhập, không gửi file lên server.

## Tính năng

- **Chuyển PDF & ảnh sang text tiếng Việt** — hỗ trợ PDF, JPG, PNG
- **Xử lý trực tiếp trên trình duyệt** — Tesseract.js, không upload file lên server
- **Miễn phí** — giới hạn 20 trang mỗi lần bóc tách
- **Batch upload** — kéo thả nhiều ảnh cùng lúc
- **Xuất TXT và Copy nhanh** — không cần đăng nhập

## Tech stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS
- **OCR engine:** Tesseract.js (client-side, chạy trong Web Worker)
- **Hosting:** Cloudflare Pages
- **Domain:** lexocr.com
- **Auth:** Firebase (tùy chọn, chỉ dùng cho trang Settings)

## Phát triển local

npm install
npm run dev

Mở http://localhost:5173

## Scripts

| Lệnh | Mô tả |
|------|-------|
| npm run dev | Chạy dev server |
| npm run build | Build production |
| npm run preview | Xem trước production build |
| npm run typecheck | Kiểm tra TypeScript |
| npm run lint | Chạy ESLint |
| npm test | Chạy test suite |

## Deploy

Push lên nhánh main → Cloudflare Pages tự động build và deploy lên lexocr.com.

## Desktop Pro

LexOCR Desktop Pro — phiên bản offline dành cho nhu cầu xử lý số lượng lớn và bảo mật cao. Xem chi tiết tại /upgrade trên website.

## Tài liệu nội bộ

- docs/README.md — Quy chuẩn Knowledge Center và quy trình xuất bản bài viết
- docs/standards/ — Quy chuẩn văn phong, metadata, hình ảnh
- docs/roadmap/ — Định hướng nội dung và SEO