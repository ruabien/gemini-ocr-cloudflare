import React from 'react';

export default function ChuyenPdfScanSangWord() {
  return (
    <div className="prose prose-slate max-w-none">
      <h2>Giới thiệu</h2>
      <p>
        Bài viết hướng dẫn chi tiết cách chuyển PDF scan sang định dạng Word
        bằng công cụ OCR LexOCR. Bạn sẽ học cách tải tài liệu, thực hiện OCR và
        xuất ra file .docx có thể chỉnh sửa.
      </p>

      <h2>Bước 1: Tải lên PDF scan</h2>
      <p>
        Đăng nhập vào LexOCR, chọn “Bóc tách tài liệu”, kéo thả file PDF
        scan vào khu vực tải lên hoặc nhấn nút “Chọn file”.
      </p>

      <h2>Bước 2: Chọn ngôn ngữ & khởi chạy OCR</h2>
      <p>
        Chọn ngôn ngữ “Tiếng Việt”, bật “Giữ bố cục” nếu muốn giữ layout gốc.
        Nhấn “Bóc tách” và chờ kết quả.
      </p>

      <h2>Bước 3: Xuất ra Word</h2>
      <p>
        Khi quá trình OCR hoàn tất, nhấn nút “Xuất Word”. File .docx sẽ được
        tải về, bạn có thể mở bằng Microsoft Word hoặc Google Docs để chỉnh sửa.
      </p>

      <h2>Mẹo</h2>
      <ul>
        <li>Đảm bảo PDF có độ phân giải tối thiểu 300 DPI để kết quả tốt.</li>
        <li>Sử dụng tính năng “Tìm kiếm & Thay thế” trong Word để nhanh
          chỉnh sửa các lỗi nhận dạng.</li>
        <li>Nếu văn bản bị lệch, thử bật “Bảo toàn bố cục” trong cài đặt.</li>
      </ul>

      <h2>Giới hạn tài khoản miễn phí</h2>
      <p>
        LexOCR cung cấp gói dịch vụ miễn phí phục vụ nhu cầu bóc tách tài liệu cơ bản với các giới hạn cụ thể như sau:
      </p>
      <ul>
        <li>Tối đa <strong>20 trang</strong> cho mỗi lần thực hiện bóc tách (20 trang/lần).</li>
        <li>Tối đa <strong>50 trang</strong> mỗi ngày (50 trang/ngày).</li>
      </ul>
      <p>
        Nếu bạn có nhu cầu xử lý tài liệu lớn hơn và cần tốc độ ưu tiên cao, bạn có thể nâng cấp lên gói dịch vụ PRO.
      </p>

      <h2>Kết luận</h2>
      <p>
        Với LexOCR, việc chuyển PDF scan sang Word trở nên nhanh chóng và
        chính xác, giúp tiết kiệm thời gian nhập liệu thủ công.
      </p>

      <div className="mt-8">
        <button
          onClick={() => {
            // Navigate client-side directly to the OCR tool
            window.history.pushState({ activeTab: 'scanner' }, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate', { state: { activeTab: 'scanner' } }));
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Bắt đầu bóc tách tài liệu
        </button>
      </div>
    </div>
  );
}