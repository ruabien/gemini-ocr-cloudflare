import React from "react";
import { Shield, Lock, FileText, AlertTriangle, CreditCard, Mail } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-fade-in w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-10 text-center border-b border-slate-800">
          <Shield className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Chính sách bảo mật</h1>
          <p className="mt-2 text-slate-400 text-sm">Cách LexOCR bảo vệ và xử lý dữ liệu của bạn</p>
        </div>
        
        <div className="p-6 sm:p-10 space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
          
          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Lock className="h-6 w-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">1. Nguyên tắc Không lưu trữ (Stateless)</h2>
            </div>
            <p className="mb-3">LexOCR cam kết <strong>không lưu hồ sơ</strong> của người dùng dưới bất kỳ hình thức nào. Mọi dữ liệu bóc tách đều được xử lý tạm thời trong phiên làm việc trên trình duyệt của bạn.</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600">
              <li>Không lưu trữ tệp tin PDF, hình ảnh tải lên.</li>
              <li>Không lưu trữ nội dung OCR hoặc kết quả trích xuất.</li>
              <li>Tất cả dữ liệu tự động biến mất khi bạn đóng trình duyệt hoặc tải lại trang.</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">2. Không sử dụng dữ liệu để huấn luyện AI</h2>
            </div>
            <p>Chúng tôi đảm bảo tuyệt đối <strong>không sử dụng dữ liệu người dùng</strong> (bao gồm tài liệu, hình ảnh, văn bản bóc tách) để huấn luyện, cải thiện hay fine-tune các mô hình Trí tuệ Nhân tạo (AI) của chúng tôi hay của bất kỳ bên thứ ba nào.</p>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">3. Thông tin tài khoản được lưu trữ</h2>
            </div>
            <p className="mb-3">Để duy trì hoạt động dịch vụ và quản lý quyền lợi người dùng, hệ thống chỉ lưu trữ các thông tin tối thiểu liên quan đến tài khoản bao gồm:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600">
              <li>Email đăng nhập và Tên tài khoản Google.</li>
              <li>Trạng thái gói thành viên (Free / PRO).</li>
              <li>Ngày hết hạn gói PRO.</li>
              <li>Lịch sử giao dịch thanh toán (thông qua PayOS).</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <CreditCard className="h-6 w-6 text-yellow-600" />
              <h2 className="text-xl font-bold text-slate-900">4. Xử lý Đăng nhập & Thanh toán</h2>
            </div>
            <p className="mb-3">Hệ thống của chúng tôi không trực tiếp xử lý hay lưu trữ mật khẩu hoặc thông tin thẻ ngân hàng của bạn:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600">
              <li><strong>Đăng nhập:</strong> Được xử lý bảo mật qua hệ thống xác thực Firebase / Google.</li>
              <li><strong>Thanh toán:</strong> Mọi giao dịch nâng cấp gói PRO được xử lý hoàn toàn qua cổng thanh toán trung gian an toàn PayOS.</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <h2 className="text-xl font-bold text-slate-900">5. Trách nhiệm của người dùng</h2>
            </div>
            <p>LexOCR là công cụ hỗ trợ tự động trích xuất thông tin từ tài liệu và hình ảnh. Mặc dù áp dụng công nghệ nhận diện tiên tiến nhất, sai sót vẫn có thể xảy ra do chất lượng tài liệu đầu vào (mờ, nhòe, viết tay khó đọc). Do đó, <strong>người dùng hoàn toàn chịu trách nhiệm rà soát và đối chiếu kỹ kết quả OCR với tài liệu gốc</strong> trước khi áp dụng vào các nghiệp vụ chính thức.</p>
          </section>

          <section className="pt-6 border-t border-slate-100">
            <div className="flex items-center space-x-2 mb-3">
              <Mail className="h-6 w-6 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-900">6. Liên hệ hỗ trợ</h2>
            </div>
            <p>Nếu bạn có bất kỳ thắc mắc nào liên quan đến quyền riêng tư, cách thức xử lý dữ liệu hoặc cần hỗ trợ về dịch vụ, vui lòng liên hệ với chúng tôi để được giải đáp chi tiết.</p>
          </section>

        </div>
      </div>
    </div>
  );
}