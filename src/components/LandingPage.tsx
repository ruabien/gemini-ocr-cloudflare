/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Shield, 
  Lock, 
  FileText, 
  LayoutGrid, 
  Terminal, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Clock,
  Users,
  Calendar,
  FileSpreadsheet,
  Check,
  ChevronDown
} from "lucide-react";

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
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">Trích xuất danh sách bị can, người làm chứng, diễn biến hành vi phạm tội và tội danh đề nghị truy tố.</p>
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
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">Trích xuất toàn bộ thông tin bị cáo/thông tin đương sự, nội dung vụ án và phán quyết của Tòa án.</p>
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
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">Trích xuất và giúp nhập liệu nhanh thông tin thụ lý vụ án, danh sách nguyên đơn, bị đơn, người có quyền lợi và nghĩa vụ liên quan trong án dân sự.</p>
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

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Lợi ích 1 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
            <div className="absolute top-0 left-0 h-1 bg-red-600 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-5 w-5 text-red-600 flex-shrink-0" />
                <h3 className="text-sm font-bold text-slate-850">Giảm thời gian nhập liệu</h3>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Tự động chuyển đổi toàn bộ tài liệu hồ sơ vụ án, cáo trạng dạng giấy hoặc ảnh chụp sang văn bản số trong vài giây mà không cần gõ lại thủ công.
              </p>
            </div>
          </div>

          {/* Lợi ích 2 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
            <div className="absolute top-0 left-0 h-1 bg-yellow-500 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Users className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <h3 className="text-sm font-bold text-slate-850">Tự động lập bảng bị can, bị cáo</h3>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Trích xuất tự động danh sách bị can, bị cáo, đồng phạm cùng các thông tin nhân thân, hành vi phạm tội cụ thể và điều khoản truy tố.
              </p>
            </div>
          </div>

          {/* Lợi ích 4 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
            <div className="absolute top-0 left-0 h-1 bg-emerald-600 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <h3 className="text-sm font-bold text-slate-850">Xuất DOCX phục vụ nghiên cứu hồ sơ</h3>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Kết xuất toàn bộ văn bản và dữ liệu cấu trúc hóa ra file Word (.docx) chuẩn quy định hành chính, làm tài liệu nền tảng cho báo cáo án hình sự.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 5 - DEMO OCR THỰC TẾ */}
      <section className="bg-slate-100 border-t border-b border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Ví dụ bóc tách Thông báo thụ lý
            </h2>
            <p className="mt-3 text-slate-500 text-sm">
              Minh họa luồng số hóa và trích xuất thông tin tự động từ hồ sơ tố tụng thực tế đã được ẩn danh bảo mật.
            </p>
          </div>

          {/* Demo content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Cột 1: Ảnh hồ sơ gốc (mô phỏng) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="bg-slate-900 text-white px-4 py-3 text-xs font-bold flex items-center justify-between border-b border-slate-800">
                <span>1. Hồ sơ gốc</span>
                <span className="px-2 py-0.5 bg-red-600/80 rounded text-[10px]">Tài liệu gốc</span>
              </div>
              <div className="p-4 flex-1 overflow-hidden font-mono text-[10px] text-slate-650 leading-relaxed select-none bg-slate-50/50 relative">
                <div className="space-y-2 border border-slate-200 p-3 bg-white shadow-inner relative h-full overflow-hidden">
                  <div className="text-center font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>Độc lập - Tự do - Hạnh phúc</div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div>TÒA ÁN NHÂN DÂN QUẬN HOÀN KIẾM</div>
                  <div>Số: 12/2026/TLST-DS</div>
                  <div className="text-center font-bold text-xs py-2">THÔNG BÁO THỤ LÝ VỤ ÁN</div>
                  <p>Kính gửi: Các đương sự trong vụ án.</p>
                  <p>Tòa án nhân dân quận Hoàn Kiếm thông báo thụ lý vụ án dân sự:</p>
                  <p className="bg-yellow-100 font-semibold p-1">Ngày thụ lý: 12 tháng 03 năm 2026.</p>
                  <p className="bg-yellow-100 font-semibold p-1">Quan hệ pháp luật: "Tranh chấp hợp đồng đặt cọc mua bán nhà".</p>
                  <p className="bg-yellow-100 font-semibold p-1">Nguyên đơn: Ông LÊ VĂN C</p>
                  <p className="bg-yellow-100 font-semibold p-1">Bị đơn: Bà PHẠM THỊ D</p>
                  
                  {/* Fade effect */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Cột 2: Kết quả số hóa văn bản (OCR) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="bg-slate-900 text-white px-4 py-3 text-xs font-bold flex items-center justify-between border-b border-slate-800">
                <span>2. Văn bản OCR</span>
                <span className="px-2 py-0.5 bg-emerald-600 rounded text-[10px]">Độ chính xác 98%</span>
              </div>
              <div className="p-4 flex-1 overflow-hidden font-mono text-[10px] text-slate-650 leading-relaxed select-none bg-slate-50/50">
                <div className="space-y-1">
                  <p className="text-slate-400">// Trích xuất văn bản có định cấu trúc</p>
                  <p className="font-bold text-slate-900">TÒA ÁN NHÂN DÂN QUẬN HOÀN KIẾM</p>
                  <p>Số: 12/2026/TLST-DS</p>
                  <p className="text-center font-bold py-1 text-slate-900">THÔNG BÁO THỤ LÝ VỤ ÁN</p>
                  <p>Ngày thụ lý: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">12/03/2026</span></p>
                  <p>Quan hệ pháp luật: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">Tranh chấp hợp đồng đặt cọc mua bán nhà</span></p>
                  <p>Nguyên đơn: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">LÊ VĂN C</span></p>
                  <p>Bị đơn: <span className="bg-emerald-100 px-1 font-semibold rounded text-slate-900">PHẠM THỈ D</span></p>
                </div>
              </div>
            </div>

            {/* Cột 3: Bảng dữ liệu trích xuất cấu trúc */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="bg-slate-900 text-white px-4 py-3 text-xs font-bold flex items-center justify-between border-b border-slate-800">
                <span>3. Dữ liệu trích xuất</span>
                <span className="px-2 py-0.5 bg-yellow-600 rounded text-[10px]">Xuất Excel/Word</span>
              </div>
              <div className="p-4 flex-1 overflow-hidden text-xs bg-slate-50/50">
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
            </div>

          </div>
        </div>
      </section>

      {/* PHẦN 7 - SỐ LIỆU (Hiệu quả thực tế) */}
      <section className="relative bg-gradient-to-b from-slate-900 to-slate-800 text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background decorative grids */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        
        {/* Ambient shadow glow red/gold */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-5 right-5 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Hiệu quả thực tế của LexOCR
            </h2>
            <p className="mt-3 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Thông số thử nghiệm hiệu năng thực tế dựa trên các tài liệu tố tụng hành chính phổ biến.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
            
            {/* Metric 1 */}
            <div className="bg-slate-900/60 backdrop-blur-sm p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors duration-300">
              <div className="text-red-500 text-4xl font-black mb-2 drop-shadow-[0_2px_10px_rgba(239,68,68,0.15)]">~20 giây</div>
              <div className="text-sm font-bold text-slate-200 mb-1">10 trang Cáo trạng</div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Bóc tách toàn bộ nội dung, lập bảng bị can, xác định rõ tội danh và các mốc thời gian tố tụng.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="bg-slate-900/60 backdrop-blur-sm p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors duration-300">
              <div className="text-yellow-400 text-4xl font-black mb-2 drop-shadow-[0_2px_10px_rgba(234,179,8,0.15)]">~1 phút</div>
              <div className="text-sm font-bold text-slate-200 mb-1">50 trang Bản án</div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Số hóa và trích xuất các nhận định của Tòa án, quyết định hình phạt, xử lý án phí và các chi tiết thi hành án.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="bg-slate-900/60 backdrop-blur-sm p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors duration-300">
              <div className="text-emerald-400 text-4xl font-black mb-2 drop-shadow-[0_2px_10px_rgba(16,185,129,0.15)]">98%</div>
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
          <span>KIẾN TRÚC BẢO MẬT & TIÊU CHUẨN AN TOÀN TƯ PHÁP</span>
        </h3>

        {/* SƠ ĐỒ 4 BƯỚC STATELESS */}
        <div className="flex flex-col md:flex-row items-stretch justify-center gap-2 mb-6">
          {/* Step 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start space-x-3 flex-1 border-t-4" style={{ borderTopColor: "#2563eb" }}>
            <div className="h-6 w-6 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: "#2563eb" }}>
              1
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#2563eb" }}>1. Tải hồ sơ & mã hóa</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Tệp quét của phòng tư pháp được nạp lên trình duyệt, kích hoạt AES-256 mã hóa gói byte nhị phân.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center text-blue-600 self-center py-2 md:py-0">
            <span className="hidden md:inline text-2xl font-black px-1 opacity-90">→</span>
            <span className="inline md:hidden text-2xl font-black py-1 opacity-90">↓</span>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start space-x-3 flex-1 border-t-4" style={{ borderTopColor: "#7c3aed" }}>
            <div className="h-6 w-6 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: "#7c3aed" }}>
              2
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#7c3aed" }}>2. OCR & bóc tách dữ liệu</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Cloudflare Worker tiếp nhận chuyển khoản, giải mã tạm thời trên RAM và gọi trực tiếp Google Cloud Vision API.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center text-purple-600 self-center py-2 md:py-0">
            <span className="hidden md:inline text-2xl font-black px-1 opacity-90">→</span>
            <span className="inline md:hidden text-2xl font-black py-1 opacity-90">↓</span>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start space-x-3 flex-1 border-t-4" style={{ borderTopColor: "#f59e0b" }}>
            <div className="h-6 w-6 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: "#f59e0b" }}>
              3
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#f59e0b" }}>3. Chuẩn hóa & ẩn danh</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Văn bản thô được chạy qua module nâng cao để ẩn danh tên đương sự, địa chỉ, số định danh theo đúng các quy định an ninh tố tụng.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center text-amber-600 self-center py-2 md:py-0">
            <span className="hidden md:inline text-2xl font-black px-1 opacity-90">→</span>
            <span className="inline md:hidden text-2xl font-black py-1 opacity-90">↓</span>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start space-x-3 flex-1 border-t-4" style={{ borderTopColor: "#10b981" }}>
            <div className="h-6 w-6 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: "#10b981" }}>
              4
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#10b981" }}>4. Xuất kết quả nghiên cứu</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                Tải về tệp tin an toàn. Toàn bộ tài liệu nhạy cảm biến mất khỏi RAM Edge ngay sau khi phản hồi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer hành chính */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs">
          <p>© 2026 LexOCR · Trợ lý số hóa hồ sơ tố tụng</p>
        </div>
      </footer>
    </div>
  );
}