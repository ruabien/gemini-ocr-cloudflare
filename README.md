# Gemini & OCR.space Cloudflare Page App

Ứng dụng OCR tài liệu nâng cao sử dụng mô hình Google Gemini 2.5 Flash kết hợp cơ chế dự phòng thông minh (Fallback) qua OCR.space API. Hệ thống được thiết kế để chạy trực tiếp trên nền tảng Cloudflare Pages.

## 🚀 Tính năng nổi bật
- **Gemini OCR chính:** Sử dụng mô hình Gemini 2.5 Flash mạnh mẽ với cơ chế xoay tua khóa tự động (Gemini Key Pool Rotation).
- **OCR.space Fallback thông minh:** Tự động chuyển đổi sang dịch vụ dự phòng OCR.space khi Gemini gặp lỗi (như lỗi chặn bản quyền RECITATION).
- **Xoay tua khóa OCR.space:** Hỗ trợ cấu hình pool nhiều API keys OCR.space để tự động thay thế và xoay vòng (Round-robin) khi có key bị hết hạn mức (Quota Exceeded), giới hạn tần suất (Rate limit), hoặc lỗi tạm thời (Timeout/Server error).
- **Phân loại lỗi thông minh (Smart Error Classification):**
  - *Trigger xoay key:* Quota exceeded, too many requests, temporary unavailable, timeout, transient network issue.
  - *Dừng ngay (Fail Fast):* Language invalid (E201), bad request (400), file too large (413), malformed form-data, invalid request structure.

---

## 🛠️ Cấu hình môi trường trên Cloudflare (Secrets Configuration)

Để kích hoạt tính năng xoay tua key OCR.space trên Cloudflare Pages, bạn cần cấu hình các biến môi trường bảo mật (Secrets) trong Dashboard của dự án Cloudflare Pages:

1. Truy cập vào **Cloudflare Dashboard** -> chọn **Workers & Pages**.
2. Chọn dự án **doc-hotro** (hoặc tên dự án Pages của bạn).
3. Đi đến tab **Settings** -> chọn mục **Environment variables**.
4. Thêm các biến môi trường mới tại mục **Production** (hoặc **Preview**):

| Tên biến môi trường (Environment Variable) | Mô tả |
|---|---|
| `OCR_SPACE_API_KEY` | API Key OCR.space chính / mặc định (Được ưu tiên load đầu tiên) |
| `OCR_SPACE_API_KEY_1` | API Key OCR.space thứ 2 |
| `OCR_SPACE_API_KEY_2` | API Key OCR.space thứ 3 |

5. Nhấn **Save** để lưu cấu hình. Các thay đổi sẽ có hiệu lực trong lần triển khai (Deploy) tiếp theo.

---

## 📦 Phát triển cục bộ (Local Development)

### 1. Cài đặt các gói phụ thuộc:
```bash
npm install
```

### 2. Chạy ứng dụng Frontend ở chế độ Dev:
```bash
npm run dev
```

### 3. Triển khai backend Pages Functions cục bộ (Yêu cầu Wrangler):
Bạn có thể chạy kiểm thử backend Pages Functions bằng lệnh:
```bash
npx wrangler pages dev
```
Hoặc cấu hình các biến môi trường trực tiếp trong file cấu hình local hoặc truyền qua CLI khi chạy dev server.

---

## 🧪 Tài liệu Kiểm thử (Test Cases)

Hệ thống xoay tua khóa dự phòng được kiểm thử nghiêm ngặt dựa trên các trường hợp sau:
1. **Key 1 hết hạn mức (Quota Exceeded) -> Key 2 thành công:** Hệ thống ghi nhận lỗi Key 1, chuyển sang Key 2 để hoàn thành OCR và cập nhật trạng thái `lastSuccessfulKeyIndex` là Key 2.
2. **Key 1 bị quá thời gian (Timeout) -> Key 2 thành công:** Chờ 45 giây và tự động abort request Key 1, sau đó thử và nhận diện thành công bằng Key 2.
3. **Key 1 lỗi cấu hình ngôn ngữ (E201) -> Báo lỗi ngay lập tức:** Không xoay sang các key tiếp theo để tránh lãng phí hạn mức khi có lỗi cấu hình nghiêm trọng.
4. **Tất cả các Key đều thất bại:** Trả về mã lỗi `ALL_KEYS_FAILED` kèm chi tiết breakdown lý do lỗi của từng key để nhà phát triển dễ dàng rà soát.
