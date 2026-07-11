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
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const faqs = [
    {
      question: "LexOCR có lưu hồ sơ của tôi không?",
      answer: "Không. LexOCR không lưu PDF, hình ảnh, nội dung OCR hoặc dữ liệu trích xuất sau khi hoàn tất xử lý."
    },
    {
      question: "Vì sao tôi phải sử dụng API Gemini của riêng mình?",
      answer: "Điều này giúp dữ liệu được xử lý trực tiếp thông qua tài khoản Google AI Studio của bạn và giảm thiểu việc chia sẻ dữ liệu qua bên thứ ba."
    },
    {
      question: "Gói Free có giới hạn gì?",
      answer: "Gói Free đáp ứng nhu cầu OCR cơ bản bằng API Gemini của chính người dùng. Một số tính năng nâng cao như DOCX chuẩn Nghị định 30, Ẩn danh và Trích xuất Excel nâng cao thuộc gói PRO."
    },
    {
      question: "Gói PRO có cộng dồn thời gian không?",
      answer: "Có. Nếu mua thêm khi gói PRO còn hạn, thời gian sẽ được cộng dồn."
    },
    {
      question: "Tôi có thể sử dụng LexOCR trong cơ quan không?",
      answer: "Có. LexOCR được thiết kế phục vụ nhu cầu số hóa và nghiên cứu hồ sơ trong lĩnh vực tư pháp."
    },
    {
      question: "Tôi có thể sử dụng API Gemini miễn phí không?",
      answer: "Có. Google AI Studio cung cấp quota miễn phí phù hợp với nhu cầu sử dụng thông thường."
    },
    {
      question: "LexOCR có hỗ trợ OCR tiếng Việt không?",
      answer: "Có. LexOCR được tối ưu cho tài liệu tiếng Việt."
    },
    {
      question: "Sau khi hết hạn PRO thì sao?",
      answer: "Tài khoản sẽ tự động chuyển về gói Free, dữ liệu tài khoản vẫn được giữ nguyên."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div id="landing-container" className="flex flex-col w-full animate-fade-in">
      
      {/* Hero section */}
      <section className="relative bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20 px-6 sm:px-12 overflow-hidden w-full">
        {/* Background decorative grids */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        
        {/* Ambient shadow glow red/gold */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-1.5 rounded-full text-xs font-medium mb-6 max-w-full text-center">
            <Shield className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>Một công cụ miễn phí hỗ trợ số hóa và nghiên cứu hồ sơ tố tụng dành cho Kiểm sát viên</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            Giảm 90% thời gian nhập liệu{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-300 to-red-500">
              hồ sơ vụ án
            </span>
          </h1>
          
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Tự động chuyển hồ sơ giấy thành dữ liệu nghiên cứu có cấu trúc. Hỗ trợ bóc tách Cáo trạng, Bản án, Quyết định, Thông báo thụ lý và Biên bản tố tụng trong vài giây.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm tracking-wide rounded-lg flex items-center justify-center space-x-2 shadow-lg border border-yellow-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <span>Bắt đầu sử dụng ngay</span>
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

      {/* PHẦN 4 - THÊM KHỐI LỢI ÍCH NGAY SAU HERO */}
      <section className="py-16 px-6 sm:px-12 bg-white w-full border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
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
                <h3 className="text-sm font-bold text-slate-855">Xuất DOCX phục vụ nghiên cứu hồ sơ</h3>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Kết xuất toàn bộ văn bản và dữ liệu cấu trúc hóa ra file Word (.docx) chuẩn quy định hành chính, làm tài liệu nền tảng cho báo cáo án hình sự.
              </p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* PHẦN 5 - DEMO OCR THỰC TẾ */}
      <section className="bg-slate-100/50 py-16 px-6 sm:px-12 w-full border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Từ hồ sơ giấy đến dữ liệu nghiên cứu
            </h2>
            <p className="mt-3 text-slate-500 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
              Minh họa quy trình chuyển đổi từ ảnh chụp hồ sơ thực tế sang dữ liệu có cấu trúc phục vụ nghiên cứu và thực hành quyền công tố.
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
      <section className="relative bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20 px-6 sm:px-12 overflow-hidden w-full">
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
              <div className="text-emerald-400 text-3xl font-black mb-2 drop-shadow-[0_2px_10px_rgba(16,185,129,0.15)]">Tối ưu</div>
              <div className="text-sm font-bold text-slate-200 mb-1">Hỗ trợ nhận diện tiếng Việt pháp lý</div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Phù hợp tài liệu scan rõ nét của các cơ quan tố tụng.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* PHẦN 8 - BẢO MẬT & QUY TRÌNH STATELESS */}
      <section className="bg-slate-50 py-16 px-6 sm:px-12 w-full border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center">
            <Shield className="h-5 w-5 text-red-600 mr-2" />
            <span>KIẾN TRÚC BẢO MẬT & TIÊU CHUẨN AN TOÀN TƯ PHÁP</span>
          </h3>

          {/* SƠ ĐỒ 4 BƯỚC STATELESS */}
          <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4 lg:gap-2 mb-6">
            {/* Step 1 */}
            <div className="bg-white border border-slate-250 rounded-xl p-5 shadow-sm flex items-start space-x-3 flex-1 border-t-4" style={{ borderTopColor: "#2563eb" }}>
              <div className="h-6 w-6 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: "#2563eb" }}>
                1
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#2563eb" }}>1. Tải hồ sơ & mã hóa</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                  Hồ sơ được nạp trực tiếp từ thiết bị người dùng và xử lý trong môi trường an toàn.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center text-slate-400 self-center py-1 lg:py-0 flex-shrink-0">
              <span className="hidden lg:inline text-xl font-black px-1 opacity-60">→</span>
              <span className="inline lg:hidden text-xl font-black py-1 opacity-60">↓</span>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-250 rounded-xl p-5 shadow-sm flex items-start space-x-3 flex-1 border-t-4" style={{ borderTopColor: "#7c3aed" }}>
              <div className="h-6 w-6 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: "#7c3aed" }}>
                2
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#7c3aed" }}>2. OCR & bóc tách dữ liệu</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                  Hệ thống tự động nhận diện và bóc tách nội dung từ PDF hoặc ảnh chụp hồ sơ.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center text-slate-400 self-center py-1 lg:py-0 flex-shrink-0">
              <span className="hidden lg:inline text-xl font-black px-1 opacity-60">→</span>
              <span className="inline lg:hidden text-xl font-black py-1 opacity-60">↓</span>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-250 rounded-xl p-5 shadow-sm flex items-start space-x-3 flex-1 border-t-4" style={{ borderTopColor: "#f59e0b" }}>
              <div className="h-6 w-6 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: "#f59e0b" }}>
                3
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#f59e0b" }}>3. Chuẩn hóa & ẩn danh</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                  Dữ liệu được chuẩn hóa để phục vụ nghiên cứu hồ sơ, báo cáo và lưu trữ.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center text-slate-400 self-center py-1 lg:py-0 flex-shrink-0">
              <span className="hidden lg:inline text-xl font-black px-1 opacity-60">→</span>
              <span className="inline lg:hidden text-xl font-black py-1 opacity-60">↓</span>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-250 rounded-xl p-5 shadow-sm flex items-start space-x-3 flex-1 border-t-4" style={{ borderTopColor: "#10b981" }}>
              <div className="h-6 w-6 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: "#10b981" }}>
                4
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#10b981" }}>4. Xuất kết quả nghiên cứu</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                  Kết xuất dữ liệu dưới dạng văn bản hoặc bảng biểu phục vụ công việc chuyên môn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 sm:px-12 bg-white w-full border-t border-slate-200">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Câu hỏi thường gặp (FAQ)
            </h2>
            <p className="mt-3 text-slate-500 text-xs sm:text-sm">
              Giải đáp các thắc mắc phổ biến về dịch vụ, bảo mật và tính năng của LexOCR.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div 
                  key={index}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30 hover:bg-slate-50/80 transition-colors duration-200"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-slate-800 text-sm sm:text-base hover:text-red-650 transition-colors duration-200 focus:outline-none"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown 
                      className={`h-5 w-5 text-slate-400 transform transition-transform duration-300 flex-shrink-0 ml-4 ${
                        isOpen ? "rotate-180 text-red-600" : ""
                      }`}
                    />
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-[500px] opacity-100 border-t border-slate-150" : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="px-5 py-4 text-xs sm:text-sm text-slate-600 leading-relaxed bg-white">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer hành chính */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
            <button
              onClick={() => setActiveTab("privacy")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Chính sách bảo mật
            </button>
            <button
              onClick={() => setActiveTab("terms")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Điều khoản sử dụng
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-1 mb-2 text-slate-500">
            <span>Hỗ trợ kỹ thuật: <a href="mailto:support@lexocr.com" className="hover:text-slate-300 transition-colors">support@lexocr.com</a></span>
            <span>Thanh toán & Gói PRO: <a href="mailto:billing@lexocr.com" className="hover:text-slate-300 transition-colors">billing@lexocr.com</a></span>
          </div>
          <p>© 2026 LexOCR</p>
        </div>
      </footer>
    </div>
  );
}
