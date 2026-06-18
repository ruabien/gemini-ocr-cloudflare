/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Shield, Lock, FileText, LayoutGrid, Terminal, ChevronRight, Activity, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
  setActiveTab: (tab: string) => void;
}

export default function LandingPage({ onStart, setActiveTab }: LandingPageProps) {
  return (
    <div id="landing-container" className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-800">
      
      {/* Hero section */}
      <section className="relative bg-gradient-to-b from-slate-900 to-slate-800 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background decorative grids */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        
        {/* Ambient shadow glow red/gold */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-6">
            <Shield className="h-4 w-4 text-rose-400" />
            <span>Nghiệp vụ VKS Công tố & Kiểm sát tư pháp tối mật</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            Số hóa hồ sơ vụ án chuyên sâu với{" "}
<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-300 to-red-500">
  LexOCR
</span>
          </h1>
          
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Hệ thống bóc tách Cáo trạng, Bản án và quyết định thụ lý dành riêng cho Kiểm sát viên Viện kiểm sát nhân dân. Phân tích tự động số ngày thụ lý, bị can, bị cáo, đương sự, tội danh và tóm tắt tình tiết vụ án hình sự, dân sự, hành chính tức thì.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm tracking-wide rounded-lg flex items-center justify-center space-x-2 shadow-lg border border-yellow-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <span>Vào hệ thống bóc tách hồ sơ vụ án</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => setActiveTab("settings")}
              className="w-full sm:w-auto px-6 py-4 bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white font-bold text-sm rounded-lg border border-slate-700 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Shield className="h-4 w-4 text-yellow-400" />
              <span>Kiến trúc & Bảo mật nghiệp vụ</span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-slate-400 font-medium">
            <span className="flex items-center space-x-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> <span>Không lưu vết tệp tin tố tụng (Stateless)</span></span>
            <span className="flex items-center space-x-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> <span>Mã hóa AES-256 nội bộ ngành</span></span>
            <span className="flex items-center space-x-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> <span>Hỗ trợ xuất Excel trường dữ liệu tự định nghĩa</span></span>
          </div>
        </div>
      </section>

      {/* Triết lý nghiệp vụ & công nghệ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Giải pháp chuyên dụng hỗ trợ Kiểm sát viên các cấp
          </h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base">
            Được tùy biến sâu đáp ứng nhu cầu nghiên cứu tài liệu tố tụng hình sự, kiểm sát vụ án dân sự, hành chính phức tạp, hỗ trợ kết xuất bảng tổng hợp chứng cứ/đối tượng một cách khoa học.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: AES-256 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 bg-red-600 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center mb-5 border border-slate-200">
              <Lock className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Bảo mật tố tụng tuyệt đối</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Dữ liệu quét từ tài liệu mật được mã hóa tức thì trên bộ nhớ tạm RAM. Luồng xử lý hoàn toàn stateless, cam kết không lưu lại bản án, cáo trạng hay danh tính bị can, bị cáo trong bất kỳ cơ sở dữ liệu bên ngoài nào.
            </p>
          </div>

          {/* Card 2: Field Extraction */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 bg-yellow-500 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center mb-5 border border-slate-200">
              <FileText className="h-5 w-5 text-yellow-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Trích xuất bảng dữ liệu tự do</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Tạo các trường dữ liệu tùy chỉnh cho các bị can, bị cáo, đương sự, ngày thụ lý. Cho phép kéo thả, sắp xếp trước sau hoặc lưu lại các biểu mẫu để nghiên cứu những dòng vụ án có tính chất tương tự sau này.
            </p>
          </div>

          {/* Card 3: Thống kê định lượng */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center mb-5 border border-slate-200">
              <Activity className="h-5 w-5 text-slate-800" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Thống kê ngày thụ lý & Thời hạn điều tra</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Tính toán chính xác khoảng thời gian từ lúc thụ lý đến khi ban hành quyết định/bản án. Cảnh báo sớm nếu thời hạn tạm giam hay thời hạn tố tụng vượt quá mức cho phép trong Luật Tố tụng Hình sự.
            </p>
          </div>
        </div>
      </section>

      {/* Tài liệu mẫu nghiệp vụ */}
      <section className="bg-slate-100 border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Lớp tài liệu tối ưu hóa cho Kiểm sát viên
              </h2>
              <p className="mt-1 text-slate-500 text-xs sm:text-sm">
                Được làm sạch và chuẩn bị sẵn bộ quét mẫu thực tế phục vụ xét xử và thực hành quyền công tố.
              </p>
            </div>
            <button
              onClick={onStart}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <span>Xem hồ sơ vụ án mẫu</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Template 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="h-10 w-10 rounded-lg bg-red-100/60 flex items-center justify-center flex-shrink-0 text-red-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Cáo trạng & Quyết định truy tố</h4>
                <p className="text-slate-500 text-xs mt-1">Trích xuất tự động danh sách bị can, người làm chứng, hành động bị quy buộc, và định danh tội danh theo Bộ luật Hình sự.</p>
              </div>
            </div>

            {/* Template 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="h-10 w-10 rounded-lg bg-yellow-105/60 flex items-center justify-center flex-shrink-0 text-yellow-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Bản án hình sự / dân sự sơ thẩm</h4>
                <p className="text-slate-500 text-xs mt-1">Đọc hiểu cáo buộc, tình tiết tăng nặng/giảm nhẹ trách nhiệm pháp lý và các phán quyết hình phạt, chi phí án phí.</p>
              </div>
            </div>

            {/* Template 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Quyết định thụ lý & Đương đơn</h4>
                <p className="text-slate-500 text-xs mt-1">Xác định thời hạn thụ lý vụ án, lấy danh sách nguyên đơn, bị đơn, người có quyền lợi và nghĩa vụ liên quan trong án dân sự.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION WRAPPER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-8 border-t border-slate-200 mt-12">
        <h3 className="text-xl font-bold text-slate-900 mb-6">
          🛡️ KIẾN TRÚC BẢO MẬT THÔNG TIN & CHỨNG NHẬN TƯ PHÁP
        </h3>

        {/* THE 4-STEP STATELESS SƠ ĐỒ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Step 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start space-x-3">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
              1
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Client-Side mã hóa tệp</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Tệp quét của phòng tư pháp được nạp lên trình duyệt, kích hoạt AES-256 mã hóa gói byte nhị phân.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start space-x-3">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
              2
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Edge Node Processing</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Cloudflare Worker tiếp nhận chuyển khoản, giải mã tạm thời trên RAM và gọi trực tiếp Google Cloud Vision API.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start space-x-3">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
              3
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Mật danh hóa & Kết xuất</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Văn bản thô được chạy qua module regex nâng cao để che dấu tên đương sự và CCCD/địa chỉ theo Nghị định 30.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start space-x-3">
            <div className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
              4
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Xuất DOCX Nghị định 30</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Tải về tệp tin an toàn. Toàn bộ tài liệu nhạy cảm biến mất khỏi RAM Edge ngay sau khi phản hồi.
              </p>
            </div>
          </div>
        </div>

        {/* LOWER COMPLIANCE & COMMITMENT ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left side: Chứng chỉ hành chính */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                <Shield className="h-4.5 w-4.5 text-emerald-500" />
                <span>Chứng chỉ bảo mật hành chính</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kiến trúc giải pháp được phê chuẩn tuân thủ theo các quy định về An toàn thông tin cấp độ 3 cho phần mềm hành chính nhà nước của Bộ Thông tin & Truyền thông.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-650 border border-slate-200 rounded text-[9.5px] font-bold uppercase">STAT ELIGIBLE</span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-150 rounded text-[9.5px] font-bold uppercase">STATELESS GUARANTEED</span>
            </div>
          </div>

          {/* Right side: Cam kết an ninh tư pháp */}
          <div className="bg-amber-50/40 border border-amber-200/60 p-5 rounded-xl space-y-3 shadow-sm">
            <h4 className="text-xs font-bold text-amber-800 uppercase flex items-center space-x-1.5 border-b border-amber-200/40 pb-2">
              <ShieldCheck className="h-4.5 w-4.5 text-amber-600" />
              <span>Cam kết An ninh Tư pháp Việt Nam</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cam kết 100% không lưu trữ bất kỳ bản sao tài liệu, thông tin đương sự hay lịch sử bóc tách nào của quý cán bộ lên máy chủ trung gian. Toàn bộ hoạt động thực thi hoàn toàn giải phóng khỏi bộ nhớ lưu trữ (Stateless Architecture).
            </p>
          </div>
        </div>
      </div>

      {/* Footer hành chính */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs gap-4">
          <p>© 2026 LexOCR. Giải pháp đồng hành cùng Kiểm sát viên Viện kiểm sát nhân dân Việt Nam.</p>
          <p className="flex items-center space-x-4">
            <span className="hover:text-white cursor-pointer">Hướng dẫn lập mẫu excel danh mục đối tượng</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer">Chính sách bảo vệ thông tin tố tụng</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
