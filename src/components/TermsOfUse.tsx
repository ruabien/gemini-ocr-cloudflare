import React from "react";
import { FileText, UserCheck, Award, CreditCard, Layers, ShieldAlert, AlertTriangle, CheckSquare, Sparkles, RefreshCw, Mail } from "lucide-react";

export default function TermsOfUse() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-fade-in w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-10 text-center border-b border-slate-800">
          <FileText className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Điều khoản sử dụng</h1>
          <p className="mt-2 text-slate-400 text-sm">Các quy định và điều kiện sử dụng dịch vụ LexOCR</p>
        </div>
        
        <div className="p-6 sm:p-10 space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
          
          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="h-6 w-6 text-rose-600" />
              <h2 className="text-xl font-bold text-slate-900">1. Giới thiệu dịch vụ LexOCR</h2>
            </div>
            <p>
              LexOCR là công cụ trực tuyến hỗ trợ số hóa và nghiên cứu hồ sơ, cung cấp giải pháp nhận diện ký tự quang học (OCR) và trích xuất thông tin có cấu trúc dành cho người dùng chuyên nghiệp. LexOCR không lưu trữ nội dung hồ sơ (hình ảnh, PDF, kết quả OCR) của bạn trên máy chủ (Stateless), nhưng có lưu trữ thông tin tài khoản và thông tin giao dịch thanh toán cần thiết để vận hành dịch vụ.
            </p>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <UserCheck className="h-6 w-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">2. Điều kiện sử dụng tài khoản</h2>
            </div>
            <p className="mb-3">
              Để sử dụng đầy đủ các tính năng của LexOCR, người dùng cần đăng nhập thông qua tài khoản Google. Bạn cam kết:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-650">
              <li>Cung cấp thông tin đăng nhập chính xác và chịu trách nhiệm bảo mật thông tin tài khoản của mình.</li>
              <li>Chịu mọi trách nhiệm pháp lý đối với các hoạt động được thực hiện dưới tên tài khoản của bạn.</li>
              <li>Thông báo ngay cho chúng tôi nếu phát hiện bất kỳ dấu hiệu truy cập trái phép nào.</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Award className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">3. Gói Free và gói PRO</h2>
            </div>
            <p className="mb-3">
              LexOCR cung cấp các tùy chọn gói dịch vụ đáp ứng các nhu cầu khác nhau:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-650">
              <li><strong>Gói Free:</strong> Phù hợp nhu cầu OCR cơ bản. Người dùng tự cấu hình API Gemini của riêng mình để sử dụng dịch vụ.</li>
              <li><strong>Gói PRO:</strong> Mở khóa các tính năng nâng cao như xuất file DOCX chuẩn Nghị định 30, tính năng Ẩn danh (Anonymize), trích xuất Excel nâng cao và không yêu cầu cấu hình API cá nhân. Khi hết hạn PRO, tài khoản sẽ tự động chuyển về gói Free.</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <CreditCard className="h-6 w-6 text-yellow-600" />
              <h2 className="text-xl font-bold text-slate-900">4. Thanh toán và gia hạn qua PayOS</h2>
            </div>
            <p>
              Mọi giao dịch nâng cấp hoặc gia hạn gói PRO đều được xử lý an toàn qua cổng thanh toán trung gian <strong>PayOS</strong>. Lịch sử thanh toán và thông tin giao dịch cần thiết sẽ được lưu trữ an toàn trong cơ sở dữ liệu của chúng tôi để phục vụ đối soát, kích hoạt gói và hỗ trợ khách hàng.
            </p>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Layers className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">5. Chính sách cộng dồn thời hạn PRO</h2>
            </div>
            <p>
              Nếu người dùng thực hiện thanh toán nâng cấp/gia hạn gói PRO khi thời hạn PRO cũ vẫn còn hiệu lực, thời gian sử dụng mới sẽ được <strong>cộng dồn tự động</strong> vào thời gian còn lại của gói hiện tại.
            </p>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <CheckSquare className="h-6 w-6 text-amber-600" />
              <h2 className="text-xl font-bold text-slate-900">6. Trách nhiệm của người dùng khi sử dụng kết quả OCR</h2>
            </div>
            <p>
              Người dùng hoàn toàn chịu trách nhiệm kiểm tra lại toàn bộ kết quả OCR, file DOCX, Excel và dữ liệu ẩn danh trước khi sử dụng trong công việc hoặc báo cáo nghiệp vụ. Bạn cần hiểu rõ rằng kết quả OCR có thể chứa sai sót do chất lượng tài liệu gốc (nhòe, chữ viết tay, định dạng phức tạp).
            </p>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-bold text-slate-900">7. Tính chất hỗ trợ của công cụ</h2>
            </div>
            <p>
              LexOCR <strong>chỉ là công cụ hỗ trợ số hóa và nghiên cứu</strong>, không thay thế bất kỳ hoạt động kiểm tra nghiệp vụ hay quy trình xác minh chính thức nào của cơ quan hoặc cá nhân. LexOCR <strong>không đảm bảo kết quả OCR chính xác tuyệt đối</strong>.
            </p>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <ShieldAlert className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">8. Quy định sử dụng hợp pháp</h2>
            </div>
            <p>
              Nghiêm cấm hành vi sử dụng LexOCR cho bất kỳ mục đích vi phạm pháp luật Việt Nam nào. Người dùng không được phép sử dụng công cụ để phá hoại hệ thống, phát tán mã độc hoặc xâm phạm đến quyền và lợi ích hợp pháp của tổ chức, cá nhân khác.
            </p>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-slate-900">9. Giới hạn trách nhiệm của LexOCR</h2>
            </div>
            <p>
              Trong mọi trường hợp, LexOCR và đội ngũ phát triển không chịu trách nhiệm đối với bất kỳ thiệt hại trực tiếp, gián tiếp, vô ý hay cố ý nào phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ, hoặc từ các sai sót trong kết quả xử lý dữ liệu của công cụ.
            </p>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <RefreshCw className="h-6 w-6 text-teal-600" />
              <h2 className="text-xl font-bold text-slate-900">10. Thay đổi tính năng, giá dịch vụ hoặc điều khoản</h2>
            </div>
            <p>
              Chúng tôi có quyền điều chỉnh, thay đổi tính năng dịch vụ, mức phí các gói cước hoặc cập nhật nội dung Điều khoản này vào bất kỳ lúc nào để phù hợp với định hướng phát triển và quy định pháp luật. Việc tiếp tục sử dụng dịch vụ đồng nghĩa với việc bạn chấp thuận các thay đổi đó.
            </p>
          </section>

          <section className="pt-6 border-t border-slate-100">
            <div className="flex items-center space-x-2 mb-3">
              <Mail className="h-6 w-6 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-900">11. Liên hệ hỗ trợ</h2>
            </div>
            <p>
              Mọi thắc mắc, yêu cầu hỗ trợ hoặc báo cáo lỗi dịch vụ, vui lòng liên hệ với chúng tôi qua các kênh hỗ trợ chính thức được tích hợp trên website.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}