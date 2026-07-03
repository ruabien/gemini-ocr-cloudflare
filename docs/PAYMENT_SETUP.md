# Hướng Dẫn Cấu Hình Hạ Tầng Thanh Toán PayOS & Firestore cho LexOCR

Tài liệu này hướng dẫn chi tiết các bước chuẩn bị hạ tầng thanh toán, cơ sở dữ liệu và cấu hình bảo mật phục vụ cho việc tích hợp thanh toán PayOS và quản lý gói PRO của LexOCR.

---

## 1. Tạo Tài Khoản và Lấy Thông Tin Cấu Hình PayOS

### Bước 1: Đăng ký tài khoản PayOS
- Truy cập vào trang quản trị [PayOS](https://payos.vn/) và tạo tài khoản doanh nghiệp hoặc cá nhân.

### Bước 2: Tạo Kênh Thanh Toán (Project)
- Truy cập vào Dashboard PayOS, chọn mục **Kênh thanh toán** (Payment Channels) và tạo mới một kênh thanh toán.
- Đặt tên dự án là `LexOCR`.

### Bước 3: Lấy các khóa bảo mật (API Credentials)
Sau khi tạo kênh thành công, bạn sẽ nhận được 3 thông số cấu hình quan trọng:
1. `Client ID`
2. `API Key`
3. `Checksum Key`

*Lưu ý: Giữ các khóa này tuyệt mật, không lưu trữ hoặc chia sẻ chúng ở mã nguồn frontend.*

---

## 2. Cấu Hình Secrets trên Cloudflare

Các khóa bảo mật của PayOS và thông tin xác thực Firebase Admin (nếu có) phải được lưu trữ dưới dạng **Secrets** trên Cloudflare.

### Đối với môi trường Local Development (`.dev.vars`)
Tạo hoặc cập nhật file `.dev.vars` ở thư mục chạy worker (ví dụ: `cf-worker/` hoặc thư mục dự án) với nội dung sau:
```env
PAYOS_CLIENT_ID=your_client_id_here
PAYOS_API_KEY=your_api_key_here
PAYOS_CHECKSUM_KEY=your_checksum_key_here
# Thêm Firebase Service Account JSON nếu Backend kết nối trực tiếp đến Firestore bằng Admin SDK
FIREBASE_SERVICE_ACCOUNT_JSON={"type": "service_account", ...}
```

### Môi trường Production (Cloudflare Pages/Workers)
Sử dụng công cụ `wrangler` hoặc Dashboard Cloudflare để cấu hình:

```bash
# Thêm các secret thông qua dòng lệnh Wrangler
wrangler secret put PAYOS_CLIENT_ID
wrangler secret put PAYOS_API_KEY
wrangler secret put PAYOS_CHECKSUM_KEY
wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
```
Hoặc cấu hình trực tiếp trên giao diện trang quản trị **Cloudflare Dashboard -> Workers & Pages -> Settings -> Variables -> Environment Variables**.

---

## 3. Tạo Cơ Sở Dữ Liệu Firestore (Firebase)

Dự án hiện tại đang dùng Firebase Auth để đăng nhập, do đó chúng ta sẽ sử dụng Firestore để quản lý thông tin gói và giao dịch thanh toán để tận dụng tính năng đồng bộ thời gian thực (Real-time sync).

### Các bước thực hiện:
1. Truy cập vào [Firebase Console](https://console.firebase.google.com/).
2. Chọn dự án `lexocr-ec982`.
3. Nhấp vào **Firestore Database** ở menu bên trái và nhấp vào **Create database**.
4. Chọn vị trí lưu trữ (VD: `asia-southeast1` cho tốc độ tối ưu tại Việt Nam).
5. Khởi động ở **Production mode** (chế độ sản xuất).

---

## 4. Cấu Hình Firestore Security Rules

Để đảm bảo bảo mật thông tin gói PRO và giao dịch thanh toán, người dùng ở frontend **chỉ được phép đọc** thông tin của chính mình và **không được phép tự ý thay đổi** các trường dữ liệu quan trọng như `plan`, `expiredAt`, `status`. Mọi hoạt động ghi dữ liệu phải được thực hiện bởi Backend (Cloudflare Worker).

Hãy cập nhật **Firestore Rules** trong tab **Rules** của Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Quyền truy cập cho collection users
    match /users/{userId} {
      // Chỉ cho phép user đã đăng nhập đọc thông tin cá nhân của chính mình
      allow read: if request.auth != null && request.auth.uid == userId;
      // Tuyệt đối không cho phép frontend tự ghi/cập nhật thông tin gói thành viên
      allow write: if false;
    }
    
    // Quyền truy cập cho collection payments
    match /payments/{paymentId} {
      // Chỉ cho phép user đọc lịch sử thanh toán của chính mình
      allow read: if request.auth != null && request.auth.uid == resource.data.uid;
      // Tuyệt đối không cho phép frontend tự tạo hoặc sửa đổi trạng thái thanh toán trực tiếp
      allow write: if false;
    }
  }
}
```

---

## 5. Cấu Hình Webhook URL trên PayOS

Webhook giúp PayOS tự động gửi tín hiệu về Backend của bạn ngay sau khi người dùng quét QR và thanh toán thành công.

1. Truy cập trang quản trị **PayOS**.
2. Chọn dự án `LexOCR` và tìm đến phần cấu hình **Webhook**.
3. Điền đường dẫn Webhook URL:
   - **Production:** `https://<your-custom-domain>/api/payments/webhook`
   - **Local Development:** Cần sử dụng các công cụ forward port như `ngrok` hoặc `localtunnel` để expose local worker (VD: `http://localhost:8787`) ra internet công cộng (VD: `https://abc-xyz.ngrok-free.app/api/payments/webhook`).
4. Bật chế độ webhook và lưu cấu hình.