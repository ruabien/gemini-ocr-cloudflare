/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Shield, 
  Lock, 
  FileText, 
  LayoutGrid, 
  Terminal, 
  ChevronRight, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Clock,
  Users,
  Calendar,
  FileSpreadsheet,
  Check
} from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
  setActiveTab: (tab: string) => void;
}

export default function LandingPage({ onStart, setActiveTab }: LandingPageProps) {
  const [activeDemoTab, setActiveDemoTab] = useState<"caotrang" | "banan" | "thuly">("caotrang");

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
            <span>Trợ lý số hóa hồ sơ tố tụng và nghiên cứu hồ sơ chuyên sâu</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            Giảm 90% thời gian nhập liệu{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-300 to-red-500">
              hồ sơ vụ án
            </span>
          </h1>
          
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Tự động bóc tách hình ảnh, pdf và xuất dữ liệu phục vụ nghiên cứu hồ sơ, thống kê, thực hành quyền công tố và kiểm sát các vụ án.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm tracking-wide rounded-lg flex items-center justify-center space-x-2 shadow-lg border border-yellow-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <span>Dùng thử miễn phí</span>
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

      {/* PHẦN 3 - ĐƯA SECTION NGHIỆP VỤ LÊN CAO */}
      <section className="bg-slate-100 border-b border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Hỗ trợ bóc tách các loại hồ sơ tố tụng
            </h2>
            <p className="mt-2 text-slate-500 text-xs sm:text-sm">
              Thiết kế tối ưu cho nghiệp vụ tư pháp giúp số hóa nhanh chóng và chính xác các mẫu văn bản tố tụng phổ biến.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Template 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="h-10 w-10 rounded-lg bg-red-100/60 flex items-center justify-center flex-shrink-0 text-red-600 shadow-inner">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center">
                  <span className="text-emerald-600 mr-1.5">✓</span> Kết luận điều tra
                </h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">Trích xuất tự động danh sách bị can, người làm chứng, hành vi phạm tội, và tội danh đề nghị truy tố theo Bộ luật Hình sự.</p>
              </div>
            </div>

            {/* Template 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="h-10 w-10 rounded-lg bg-yellow-100/60 flex items-center justify-center flex-shrink-0 text-yellow-600 shadow-inner">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center">
                  <span className="text-emerald-600 mr-1.5">✓</span> Bản án hình sự / dân sự
                </h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">Trích xuất thông tin bị cáo, thông tin đương sự, nội dung vụ án, phán quyết của Tòa án.</p>
              </div>
            </div>

            {/* Template 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600 shadow-inner">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center">
                  <span className="text-emerald-600 mr-1.5">✓</span> Quyết định thụ lý
                </h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">Giúp nhập liệu nhanh thông tin thụ lý vụ án, danh sách nguyên đơn, bị đơn, người có quyền lợi và nghĩa vụ liên quan trong án dân sự.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 4 - THÊM KHỐI LỢI ÍCH NGAY SAU HERO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            LexOCR giúp gì cho Kiểm sát viên?
          </h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base">
            Giải phóng cán bộ khỏi công việc thủ công, tập trung nghiên cứu hồ sơ vụ án và thực hành quyền công tố hiệu quả.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Lợi ích 1 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 bg-red-600 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center mb-5 border border-slate-200">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-850 mb-2 flex items-center">
              <span className="text-emerald-600 mr-1.5">✓</span> Giảm thời gian nhập liệu
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Tự động chuyển đổi toàn bộ tài liệu hồ sơ vụ án, cáo trạng dạng giấy hoặc ảnh chụp sang văn bản số trong vài giây mà không cần gõ lại thủ công.
            </p>
          </div>

          {/* Lợi ích 2 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 bg-yellow-500 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center mb-5 border border-slate-200">
              <Users className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="text-base font-bold text-slate-850 mb-2 flex items-center">
              <span className="text-emerald-600 mr-1.5">✓</span> Tự động lập bảng bị can, bị cáo
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Trích xuất tự động danh sách bị can, bị cáo, đồng phạm cùng các thông tin nhân thân, hành vi phạm tội cụ thể và điều khoản truy tố.
            </p>
          </div>

          {/* Lợi ích 3 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center mb-5 border border-slate-200">
              <Calendar className="h-5 w-5 text-slate-800" />
            </div>
            <h3 className="text-base font-bold text-slate-850 mb-2 flex items-center">
              <span className="text-emerald-600 mr-1.5">✓</span> Hỗ trợ thống kê thời hạn tố tụng
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Tự động tính toán các mốc thời hạn tạm giữ, tạm giam, thời hạn điều tra, truy tố, phát hiện nhanh các nguy cơ quá hạn luật định.
            </p>
          </div>

          {/* Lợi ích 4 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 bg-emerald-600 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center mb-5 border border-slate-200">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-850 mb-2 flex items-center">
              <span className="text-emerald-600 mr-1.5">✓</span> Xuất DOCX phục vụ nghiên cứu hồ sơ
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Kết xuất toàn bộ văn bản và dữ liệu cấu trúc hóa ra file Word (.docx) chuẩn quy định hành chính, làm tài liệu nền tảng cho báo cáo án hình sự.
            </p>
          </div>
        </div>
      </section>

      {/* PHẦN 5 - DEMO OCR THỰC TẾ */}
      <section className="bg-slate-100 border-t border-b border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Ví dụ bóc tách hồ sơ thực tế
            </h2>
            <p className="mt-3 text-slate-500 text-sm">
              Minh họa luồng số hóa và trích xuất thông tin tự động từ hồ sơ tố tụng thực tế đã được ẩn danh bảo mật.
            </p>

            {/* Switch tabs */}
            <div className="mt-6 inline-flex p-1 bg-slate-200 rounded-lg border border-slate-300">
              <button
                onClick={() => setActiveDemoTab("caotrang")}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  activeDemoTab === "caotrang" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cáo trạng hình sự
              </button>
              <button
                onClick={() => setActiveDemoTab("banan")}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  activeDemoTab === "banan" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bản án sơ thẩm
              </button>
              <button
                onClick={() => setActiveDemoTab("thuly")}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  activeDemoTab === "thuly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Thông báo thụ lý
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Cột 1: Ảnh hồ sơ gốc (mô phỏng) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="bg-slate-900 text-white px-4 py-3 text-xs font-bold flex items-center justify-between border-b border-slate-800">
                <span>1. Văn bản hồ sơ gốc (Ảnh chụp/PDF)</span>
                <span className="px-2 py-0.5 bg-red-600/80 rounded text-[10px]">Tài liệu gốc</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto font-mono text-[10px] text-slate-650 leading-relaxed select-none bg-slate-50/50">
                {activeDemoTab === "caotrang" && (
                  <div className="space-y-2 border border-slate-200 p-3 bg-white shadow-inner relative">
                    <div className="text-center font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>Độc lập - Tự do - Hạnh phúc</div>
                    <div className="h-px bg-slate-200 my-2" />
                    <div>VIỆN KIỂM SÁT NHÂN DÂN TỈNH HÀ NAM</div>
                    <div>Số: 45/CT-VKS-P1</div>
                    <div className="text-center font-bold text-xs py-2">CÁO TRẠNG</div>
                    <p>... Quyết định truy tố ra trước Tòa án nhân dân tỉnh Hà Nam để xét xử đối với bị can:</p>
                    <p className="bg-yellow-100 font-semibold p-1">1. Họ và tên: NGUYỄN VĂN A</p>
                    <p>Sinh ngày: 15 tháng 8 năm 1992 tại tỉnh Hà Nam.</p>
                    <p>Nơi ĐKTT: Thôn 3, xã Liêm Cần, huyện Thanh Liêm, tỉnh Hà Nam.</p>
                    <p className="bg-yellow-100 font-semibold p-1">Tội danh: "Trộm cắp tài sản" theo quy định tại Khoản 2 Điều 173 BLHS.</p>
                    <p className="bg-yellow-100 font-semibold p-1">Biện pháp ngăn chặn: Tạm giam từ ngày 20/02/2026.</p>
                    <p>... Vụ án có tính chất đồng phạm phức tạp...</p>
                  </div>
                )}
                {activeDemoTab === "banan" && (
                  <div className="space-y-2 border border-slate-200 p-3 bg-white shadow-inner relative">
                    <div className="text-center font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>Độc lập - Tự do - Hạnh phúc</div>
                    <div className="h-px bg-slate-200 my-2" />
                    <div>TÒA ÁN NHÂN DÂN THÀNH PHỐ HÀ NỘI</div>
                    <div>Số: 104/2026/HS-ST</div>
                    <div className="text-center font-bold text-xs py-2">BẢN ÁN HÌNH SỰ SƠ THẨM</div>
                    <p>... Hội đồng xét xử sơ thẩm quyết định:</p>
                    <p className="bg-yellow-100 font-semibold p-1">Tuyên bố bị cáo: TRẦN THỊ B</p>
                    <p>Sinh ngày: 04/03/1988 tại TP. Hà Nội.</p>
                    <p className="bg-yellow-100 font-semibold p-1">Phạm tội: "Lừa đảo chiếm đoạt tài sản" quy định tại Điểm a Khoản 3 Điều 174 BLHS.</p>
                    <p className="bg-yellow-100 font-semibold p-1">Xử phạt: Trần Thị B 07 (Bảy) năm tù. Thời hạn chấp hành hình phạt tù tính từ ngày bắt tạm giam 10/11/2025.</p>
                    <p>Về án phí: Bị cáo phải chịu 200.000 đồng án phí hình sự sơ thẩm...</p>
                  </div>
                )}
                {activeDemoTab === "thuly" && (
                  <div className="space-y-2 border border-slate-200 p-3 bg-white shadow-inner relative">
                    <div className="text-center font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>Độc lập - Tự do - Hạnh phúc</div>
                    <div className="h-px bg-slate-200 my-2" />
                    <div>TÒA ÁN NHÂN DÂN QUẬN HOÀN KIẾM</div>
                    <div>Số: 12/2026/TLST-DS</div>
                    <div className="text-center font-bold text-xs py-2">THÔNG BÁO THỤ LÝ VỤ ÁN</div>
                    <p>Kính gửi: Các đương sự trong vụ án.</p>
                    <p>Tòa án nhân dân quận Hoàn Kiếm thông báo thụ lý vụ án dân sự:</p>
                    <p className="bg-yellow-100 font-semibold p-1">Ngày thụ lý: 12 tháng 03 năm 2026.</p>
                    <p className="bg-yellow-100 font-semibold p-1">Quan hệ pháp luật tranh chấp: "Tranh chấp hợp đồng đặt cọc mua bán nhà".</p>
                    <p className="bg-yellow-100 font-semibold p-1">Nguyên đơn: Ông LÊ VĂN C</p>
                    <p className="bg-yellow-100 font-semibold p-1">Bị đơn: Bà PHẠM THỊ D</p>
                    <p>... Yêu cầu các đương sự nộp văn bản ý kiến cho Tòa án...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cột 2: Kết quả số hóa văn bản (OCR) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="bg-slate-900 text-white px-4 py-3 text-xs font-bold flex items-center justify-between border-b border-slate-800">
                <span>2. Kết quả số hóa văn bản (OCR sạch)</span>
                <span className="px-2 py-0.5 bg-emerald-600 rounded text-[10px]">Độ chính xác 98%</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto font-mono text-[10.5px] text-slate-700 leading-relaxed bg-white">
                {activeDemoTab === "caotrang" && (
                  <div className="space-y-1">
                    <p className="text-slate-400">// Trích xuất văn bản có định cấu trúc</p>
                    <p className="font-bold text-slate-900">VIỆN KIỂM SÁT NHÂN DÂN TỈNH HÀ NAM</p>
                    <p>Số: 45/CT-VKS-P1</p>
                    <p className="text-center font-bold py-1 text-slate-900">CÁO TRẠNG</p>
                    <p>Truy tố bị can:</p>
                    <p><span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">NGUYỄN VĂN A</span> (Sinh ngày 15/08/1992)</p>
                    <p>Nơi ĐKTT: Thôn 3, xã Liêm Cần, huyện Thanh Liêm, tỉnh Hà Nam.</p>
                    <p>Tội danh: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">Trộm cắp tài sản</span> (quy định tại <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">Khoản 2 Điều 173 Bộ luật Hình sự</span>).</p>
                    <p>Biện pháp ngăn chặn: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">Tạm giam từ ngày 20/02/2026</span>.</p>
                  </div>
                )}
                {activeDemoTab === "banan" && (
                  <div className="space-y-1">
                    <p className="text-slate-400">// Trích xuất văn bản có định cấu trúc</p>
                    <p className="font-bold text-slate-900">TÒA ÁN NHÂN DÂN THÀNH PHỐ HÀ NỘI</p>
                    <p>Số: 104/2026/HS-ST</p>
                    <p className="text-center font-bold py-1 text-slate-900">BẢN ÁN HÌNH SỰ SƠ THẨM</p>
                    <p>Quyết định hình phạt đối với bị cáo:</p>
                    <p><span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">TRẦN THỊ B</span> (Sinh ngày 04/03/1988)</p>
                    <p>Phạm tội: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">Lừa đảo chiếm đoạt tài sản</span> (quy định tại <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">Điểm a Khoản 3 Điều 174 BLHS</span>).</p>
                    <p>Hình phạt: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">07 năm tù</span>, bắt đầu tính từ ngày <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">10/11/2025</span>.</p>
                    <p>Nghĩa vụ án phí: Bị cáo phải nộp <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">200.000 đồng</span> án phí hình sự sơ thẩm.</p>
                  </div>
                )}
                {activeDemoTab === "thuly" && (
                  <div className="space-y-1">
                    <p className="text-slate-400">// Trích xuất văn bản có định cấu trúc</p>
                    <p className="font-bold text-slate-900">TÒA ÁN NHÂN DÂN QUẬN HOÀN KIẾM</p>
                    <p>Số: 12/2026/TLST-DS</p>
                    <p className="text-center font-bold py-1 text-slate-900">THÔNG BÁO THỤ LÝ VỤ ÁN</p>
                    <p>Ngày thụ lý: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">12/03/2026</span></p>
                    <p>Quan hệ pháp luật: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">Tranh chấp hợp đồng đặt cọc mua bán nhà</span></p>
                    <p>Nguyên đơn: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">LÊ VĂN C</span></p>
                    <p>Bị đơn: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">PHẠM THỊ D</span></p>
                  </div>
                )}
              </div>
            </div>

            {/* Cột 3: Bảng dữ liệu trích xuất cấu trúc */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="bg-slate-900 text-white px-4 py-3 text-xs font-bold flex items-center justify-between border-b border-slate-800">
                <span>3. Bảng dữ liệu trích xuất cấu trúc</span>
                <span className="px-2 py-0.5 bg-yellow-600 rounded text-[10px]">Xuất Excel/Word</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto text-xs bg-slate-50/50">
                <p className="text-[10px] text-slate-450 mb-3">// Dữ liệu đã chuẩn hóa phục vụ phân tích hồ sơ vụ án</p>
                {activeDemoTab === "caotrang" && (
                  <div className="space-y-3">
                    <table className="w-full text-left border-collapse border border-slate-200 bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead>
                        <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                          <th className="border border-slate-200 p-2">Thông tin</th>
                          <th className="border border-slate-200 p-2">Kết quả bóc tách</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-650">Bị can</td>
                          <td className="border border-slate-200 p-2 text-slate-800 font-bold">NGUYỄN VĂN A</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Ngày sinh</td>
                          <td className="border border-slate-200 p-2 text-slate-800">15/08/1992</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Tội danh</td>
                          <td className="border border-slate-200 p-2 text-red-700 font-medium">Trộm cắp tài sản (Khoản 2 Điều 173)</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Biện pháp</td>
                          <td className="border border-slate-200 p-2 text-amber-700 font-semibold">Tạm giam (Từ 20/02/2026)</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Thời gian tạm giam</td>
                          <td className="border border-slate-200 p-2 text-slate-800 font-bold">81 ngày (đến ngày lập báo cáo)</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex justify-end pt-2">
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center bg-emerald-50 border border-emerald-250 px-2 py-1 rounded">
                        <Check className="h-3 w-3 mr-1" /> Sẵn sàng kết xuất báo cáo án
                      </span>
                    </div>
                  </div>
                )}
                {activeDemoTab === "banan" && (
                  <div className="space-y-3">
                    <table className="w-full text-left border-collapse border border-slate-200 bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead>
                        <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                          <th className="border border-slate-200 p-2">Thông tin</th>
                          <th className="border border-slate-200 p-2">Kết quả bóc tách</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Bị cáo</td>
                          <td className="border border-slate-200 p-2 text-slate-800 font-bold">TRẦN THỊ B</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Tội danh</td>
                          <td className="border border-slate-200 p-2 text-red-700 font-medium">Lừa đảo chiếm đoạt tài sản (Điều 174)</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Hình phạt tù</td>
                          <td className="border border-slate-200 p-2 text-slate-800 font-bold">07 năm tù giam</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Ngày tạm giam</td>
                          <td className="border border-slate-200 p-2 text-slate-800">10/11/2025</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Án phí HSST</td>
                          <td className="border border-slate-200 p-2 text-slate-800">200.000 đồng</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex justify-end pt-2">
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center bg-emerald-50 border border-emerald-250 px-2 py-1 rounded">
                        <Check className="h-3 w-3 mr-1" /> Sẵn sàng xuất bảng Excel thụ lý
                      </span>
                    </div>
                  </div>
                )}
                {activeDemoTab === "thuly" && (
                  <div className="space-y-3">
                    <table className="w-full text-left border-collapse border border-slate-200 bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead>
                        <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                          <th className="border border-slate-200 p-2">Thông tin</th>
                          <th className="border border-slate-200 p-2">Kết quả bóc tách</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Ngày thụ lý</td>
                          <td className="border border-slate-200 p-2 text-slate-800 font-bold">12/03/2026</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Quan hệ pháp luật</td>
                          <td className="border border-slate-200 p-2 text-slate-800">Tranh chấp hợp đồng đặt cọc</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Nguyên đơn</td>
                          <td className="border border-slate-200 p-2 text-slate-800 font-semibold">LÊ VĂN C</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 font-semibold text-slate-655">Bị đơn</td>
                          <td className="border border-slate-200 p-2 text-slate-800 font-semibold">PHẠM THỊ D</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex justify-end pt-2">
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center bg-emerald-50 border border-emerald-250 px-2 py-1 rounded">
                        <Check className="h-3 w-3 mr-1" /> Đã bóc tách thông tin đương sự
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PHẦN 6 - SOCIAL PROOF (Dành cho) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Thiết kế chuyên biệt dành riêng cho công tác tư pháp
          </h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base">
            LexOCR đồng hành cùng cán bộ tư pháp tối ưu hóa quy trình nghiệp vụ nghiên cứu hồ sơ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Đối tượng 1: Kiểm sát viên */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:border-red-300 transition-colors">
            <div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center mb-5 border border-red-100">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-850 mb-3">Kiểm sát viên</h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                Số hóa nhanh Cáo trạng, Quyết định truy tố phục vụ lập bảng hệ thống danh sách bị can, bị cáo, đồng phạm; tính toán nhanh các thời hạn tố tụng, thời gian tạm giam, tạm giữ chuẩn xác, tự động hóa khâu làm báo cáo kết quả án.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-red-600">
              <span>Hỗ trợ thực hành quyền công tố</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          {/* Đối tượng 2: Thẩm phán */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:border-yellow-350 transition-colors">
            <div>
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center mb-5 border border-yellow-100">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-850 mb-3">Thẩm phán</h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                Tự động hóa số hóa văn bản tố tụng dân sự, hình sự phức tạp, bóc tách các lập luận chính, trích xuất danh sách đương sự và các quyết định, phán quyết trọng yếu của Tòa án phục vụ công tác chuẩn bị xét xử.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-yellow-605">
              <span>Hỗ trợ nghiên cứu hồ sơ xét xử</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          {/* Đối tượng 3: Luật sư */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:border-slate-400 transition-colors">
            <div>
              <div className="w-12 h-12 bg-slate-100 text-slate-750 rounded-lg flex items-center justify-center mb-5 border border-slate-200">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-850 mb-3">Luật sư</h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                Chuyển đổi tức thì tài liệu chụp hồ sơ tại Tòa án hoặc do khách hàng cung cấp sang dạng văn bản tìm kiếm được. Số hóa và trích lục thông tin nhanh chóng phục vụ xây dựng luận cứ bào chữa, bảo vệ đương sự tại Tòa.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Hỗ trợ bào chữa & Bảo vệ đương sự</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

        </div>
      </section>

      {/* PHẦN 7 - SỐ LIỆU (Hiệu quả thực tế) */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-850 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Hiệu quả thực tế của LexOCR
            </h2>
            <p className="mt-3 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Thông số thử nghiệm hiệu năng thực tế dựa trên các tài liệu tố tụng hành chính phổ biến.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            
            {/* Metric 1 */}
            <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700/50">
              <div className="text-red-400 text-4xl font-extrabold mb-2">~20 giây</div>
              <div className="text-sm font-bold text-slate-200 mb-1">10 trang Cáo trạng</div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Bóc tách toàn bộ nội dung, lập bảng bị can, xác định rõ tội danh và các mốc thời gian tố tụng.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700/50">
              <div className="text-yellow-400 text-4xl font-extrabold mb-2">~1 phút</div>
              <div className="text-sm font-bold text-slate-200 mb-1">50 trang Bản án</div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Số hóa và trích xuất các nhận định của Tòa án, quyết định hình phạt, xử lý án phí và các chi tiết thi hành án.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700/50">
              <div className="text-emerald-400 text-4xl font-extrabold mb-2">98%</div>
              <div className="text-sm font-bold text-slate-200 mb-1">Độ chính xác nhận diện</div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Áp dụng với các tài liệu scan đúng định dạng hành chính và văn bản in rõ nét của các cơ quan tố tụng.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* PHẦN 8 - BẢO MẬT & QUY TRÌNH STATELESS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-16 border-t border-slate-200 mt-4">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
          <Shield className="h-5 w-5 text-red-600 mr-2" />
          <span>KIẾN TRÚC BẢO MẬT & ĐỊNH HƯỚNG TIÊU CHUẨN AN TOÀN TƯ PHÁP</span>
        </h3>

        {/* SƠ ĐỒ 4 BƯỚC STATELESS */}
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
                Văn bản thô được chạy qua module nâng cao để ẩn danh tên đương sự, địa chỉ, số định danh theo đúng các quy định an ninh tố tụng.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start space-x-3">
            <div className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
              4
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Xuất DOCX/Excel sạch</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Tải về tệp tin an toàn. Toàn bộ tài liệu nhạy cảm biến mất khỏi RAM Edge ngay sau khi phản hồi.
              </p>
            </div>
          </div>
        </div>

        {/* LOWER COMPLIANCE & COMMITMENT ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left side: Định hướng tiêu chuẩn bảo mật */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                <Shield className="h-4.5 w-4.5 text-emerald-500" />
                <span>Yêu cầu an toàn thông tin</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kiến trúc giải pháp được thiết kế hướng tới việc đáp ứng các yêu cầu về An toàn thông tin cấp độ 3 dành cho hệ thống hành chính công theo định hướng của Bộ Thông tin & Truyền thông.
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
            <p className="text-xs text-slate-650 leading-relaxed">
              Cam kết 100% không lưu trữ bất kỳ bản sao tài liệu, thông tin đương sự hay lịch sử bóc tách nào của quý cán bộ lên máy chủ trung gian. Toàn bộ hoạt động thực thi hoàn toàn giải phóng khỏi bộ nhớ lưu trữ (Stateless Architecture).
            </p>
          </div>
        </div>
      </div>

      {/* Footer hành chính */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs gap-4">
          <p>© 2026 LexOCR. Trợ lý số hóa hồ sơ tố tụng và nghiên cứu hồ sơ chuyên sâu dành cho Kiểm sát viên, Thẩm phán và Luật sư.</p>
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