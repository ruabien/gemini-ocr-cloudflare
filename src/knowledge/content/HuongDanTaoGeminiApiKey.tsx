import React from 'react';
import { TipBox, NoteBox, ResultBox, ArticleImage } from '../KnowledgeArticle';

export default function HuongDanTaoGeminiApiKey() {
  const handleStartOcr = () => {
    window.history.pushState({ activeTab: 'scanner' }, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate', { state: { activeTab: 'scanner' } }));
  };

  return (
    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
      {/* Giới thiệu */}
      <section className="mb-10">
        <h2 id="gioi-thieu" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Giới thiệu
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Chào mừng bạn đến với LexOCR! Để sử dụng các tính năng bóc tách tài liệu thông minh như chuyển đổi PDF scan sang Word, trích xuất bảng biểu sang Excel, hay phân tích dữ liệu chuyên sâu, bạn cần cấu hình một <strong>Gemini API Key</strong> cá nhân. Bài viết này sẽ hướng dẫn bạn cách tạo API Key miễn phí từ Google chỉ trong vòng 3 phút.
        </p>
      </section>

      {/* Vì sao LexOCR cần Gemini API Key */}
      <section className="mb-10">
        <h2 id="vi-sao-lexocr-can-gemini-api-key" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Vì sao LexOCR cần Gemini API Key
        </h2>
        <p className="text-base text-slate-600 mb-4">
          LexOCR sử dụng mô hình trí tuệ nhân tạo thế hệ mới Gemini của Google để nhận dạng chữ viết, xử lý ngôn ngữ tự nhiên và định dạng bố cục tài liệu. Việc sử dụng API Key cá nhân của chính bạn mang lại nhiều lợi ích vượt trội:
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
          <ul className="list-none p-0 m-0 space-y-3">
            <li className="flex items-start text-sm sm:text-base text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2.5 mt-2 shrink-0"></span>
              <span><strong>Tốc độ xử lý vượt trội:</strong> Bạn được ưu tiên băng thông riêng từ Google, giảm thiểu tình trạng nghẽn hàng đợi khi hệ thống công cộng quá tải.</span>
            </li>
            <li className="flex items-start text-sm sm:text-base text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2.5 mt-2 shrink-0"></span>
              <span><strong>Bảo mật tối đa:</strong> Toàn bộ dữ liệu tài liệu của bạn được gửi trực tiếp đến API Google AI, không đi qua và không lưu lại trên máy chủ của LexOCR.</span>
            </li>
            <li className="flex items-start text-sm sm:text-base text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2.5 mt-2 shrink-0"></span>
              <span><strong>Tiết kiệm chi phí:</strong> Tận dụng chính sách cung cấp hạn mức miễn phí (Free Tier) cực kỳ hào phóng từ Google AI Studio.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Bước 1: Truy cập Google AI Studio */}
      <section className="mb-10">
        <h2 id="buoc-1-truy-cap-google-ai-studio" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bước 1: Truy cập Google AI Studio
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Trước tiên, hãy truy cập vào công cụ quản lý nhà phát triển chính thức của Google: <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-650 hover:text-blue-800 underline font-semibold">Google AI Studio</a>. Đăng nhập bằng tài khoản Google (Gmail) cá nhân hoặc công việc của bạn.
        </p>
        <ArticleImage
          src="/knowledge/huong-dan-tao-gemini-api-key/step-1-google-ai-studio.webp"
          alt="Giao diện đăng nhập Google AI Studio bằng tài khoản Gmail"
          caption="Giao diện làm việc chính sau khi đăng nhập Google AI Studio"
        />
        <TipBox>
          Nếu đây là lần đầu truy cập, Google sẽ hiển thị các điều khoản dịch vụ phát triển. Bạn chỉ cần tick đồng ý để tiếp tục.
        </TipBox>
      </section>

      {/* Bước 2: Tạo API Key */}
      <section className="mb-10">
        <h2 id="buoc-2-tao-api-key" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bước 2: Tạo API Key
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Tại thanh điều hướng bên trái hoặc góc trên màn hình, nhấp chuột vào nút <strong>Get API Key</strong> (biểu tượng chiếc chìa khóa). Tại trang quản lý chìa khóa, tiếp tục chọn <strong>Create API Key</strong>.
        </p>
        <ArticleImage
          src="/knowledge/huong-dan-tao-gemini-api-key/step-2-create-key.webp"
          alt="Nhấp chọn Get API Key và bấm nút Create API Key trong Google AI Studio"
          caption="Nhấp chọn nút Create API Key để mở hộp thoại cấu hình dự án"
        />
        <p className="text-base text-slate-600 mb-4">
          Hệ thống sẽ hiển thị một cửa sổ nhỏ yêu cầu bạn chọn một dự án Google Cloud có sẵn hoặc tạo một dự án mới tự động. Hãy chọn <strong>Create API key in new project</strong> (Tạo API key trong dự án mới) để thao tác nhanh nhất.
        </p>
      </section>

      {/* Bước 3: Copy API Key */}
      <section className="mb-10">
        <h2 id="buoc-3-copy-api-key" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bước 3: Copy API Key
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Sau khi Google xử lý khởi tạo dự án trong vài giây, một hộp thoại chứa chuỗi ký tự dài (khởi đầu bằng chữ <code>AIzaSy...</code>) sẽ xuất hiện. Đây chính là Gemini API Key của bạn. Nhấp vào nút <strong>Copy</strong> để sao chép mã này vào bộ nhớ tạm.
        </p>
        <ArticleImage
          src="/knowledge/huong-dan-tao-gemini-api-key/step-3-copy-key.webp"
          alt="Sao chép chuỗi API Key vừa được khởi tạo"
          caption="Sao chép mã API Key an toàn và lưu ý không chia sẻ công khai"
        />
        <NoteBox>
          API Key này giống như mật khẩu tài khoản của bạn. Tuyệt đối không chia sẻ mã này lên mạng hoặc gửi cho người lạ để tránh bị sử dụng hết hạn ngạch miễn phí.
        </NoteBox>
      </section>

      {/* Bước 4: Mở trang Cài đặt LexOCR */}
      <section className="mb-10">
        <h2 id="buoc-4-mo-trang-cai-dat-lexocr" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bước 4: Mở trang Cài đặt LexOCR
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Quay trở lại ứng dụng <a href="/" className="text-blue-650 hover:text-blue-800 underline font-semibold">LexOCR</a>. Tại menu phía trên hoặc góc phải màn hình, nhấp chọn mục <strong>Cài đặt</strong> (hoặc biểu tượng Bánh răng) để mở bảng điều khiển cấu hình hệ thống.
        </p>
        <ArticleImage
          src="/knowledge/huong-dan-tao-gemini-api-key/step-4-settings.webp"
          alt="Giao diện trang Cài đặt LexOCR cấu hình API Key"
          caption="Tìm và truy cập trang Cài đặt trên thanh menu LexOCR"
        />
      </section>

      {/* Bước 5: Dán API Key */}
      <section className="mb-10">
        <h2 id="buoc-5-dan-api-key" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bước 5: Dán API Key
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Tại phần <strong>Cấu hình Gemini API Key cá nhân</strong>, tìm ô nhập liệu dạng văn bản và dán (Ctrl+V hoặc Command+V) mã API Key bạn đã copy ở Bước 3 vào đó. Cuối cùng, nhấn nút <strong>Thêm và lưu Key</strong>.
        </p>
      </section>

      {/* Bước 6: Kiểm tra cấu hình thành công */}
      <section className="mb-10">
        <h2 id="buoc-6-kiem-tra-cau-hinh-thanh-cong" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bước 6: Kiểm tra cấu hình thành công
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Sau khi nhấn lưu, hệ thống sẽ xác thực cú pháp và lưu mã Key trực tiếp vào trình duyệt của bạn. Bạn sẽ thấy dòng trạng thái màu xanh lá cây thông báo: <code>🟢 Đã sẵn sàng sử dụng</code>.
        </p>
        <ArticleImage
          src="/knowledge/huong-dan-tao-gemini-api-key/step-5-success.webp"
          alt="Trạng thái lưu API Key thành công và hiển thị sẵn sàng sử dụng"
          caption="Khi cấu hình thành công, hệ thống sẽ hiển thị trạng thái hoạt động màu xanh lá"
        />
        <ResultBox>
          Chúc mừng! Từ giờ bạn đã có thể tải tài liệu lên và thực hiện OCR không giới hạn tốc độ.
        </ResultBox>
      </section>

      {/* Các câu hỏi thường gặp (FAQ) */}
      <section className="mb-10">
        <h2 id="cau-hoi-thuong-gap" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Câu hỏi thường gặp (FAQ)
        </h2>
        <div className="space-y-4">
          <details className="group border border-slate-250 rounded-xl p-4 bg-white hover:border-slate-350 transition-colors [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-semibold text-slate-900 cursor-pointer list-none focus:outline-none focus:text-blue-600">
              <span className="text-sm sm:text-base pr-4">Google AI Studio có thực sự miễn phí không?</span>
              <span className="transition group-open:rotate-180 text-slate-400 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-50 pt-3">
              Có, hoàn toàn miễn phí. Đối với các tài khoản thông thường phát triển ứng dụng, Google cung cấp hạn ngạch Free Tier cho mô hình Gemini 1.5 Flash hay Gemini 2.5 Flash rất lớn (thường khoảng 15 yêu cầu trên mỗi phút), quá đủ cho nhu cầu số hóa tài liệu cá nhân và văn phòng thường ngày.
            </p>
          </details>

          <details className="group border border-slate-250 rounded-xl p-4 bg-white hover:border-slate-350 transition-colors [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-semibold text-slate-900 cursor-pointer list-none focus:outline-none focus:text-blue-600">
              <span className="text-sm sm:text-base pr-4">Gemini API Key của tôi trên LexOCR có an toàn không?</span>
              <span className="transition group-open:rotate-180 text-slate-400 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-50 pt-3">
              Cực kỳ an toàn. Khóa API của bạn được lưu trữ cục bộ trong bộ nhớ trình duyệt cá nhân (LocalStorage) của bạn. LexOCR không chuyển khóa này về bất cứ máy chủ trung gian nào. Các lệnh gọi xử lý OCR được thực hiện trực tiếp từ máy của bạn tới cổng API của Google.
            </p>
          </details>

          <details className="group border border-slate-250 rounded-xl p-4 bg-white hover:border-slate-350 transition-colors [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-semibold text-slate-900 cursor-pointer list-none focus:outline-none focus:text-blue-600">
              <span className="text-sm sm:text-base pr-4">Tôi có thể cấu hình thêm nhiều API Key cùng lúc không?</span>
              <span className="transition group-open:rotate-180 text-slate-400 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-50 pt-3">
              Có. LexOCR hỗ trợ cơ chế lưu nhiều API Key và tự động đảo khóa (Key Rotation). Khi một API Key bị quá giới hạn lượt gọi (Rate Limit), hệ thống sẽ tự động chuyển sang Key tiếp theo trong danh sách để đảm bảo trải nghiệm bóc tách tài liệu của bạn diễn ra liên tục, không bị ngắt quãng.
            </p>
          </details>
        </div>
      </section>

      {/* Kết luận */}
      <section className="mb-10">
        <h2 id="ket-luan" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Kết luận
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Chỉ với vài thao tác cơ bản trên Google AI Studio, bạn đã sở hữu một Gemini API Key độc lập để khai thác tối đa tiềm năng công nghệ AI OCR trên LexOCR. Hãy bắt tay vào bóc tách các tập tin tài liệu của bạn ngay bây giờ!
        </p>
      </section>
    </div>
  );
}