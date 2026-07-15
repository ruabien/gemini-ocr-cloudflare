import React from 'react';
import { TipBox, NoteBox, ResultBox, ArticleImage } from '../KnowledgeArticle';
import { KnowledgeCTA } from '../components/KnowledgeCTA';
import { KnowledgeFAQ } from '../components/KnowledgeFAQ';

export default function OcrPdfScanSangWordMienPhi() {
  return (
    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
      {/* 1️⃣ Hero – title & short description are rendered by KnowledgeArticleTemplate */}

      {/* 1️⃣ Bạn đang gặp vấn đề gì? */}
      <section className="mb-10">
        <h2 id="ban-dang-gap-van-de-gi" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bạn đang gặp vấn đề gì?
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Hãy tưởng tượng bạn vừa nhận được một tài liệu pháp lý hoặc hợp đồng quan trọng dưới dạng PDF từ đối tác. Bạn cần sao chép một điều khoản để chỉnh sửa nhanh hoặc đối chiếu thông tin, nhưng khi kéo chuột thì không thể bôi đen hay copy được bất kỳ dòng chữ nào. Thậm chí tính năng tìm kiếm (Ctrl+F) cũng hoàn toàn vô tác dụng. Cách duy nhất lúc này dường như là ngồi gõ lại thủ công từng chữ – một công việc vừa tốn thời gian vừa dễ xảy ra sai sót.
        </p>
        <p className="text-base text-slate-600 mb-4">
          Nguyên nhân chính là do file PDF bạn nhận được là một bản <strong>PDF scan</strong>.
        </p>
      </section>

      {/* 2️⃣ PDF Scan là gì? */}
      <section className="mb-10">
        <h2 id="pdf-scan-la-gi" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          PDF Scan là gì?
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Thực chất, file PDF scan chỉ đóng vai trò như một "cuốn album ảnh". Mỗi trang tài liệu bên trong là một bức ảnh tĩnh được chụp lại bằng điện thoại hoặc quét qua máy scan chuyên dụng. Vì dữ liệu lưu trữ chỉ gồm các điểm ảnh (pixels) chứ không chứa thông tin ký tự số, máy tính không thể hiểu được các chữ cái hiển thị trên đó. Đó là lý do bạn không thể thực hiện các thao tác văn bản thông thường như trên file Word.
        </p>
        <ArticleImage
          src="/knowledge/ocr-pdf-scan-sang-word-mien-phi/pdf-scan-example.webp"
          alt="Ví dụ PDF scan – một tài liệu chỉ là ảnh"
          caption="PDF scan chỉ là ảnh, không thể chỉnh sửa hoặc tìm kiếm"
        />
        <TipBox>
          Nếu tài liệu scan có độ phân giải cao và rõ nét, kết quả nhận diện chữ viết sẽ chuẩn xác hơn đáng kể.
        </TipBox>
      </section>

      {/* 3️⃣ OCR là gì? */}
      <section className="mb-10">
        <h2 id="ocr-la-gi" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          OCR là gì?
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Để giải quyết vấn đề trên, công nghệ <strong>OCR</strong> (Optical Character Recognition - Nhận dạng ký tự quang học) được ra đời. Công nghệ này hoạt động giống như một "mắt thần", quét qua các vùng ảnh để phân tích hình dáng các ký tự, từ đó chuyển dịch chúng thành văn bản số tương ứng. Nhờ vậy, bạn có thể dễ dàng chỉnh sửa hoặc tìm kiếm thông tin trên file đích.
        </p>
      </section>

      {/* 4️⃣ AI OCR khác gì? */}
      <section className="mb-10">
        <h2 id="ai-ocr-khac-gi" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          AI OCR khác gì?
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Điểm khác biệt lớn nhất giữa công nghệ OCR truyền thống và AI OCR hiện đại nằm ở khả năng hiểu ngữ cảnh:
        </p>
        <table className="my-6">
          <thead>
            <tr>
              <th>OCR truyền thống</th>
              <th>AI OCR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Chỉ nhận dạng ký tự nguyên thủy dựa trên hình khối tĩnh.</td>
              <td>Dùng mô hình AI hiểu ngữ cảnh toàn câu để nhận dạng và giảm lỗi.</td>
            </tr>
            <tr>
              <td>Dễ bị nhận dạng sai dấu, mất nét khi gặp văn bản tiếng Việt.</td>
              <td>Tối ưu tốt cho tiếng Việt, nhận dạng chính xác các tổ hợp dấu phức tạp.</td>
            </tr>
            <tr>
              <td>Không tự sửa lỗi chính tả hay định dạng văn bản bị lỗi.</td>
              <td>Tự động căn chỉnh bố cục, sửa lỗi chính tả nhờ hiểu nghĩa từ vựng.</td>
            </tr>
            <tr>
              <td>Kết quả phụ thuộc hoàn toàn vào chất lượng ảnh quét thô.</td>
              <td>AI hỗ trợ làm sạch, tối ưu hóa độ tương phản ảnh trước khi dịch chữ.</td>
            </tr>
          </tbody>
        </table>
        <NoteBox>
          LexOCR sử dụng công nghệ AI OCR được tối ưu riêng cho tài liệu tiếng Việt, giúp giảm thiểu đáng kể thời gian hiệu chỉnh thủ công sau khi chuyển đổi.
        </NoteBox>
        <ResultBox>
          Ứng dụng AI OCR giúp chuyển dịch các trang tài liệu định dạng ảnh sang văn bản số mạch lạc, hạn chế tối đa việc phải rà soát lỗi chính tả thủ công.
        </ResultBox>
      </section>

      {/* 5️⃣ Hướng dẫn OCR PDF Scan sang Word bằng LexOCR */}
      <section className="mb-10">
        <h2 id="huong-dan-ocr-pdf-scan-sang-word" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Các bước thực hiện chuyển đổi bằng LexOCR
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Quy trình chuyển đổi PDF scan sang tệp Word được thực hiện hoàn toàn trực tuyến trên trình duyệt qua các bước đơn giản sau:
        </p>

        {/* Bước 1 – Upload PDF */}
        <h3 id="buoc-1-upload-pdf" className="scroll-mt-20 text-xl font-semibold text-slate-800 mt-6 mb-3">
          Bước 1: Tải file PDF cần OCR lên
        </h3>
        <p className="text-base text-slate-600 mb-4">
          Kéo và thả tệp PDF scan của bạn vào khu vực tải lên trên giao diện chính của LexOCR hoặc bấm nút “Chọn tệp”.
        </p>
        <ArticleImage
          src="/knowledge/ocr-pdf-scan-sang-word-mien-phi/step-1-upload.webp"
          alt="Màn hình tải PDF scan lên LexOCR"
          caption="Kéo thả hoặc chọn tệp PDF scan để bắt đầu OCR"
        />

        {/* Bước 2 – Nhấn “Bắt đầu OCR” */}
        <h3 id="buoc-2-bat-dau-ocr" className="scroll-mt-20 text-xl font-semibold text-slate-800 mt-6 mb-3">
          Bước 2: Chọn ngôn ngữ và bắt đầu xử lý
        </h3>
        <p className="text-base text-slate-600 mb-4">
          Lựa chọn ngôn ngữ phù hợp với tài liệu (ví dụ: Tiếng Việt hoặc kết hợp đa ngôn ngữ), sau đó nhấn nút <strong>Bắt đầu OCR</strong> để hệ thống tiến hành phân tích.
        </p>
        <ArticleImage
          src="/knowledge/ocr-pdf-scan-sang-word-mien-phi/step-2-start.webp"
          alt="Nút Bắt đầu OCR trong LexOCR"
          caption="Khởi chạy quy trình OCR bằng AI"
        />

        {/* Bước 3 – AI xử lý */}
        <h3 id="buoc-3-xu-ly-ocr" className="scroll-mt-20 text-xl font-semibold text-slate-800 mt-6 mb-3">
          Bước 3: Chờ hệ thống chuyển đổi
        </h3>
        <p className="text-base text-slate-600 mb-4">
          Hệ thống sẽ chuyển tiếp ảnh tài liệu qua mô hình AI để nhận diện chữ viết và tái cấu trúc văn bản. Thời gian hoàn tất phụ thuộc vào tổng số lượng trang và chất lượng sắc nét của bản quét.
        </p>
        <ArticleImage
          src="/knowledge/ocr-pdf-scan-sang-word-mien-phi/step-3-processing.webp"
          alt="Quá trình AI xử lý PDF scan"
          caption="AI nhận dạng ký tự và tạo cấu trúc văn bản"
        />

        {/* Bước 4 – Xuất Word */}
        <h3 id="buoc-4-xuat-word" className="scroll-mt-20 text-xl font-semibold text-slate-800 mt-6 mb-3">
          Bước 4: Xem trước kết quả và tải file Word
        </h3>
        <p className="text-base text-slate-600 mb-4">
          Khi quá trình kết thúc, một bảng xem trước văn bản sẽ hiện ra. Bạn chỉ cần nhấn nút <strong>Xuất Word</strong> để tải tệp định dạng <code>.docx</code> về máy và mở chỉnh sửa trên Word hoặc Google Docs.
        </p>
        <ArticleImage
          src="/knowledge/ocr-pdf-scan-sang-word-mien-phi/step-4-word.webp"
          alt="Tải file Word sau khi OCR"
          caption="Tải file .docx đã được chuyển đổi"
        />
      </section>

      {/* 6️⃣ Những lưu ý để OCR đạt kết quả tốt */}
      <section className="mb-10">
        <h2 id="luu-y-ocr-tot" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Lưu ý để đạt chất lượng chuyển đổi tốt nhất
        </h2>
        <ul className="list-disc pl-6 space-y-2 mb-4 text-slate-600">
          <li><strong>Độ rõ nét:</strong> Nên chọn các bản quét có chữ viết rõ ràng, không bị mờ nhòe hay loang lổ mực.</li>
          <li><strong>Ánh sáng chụp ảnh:</strong> Nếu là ảnh chụp từ điện thoại, cần đảm bảo nguồn sáng phân bố đều, tránh đổ bóng hay lóa đèn flash.</li>
          <li><strong>Góc chụp ngay ngắn:</strong> Hạn chế các góc chụp quá nghiêng hay tài liệu bị uốn cong, điều này giúp AI định vị dòng chữ chuẩn xác hơn.</li>
          <li><strong>Màu sắc tài liệu:</strong> Độ tương phản cao giữa màu chữ và nền giấy sẽ nâng cao tỷ lệ nhận diện.</li>
          <li><strong>Đặc tính bảo mật:</strong> Đảm bảo tệp tin không bị khóa quyền đọc hoặc chứa quá nhiều hình mờ (watermark) chồng chéo phức tạp.</li>
        </ul>
        <TipBox>
          Việc chuẩn bị một bản quét gốc chất lượng là yếu tố quyết định giúp bạn có một file Word đầu ra sạch sẽ và ít lỗi chính tả nhất.
        </TipBox>
      </section>

      {/* 7️⃣ Các lỗi thường gặp */}
      <section className="mb-10">
        <h2 id="loi-thuong-gap" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Các lỗi thường gặp và cách khắc phục
        </h2>
        <table className="my-6">
          <thead>
            <tr>
              <th>Hiện tượng</th>
              <th>Nguyên nhân phổ biến</th>
              <th>Hướng khắc phục</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Chữ nhận diện bị lỗi font hoặc mất dấu</td>
              <td>Ảnh chụp mờ hoặc tài liệu có chữ viết tay quá phức tạp</td>
              <td>Thay thế bằng bản quét có độ phân giải cao hơn hoặc chụp lại dưới ánh sáng trực diện</td>
            </tr>
            <tr>
              <td>Không thể bấm chạy tính năng OCR</td>
              <td>Khóa API Key cá nhân chưa được kết nối đúng cách</td>
              <td>Kiểm tra lại cấu hình khóa API trong thẻ Cài đặt hệ thống</td>
            </tr>
            <tr>
              <td>Hệ thống báo lỗi giới hạn lượt dùng</td>
              <td>Vượt quá giới hạn mức dung lượng hoặc lượt sử dụng quy định</td>
              <td>Chờ chu kỳ thiết lập lại hoặc cân nhắc nâng cấp tài khoản để tiếp tục làm việc</td>
            </tr>
          </tbody>
        </table>
        <NoteBox>
          Hiện tại, hệ thống có thể gặp hạn chế khi xử lý các tài liệu bị chèn watermark quá dày hoặc các file PDF đã thiết lập mã hóa bảo mật chuyên sâu.
        </NoteBox>
      </section>

      {/* 8️⃣ FAQ */}
      <KnowledgeFAQ
        items={[
          {
            question: "1. OCR PDF Scan tại LexOCR có miễn phí không?",
            answer: (
              <>
                Có. Bạn có thể sử dụng các lượt OCR tài liệu cơ bản mỗi ngày hoàn toàn miễn phí trên hệ thống.
              </>
            ),
          },
          {
            question: "2. Tôi có cần cài đặt thêm phần mềm nào vào máy tính không?",
            answer: (
              <>
                Không cần. Mọi quy trình chuyển đổi đều được thực hiện trực tuyến thông qua trình duyệt web trên thiết bị của bạn.
              </>
            ),
          },
          {
            question: "3. LexOCR có hỗ trợ nhận diện văn bản tiếng Việt không?",
            answer: (
              <>
                Có. LexOCR hỗ trợ tiếng Việt, nhận dạng dấu và ký tự phức tạp.
              </>
            ),
          },
          {
            question: "4. Tôi có thể chuyển đổi file PDF có nhiều trang cùng lúc không?",
            answer: (
              <>
                Có. Hệ thống hỗ trợ xử lý toàn bộ các trang trong tài liệu và tổng hợp thành một file Word duy nhất để bạn tải xuống.
              </>
            ),
          },
          {
            question: "5. Ảnh chụp từ điện thoại di động có thể dùng OCR được không?",
            answer: (
              <>
                Có. Bạn chỉ cần đảm bảo ảnh chụp thẳng góc, rõ chữ và không bị thiếu sáng hay rung tay khi chụp.
              </>
            ),
          },
          {
            question: "6. Định dạng file tải về có chỉnh sửa được ngay không?",
            answer: (
              <>
                File sau khi chuyển đổi sẽ được xuất dưới định dạng chuẩn .docx, bạn có thể chỉnh sửa tự do bằng Microsoft Word hoặc tải lên Google Docs.
              </>
            ),
          },
          {
            question: "7. Công cụ này có hoạt động tốt trên hệ điều hành macOS không?",
            answer: (
              <>
                Hoạt động hoàn hảo. Vì chạy trên nền tảng web, bạn chỉ cần mở các trình duyệt quen thuộc như Safari hay Chrome trên máy Mac để sử dụng.
              </>
            ),
          },
          {
            question: "8. Người dùng Linux có sử dụng được LexOCR không?",
            answer: (
              <>
                Có. Bất kỳ thiết bị nào chạy trình duyệt web hiện đại đều có thể truy cập và sử dụng dịch vụ bình thường.
              </>
            ),
          },
          {
            question: "9. Có giới hạn nào về dung lượng file tải lên không?",
            answer: (
              <>
                Mỗi tài khoản sẽ có mức giới hạn dung lượng tải lên nhất định. Hãy kiểm tra cài đặt tài khoản của bạn hoặc liên hệ nâng cấp để xử lý các file dung lượng lớn.
              </>
            ),
          },
          {
            question: "10. Tôi có bắt buộc phải đăng ký tài khoản để sử dụng không?",
            answer: (
              <>
                Đăng ký tài khoản giúp bạn quản lý lịch sử chuyển đổi và sử dụng hạn ngạch tài nguyên hệ thống một cách tối ưu.
              </>
            ),
          },
        ]}
      />

      {/* 9️⃣ Kết luận */}
      <section className="mb-10">
        <h2 id="ket-luan" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Kết luận
        </h2>
        <p className="text-base text-slate-600 mb-4">
          Sử dụng giải pháp OCR phù hợp giúp bạn tiết kiệm đáng kể thời gian và tránh việc phải nhập tay thủ công các tài liệu PDF scan cứng đầu. Bằng cách số hóa hình ảnh thành văn bản thông minh, bạn có thể dễ dàng biên tập, lưu trữ và khai thác thông tin từ các hợp đồng hay hồ sơ cũ một cách nhanh chóng.
        </p>
        <p className="text-base text-slate-600 mb-4">
          Hãy tải lên tài liệu của bạn ngay bây giờ để kiểm tra chất lượng nhận dạng trực quan từ hệ thống.
        </p>
      </section>

      {/* 🔟 CTA */}
      <section className="mb-10">
        <KnowledgeCTA
          text="Bắt đầu OCR miễn phí"
          href="/knowledge/ocr-pdf-scan-sang-word-mien-phi"
        />
      </section>

      {/* 1️⃣1️⃣ Related Articles */}
      <section className="mb-10">
        <h2 id="related-articles" className="scroll-mt-20 text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">
          Bài viết liên quan
        </h2>
        {/* The KnowledgeRelatedArticles component will render links based on metadata */}
      </section>
    </div>
  );
}