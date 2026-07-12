import React from 'react';
import { TipBox, NoteBox, ResultBox, ArticleImage } from '../KnowledgeArticle';

export default function ChuyenPdfScanSangWord() {
  return (
    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
      {/* Giới thiệu */}
      <section className="mb-10">
        <h2 id="gioi-thieu" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Giới thiệu
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Chuyển đổi các tài liệu dạng PDF scan sang Word là nhu cầu phổ biến trong các văn phòng, công ty luật và nghiên cứu hồ sơ. Bài viết này hướng dẫn chi tiết cách thực hiện bằng công nghệ OCR trực tiếp trên LexOCR, giúp bạn tiết kiệm hàng giờ gõ lại văn bản thủ công.
        </p>
      </section>

      {/* Vì sao PDF scan không thể chỉnh sửa */}
      <section className="mb-10">
        <h2 id="vi-sao-pdf-scan-khong-the-chinh-sua" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Vì sao PDF scan không thể chỉnh sửa
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Khác với tài liệu PDF thông thường được xuất ra từ Microsoft Word hay Google Docs chứa sẵn dữ liệu ký tự dạng text, PDF scan thực chất chỉ là các file ảnh (chụp từ máy scan hoặc điện thoại) được đóng gói dưới định dạng PDF. 
        </p>
        <p className="text-base text-slate-600 mb-4">
          Vì máy tính chỉ hiểu chúng là tập hợp các điểm ảnh (pixels), bạn không thể bôi đen, tìm kiếm cụm từ hay sửa lỗi chính tả trực tiếp. Để làm được điều đó, chúng ta bắt buộc phải sử dụng công nghệ nhận dạng ký tự quang học (OCR) để phân tích hình ảnh và bóc tách thành văn bản thô.
        </p>
      </section>

      {/* Bước 1: Tải PDF scan */}
      <section className="mb-10">
        <h2 id="buoc-1-tai-pdf-scan" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bước 1: Tải PDF scan
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Để bắt đầu, bạn truy cập vào trang chủ LexOCR. Tại khu vực bóc tách tài liệu, kéo và thả trực tiếp file PDF cần chuyển đổi của bạn vào, hoặc bấm chọn file từ thiết bị của bạn.
        </p>
        <ArticleImage
          src="/knowledge/chuyen-pdf-scan-sang-word/step-1-upload.webp"
          alt="Giao diện tải tệp tin PDF scan lên hệ thống LexOCR"
          caption="Kéo thả hoặc chọn tệp PDF cần OCR tại màn hình chính"
        />
        <TipBox>
          Tài liệu scan rõ, thẳng và đủ sáng thường cho kết quả OCR tốt hơn.
        </TipBox>
      </section>

      {/* Bước 2: Bắt đầu OCR */}
      <section className="mb-10">
        <h2 id="buoc-2-bat-dau-ocr" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bước 2: Bắt đầu OCR
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Sau khi tệp tin đã tải lên thành công, chọn mục đích xử lý (xuất Word hoặc Excel). Bạn có thể tùy chọn thiết lập các thông số như bảo toàn bố cục để giữ nguyên cấu trúc dòng, cột của văn bản gốc. Nhấn nút <strong>Bóc tách</strong> để bắt đầu quá trình xử lý bằng AI.
        </p>
        <ArticleImage
          src="/knowledge/chuyen-pdf-scan-sang-word/step-2-ocr.webp"
          alt="Lựa chọn ngôn ngữ tiếng Việt và nhấn nút bóc tách tài liệu trên LexOCR"
          caption="Lựa chọn cấu hình phù hợp và khởi chạy bóc tách"
        />
        <NoteBox>
          LexOCR tập trung trích xuất nội dung chính xác; mức độ giữ nguyên bố cục phụ thuộc chất lượng tài liệu gốc.
        </NoteBox>
      </section>

      {/* Bước 3: Xuất Word */}
      <section className="mb-10">
        <h2 id="buoc-3-xuat-word" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bước 3: Xuất Word
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Khi hệ thống hoàn tất phân tích và bóc tách chữ, kết quả văn bản dạng text sẽ hiển thị ngay ở khung bên cạnh. Lúc này, bạn chỉ cần nhấn nút <strong>Xuất Word</strong> (hoặc tải xuống dưới dạng file .docx) để lưu tài liệu về máy tính của mình.
        </p>
        <ArticleImage
          src="/knowledge/chuyen-pdf-scan-sang-word/step-3-word.webp"
          alt="Tải xuống tệp tin kết quả định dạng Word .docx từ LexOCR"
          caption="Tải file kết quả Word dễ dàng sau khi hoàn thành OCR"
        />
        <ResultBox>
          Sau OCR, người dùng có thể chỉnh sửa nội dung và xuất Word.
        </ResultBox>
      </section>

      {/* Mẹo tăng độ chính xác */}
      <section className="mb-10">
        <h2 id="meo-tang-do-chinh-xac" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Mẹo tăng độ chính xác
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Để đảm bảo kết quả chuyển từ PDF sang Word ít bị lỗi chính tả nhất, bạn hãy lưu ý một số mẹo sau:
        </p>
        <ul className="list-disc pl-5 mb-4 text-slate-600 space-y-2 text-sm sm:text-base">
          <li><strong>Độ phân giải hình ảnh:</strong> Tài liệu scan có độ phân giải tối ưu là 300 DPI. Tránh sử dụng hình ảnh chụp quá mờ, rung hoặc bị bóng loáng.</li>
          <li><strong>Góc chụp:</strong> Đảm bảo văn bản thẳng đứng, không bị nghiêng quá nhiều hay bị biến dạng góc chụp.</li>
          <li><strong>Định dạng ngôn ngữ:</strong> Luôn chọn đúng ngôn ngữ của tài liệu để AI kích hoạt bộ từ điển sửa lỗi chính tả tương ứng.</li>
        </ul>
      </section>

      {/* Giới hạn gói Free */}
      <section className="mb-10">
        <h2 id="gioi-han-goi-free" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Giới hạn gói Free
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Tất cả tài khoản đăng ký mới trên LexOCR đều được kích hoạt gói Free hoàn toàn miễn phí. Để cân bằng hệ thống tài nguyên AI, gói Free có một số giới hạn bao gồm:
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
          <ul className="list-none p-0 m-0 space-y-3">
            <li className="flex items-center text-sm sm:text-base text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2.5 shrink-0"></span>
              Tối đa <strong> 20 trang</strong> cho mỗi lần thực hiện bóc tách (20 trang/lần).
            </li>
            <li className="flex items-center text-sm sm:text-base text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2.5 shrink-0"></span>
              Tối đa <strong> 50 trang</strong> bóc tách trong mỗi ngày (50 trang/ngày).
            </li>
          </ul>
        </div>
        <p className="text-base text-slate-600 mb-4">
          Đối với tài liệu quy mô lớn hơn hoặc để được ưu tiên xử lý không xếp hàng, bạn có thể cân nhắc nâng cấp lên gói PRO.
        </p>
      </section>

      {/* Before / After comparison */}
      <section className="mb-10">
        <ArticleImage
          src="/knowledge/chuyen-pdf-scan-sang-word/before-after.webp"
          alt="So sánh tài liệu gốc PDF scan và kết quả sau khi chuyển sang Word"
          caption="So sánh kết quả trước và sau khi thực hiện chuyển đổi qua LexOCR"
        />
      </section>

      {/* Câu hỏi thường gặp */}
      <section className="mb-10">
        <h2 id="cau-hoi-thuong-gap" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Câu hỏi thường gặp
        </h2>
        <div className="space-y-4">
          <details className="group border border-slate-250 rounded-xl p-4 bg-white hover:border-slate-350 transition-colors [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-semibold text-slate-900 cursor-pointer list-none focus:outline-none focus:text-blue-600">
              <span className="text-sm sm:text-base pr-4">1. PDF scan và PDF thông thường khác nhau thế nào?</span>
              <span className="transition group-open:rotate-180 text-slate-400 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-50 pt-3">
              PDF thông thường được tạo từ phần mềm soạn thảo như Word, lưu trữ trực tiếp thông tin văn bản số nên bạn có thể bôi đen copy dễ dàng. PDF scan được tạo từ máy ảnh chụp hoặc scan tài liệu giấy, máy tính chỉ thấy một khối ảnh điểm, không có thông tin text trừ khi chạy phần mềm OCR.
            </p>
          </details>

          <details className="group border border-slate-250 rounded-xl p-4 bg-white hover:border-slate-350 transition-colors [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-semibold text-slate-900 cursor-pointer list-none focus:outline-none focus:text-blue-600">
              <span className="text-sm sm:text-base pr-4">2. LexOCR có hỗ trợ tiếng Việt không?</span>
              <span className="transition group-open:rotate-180 text-slate-400 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-50 pt-3">
              Có. LexOCR sử dụng AI nhận diện ký tự quang học tiên tiến được tối ưu hóa đặc biệt cho tiếng Việt. Hệ thống nhận dạng chính xác kể cả các từ có dấu phức tạp, chữ in nghiêng, các văn bản có định dạng bảng hoặc các giấy tờ pháp lý lâu năm bị mờ nét.
            </p>
          </details>

          <details className="group border border-slate-250 rounded-xl p-4 bg-white hover:border-slate-350 transition-colors [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-semibold text-slate-900 cursor-pointer list-none focus:outline-none focus:text-blue-600">
              <span className="text-sm sm:text-base pr-4">3. Có thể OCR PDF nhiều trang không?</span>
              <span className="transition group-open:rotate-180 text-slate-400 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-50 pt-3">
              Hoàn toàn được. LexOCR tự động duyệt qua tất cả các trang trong file PDF tải lên, phân tích nhận dạng và nối kết quả văn bản của từng trang theo đúng thứ tự để kết xuất ra một tệp tin Word duy nhất cho bạn.
            </p>
          </details>

          <details className="group border border-slate-250 rounded-xl p-4 bg-white hover:border-slate-350 transition-colors [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-semibold text-slate-900 cursor-pointer list-none focus:outline-none focus:text-blue-600">
              <span className="text-sm sm:text-base pr-4">4. Gói Free có giới hạn gì?</span>
              <span className="transition group-open:rotate-180 text-slate-400 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-50 pt-3">
              Gói dịch vụ Free của LexOCR cho phép bạn xử lý tối đa 20 trang trong mỗi lần bóc tách dữ liệu và tối đa 50 trang bóc tách mỗi ngày, hoàn hảo cho nhu cầu văn phòng hàng ngày.
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
          Nhờ sự trợ giúp đắc lực của trí tuệ nhân tạo OCR, giờ đây việc số hóa và chuyển file PDF scan sang Word tiếng Việt không còn là thách thức lớn. LexOCR mang đến giao diện trực quan và khả năng xử lý xuất sắc, giúp quy trình làm việc của bạn trở nên nhanh chóng và năng suất hơn bao giờ hết.
        </p>
      </section>
    </div>
  );
}