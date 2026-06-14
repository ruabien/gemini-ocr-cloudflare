/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sparkles, Check, ChevronRight, ShieldCheck, CreditCard, 
  Clock, AlertTriangle, Layers, FileSpreadsheet, FileText, 
  ShieldAlert, RefreshCw, HelpCircle, ArrowLeft, Trophy, CheckCircle2, UserCheck, X
} from "lucide-react";
import { UserSession } from "../types";

interface UpgradeProps {
  session: UserSession;
  membershipRole: "Free" | "Pro";
  setMembershipRole: (role: "Free" | "Pro") => void;
  setActiveTab: (tab: string) => void;
}

export default function UpgradeComponent({
  session,
  membershipRole,
  setMembershipRole,
  setActiveTab
}: UpgradeProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "verifying" | "success">("pending");
  const [timerSeconds, setTimerSeconds] = useState<number>(300); // 5 minutes
  const [logs, setLogs] = useState<string[]>([
    "Khởi tạo hóa đơn nghiệp vụ...",
    "Liên kết cổng thanh toán liên ngân hàng Napas 247..."
  ]);

  // Price Calculation
  const prices = {
    monthly: {
      amount: 450000,
      display: "450.000 đ",
      sub: "/ tháng",
      code: "VKS_OCR_MON_PRO"
    },
    yearly: {
      amount: 3200000,
      display: "3.200.000 đ",
      sub: "/ năm",
      details: "Tiết kiệm 40% so với gói tháng",
      code: "VKS_OCR_YEA_PRO"
    }
  };

  const activePlan = billingCycle === "monthly" ? prices.monthly : prices.yearly;

  // Real VietQR Image generation using public vietqr api
  const formattedAccountName = encodeURIComponent("DU AN VKS OCR CHUYEN NGHIEP");
  const formattedInfo = encodeURIComponent(`VKS PRO ${session.name.toUpperCase().replace(/[^A-Z ]/g, "")} ${billingCycle === "yearly" ? "1Y" : "1M"}`);
  
  const vietQrUrl = `https://api.vietqr.io/image/970422-190820268888-qF68VpM.jpg?accountName=${formattedAccountName}&amount=${activePlan.amount}&addInfo=${formattedInfo}`;

  // Timer Countdown
  useEffect(() => {
    if (!showQRModal || paymentStatus === "success") return;
    
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showQRModal, paymentStatus]);

  // Simulated live logs sequence & auto activation
  useEffect(() => {
    if (!showQRModal) return;

    let timeoutIds: any[] = [];

    if (paymentStatus === "pending") {
      // Step log 2
      timeoutIds.push(setTimeout(() => {
        setLogs(prev => [...prev, "Tạo mã QR tĩnh VietQR phục vụ thanh toán tư pháp thành công."]);
      }, 1500));

      // Step log 3
      timeoutIds.push(setTimeout(() => {
        setLogs(prev => [...prev, "Đang lắng nghe giao dịch hoàn tất từ máy chủ MB Bank..."]);
      }, 3000));

      // Auto trigger verification -> success
      timeoutIds.push(setTimeout(() => {
        setPaymentStatus("verifying");
        setLogs(prev => [...prev, "Phát hiện biến động số dư tương khớp tại Ngân hàng MB Bank!"]);
      }, 6500));

      timeoutIds.push(setTimeout(() => {
        setLogs(prev => [...prev, "Đang xác thực bảo mật chữ ký số giao dịch..."]);
      }, 7800));

      timeoutIds.push(setTimeout(() => {
        setPaymentStatus("success");
        setMembershipRole("Pro");
        setLogs(prev => [...prev, "KÍCH HOẠT THÀNH CÔNG: Tài khoản VKS PRO đã được mở khóa!"]);
      }, 9500));
    }

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [showQRModal]);

  const handleOpenPayment = () => {
    setPaymentStatus("pending");
    setTimerSeconds(300);
    setLogs([
      "Khởi tạo hóa đơn nghiệp vụ...",
      "Liên kết cổng thanh toán liên ngân hàng Napas 247..."
    ]);
    setShowQRModal(true);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
  };

  return (
    <div id="upgrade-view" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* HEADER QUYỀN TÁC VỤ */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase mb-2">
            <Trophy className="h-3.5 w-3.5 text-amber-600" />
            <span>NÂNG THẾ NGHIỆP VỤ CÔNG TỐ & KIỂM SÁT</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-sans font-bold text-slate-900 tracking-tight flex items-center">
            Mở khóa Toàn năng Trợ lý Số hóa VKS PRO
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Mở rộng tính năng bóc tách tự động, cấu trúc tệp Cáo trạng/Bản án lớn và hỗ trợ đặc quyền Kiểm sát viên các cấp.
          </p>
        </div>
        
        <button
          onClick={() => setActiveTab("ocr")}
          className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 font-bold border border-slate-200 hover:border-slate-300 bg-white rounded-lg px-3 py-2 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về trang bóc tách</span>
        </button>
      </div>

      {membershipRole === "Pro" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 flex-shrink-0">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-905">Độc quyền Tài khoản VKS PRO Đang hoạt động</h3>
              <p className="text-xs text-slate-600 mt-1">
                Kính gửi Kiểm sát viên <strong className="font-bold">{session.name}</strong>, đơn vị <strong className="font-bold">{session.department}</strong>. Toàn bộ tính năng cao cấp không giới hạn đã được mở khóa toàn diện.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("ocr")}
              className="w-full md:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
            >
              Phân tích tệp ngay
            </button>
          </div>
        </div>
      )}

      {/* BOX SO SÁNH QUYỀN LỢI FREE VÀ PRO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* BAN BIỂU SO SÁNH CÁC TÍNH NĂNG CHUYÊN BIỆT */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70">
            <h3 className="font-sans font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2">
              <Layers className="h-5 w-5 text-red-650 text-red-650 text-red-600" />
              <span>Bảng so sánh chi tiết tính năng nghiệp vụ</span>
            </h3>
          </div>
          
          <div className="divide-y divide-slate-100">
            
            {/* Tiêu đề cột bảng so sánh */}
            <div className="grid grid-cols-12 p-4 bg-slate-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150">
              <div className="col-span-6 text-slate-700">
                Tính năng nghiệp vụ
              </div>
              <div className="col-span-3 text-slate-600">
                Bản Miễn phí (Free)
              </div>
              <div className="col-span-3 text-amber-800">
                Bản Cao cấp (Pro)
              </div>
            </div>
            
            {/* Hàng 1 */}
            <div className="grid grid-cols-12 p-4 text-xs items-center gap-2 hover:bg-slate-50/50">
              <div className="col-span-6 font-bold text-slate-700">
                Bóc tách tài liệu hồ sơ vụ án
              </div>
              <div className="col-span-3 text-slate-500 font-mono">
                Tối đa 15 trang / tệp
              </div>
              <div className="col-span-3 font-semibold text-amber-700 flex items-center space-x-1 text-emerald-600 font-bold">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Không giới hạn</span>
              </div>
            </div>

            {/* Hàng 2 */}
            <div className="grid grid-cols-12 p-4 text-xs items-center gap-2 hover:bg-slate-50/50">
              <div className="col-span-6 font-bold text-slate-700">
                Xuất kết quả chỉnh sửa thô (.TXT)
              </div>
              <div className="col-span-3 text-slate-500">
                Hỗ trợ
              </div>
              <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>Hỗ trợ</span>
              </div>
            </div>

            {/* Hàng 3 */}
            <div className="grid grid-cols-12 p-4 text-xs items-center gap-2 hover:bg-slate-50/50">
              <div className="col-span-6 font-bold text-slate-700">
                Kết xuất văn bản chuẩn Nghị định 30 (Lề tố tụng Word .DOCX)
              </div>
              <div className="col-span-3 text-red-500 font-medium">
                Bị khóa (Chỉ copy text)
              </div>
              <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Mở khóa hoàn toàn</span>
              </div>
            </div>

            {/* Hàng 4 */}
            <div className="grid grid-cols-12 p-4 text-xs items-center gap-2 hover:bg-slate-50/50">
              <div className="col-span-6 font-bold text-slate-700">
                Tách lập bảng danh mục bị can, tội danh sang Excel (.XLSX)
              </div>
              <div className="col-span-3 text-red-500 font-medium">
                Bị khóa
              </div>
              <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Chuẩn hóa tố tụng</span>
              </div>
            </div>

            {/* Hàng 5 */}
            <div className="grid grid-cols-12 p-4 text-xs items-center gap-2 hover:bg-slate-50/50">
              <div className="col-span-6 font-bold text-slate-700">
                Nhận diện cấu trúc văn bản hành chính Việt Nam phức tạp
              </div>
              <div className="col-span-3 text-slate-400">
                Cơ bản
              </div>
              <div className="col-span-3 text-amber-700 font-bold flex items-center space-x-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span>Mô hình thông minh nhất</span>
              </div>
            </div>

            {/* Hàng 6 */}
            <div className="grid grid-cols-12 p-4 text-xs items-center gap-2 hover:bg-slate-50/50">
              <div className="col-span-6 font-bold text-slate-700">
                Tốc độ xử lý OCR & phân trang thông tin tự động
              </div>
              <div className="col-span-3 text-slate-400">
                Băng thông chia sẻ
              </div>
              <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>Ưu tiên Edge Node cao nhất</span>
              </div>
            </div>

            {/* Hàng 7 */}
            <div className="grid grid-cols-12 p-4 text-xs items-center gap-2 hover:bg-slate-50/50">
              <div className="col-span-6 font-bold text-slate-700">
                Cam kết Stateless & Bảo mật AES-256 đầu cuối
              </div>
              <div className="col-span-3 text-slate-500">
                Hỗ trợ
              </div>
              <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>Bảo chứng tuyệt đối</span>
              </div>
            </div>

          </div>

          <div className="p-4 bg-slate-50 text-[10.5px] text-slate-500 border-t border-slate-150 leading-relaxed italic">
            * Hệ thống tuân thủ Nghị quyết số 51 và các Chỉ thị về chuyển đổi số định hướng tư pháp của Viện trưởng Viện kiểm sát nhân dân tối cao.
          </div>
        </div>

        {/* BẢNG GIÁ & NÚT NÂNG CẤP CHỌN GÓI */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-md p-6 relative flex flex-col justify-between">
            {/* Tag Nhất cử lưỡng tiện */}
            <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-slate-900 border border-yellow-500/40 text-yellow-400 font-mono text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase shadow">
              ƯU TIÊN CÔNG VỤ
            </div>

            <div className="space-y-4">
              <h3 className="font-sans font-black text-slate-900 text-lg sm:text-xl flex items-center space-x-1">
                <span>VKS OCR PRO</span>
                <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded ml-2">PREMIUM</span>
              </h3>
              
              <p className="text-slate-500 text-xs">
                Lựa chu kỳ thanh toán linh hoạt cho cá nhân hoặc hỗ trợ ngân sách tố tụng của cơ quan, đoàn thể.
              </p>

              {/* Táp lựa chọn billing */}
              <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Gói Tháng
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer relative ${
                    billingCycle === "yearly"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Gói Năm
                  <span className="absolute -top-2.5 -right-1 bg-amber-500 text-slate-950 font-black text-[7px] px-1.5 py-0.5 rounded-full uppercase border border-slate-800 animate-pulse">
                    -30%
                  </span>
                </button>
              </div>

              {/* Kế toán giá */}
              <div className="py-2.5 border-t border-b border-slate-100 space-y-1">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">{activePlan.display}</span>
                  <span className="text-slate-400 text-xs font-semibold">{activePlan.sub}</span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 inline-block rounded">
                    Tiết kiệm hơn 2.000.000đ so với gói tháng
                  </p>
                )}
              </div>

              {/* Danh sách nhanh */}
              <ul className="space-y-2.5 pt-1.5">
                {[
                  "Không giới hạn số lượt quét bản án",
                  "Mở khóa toàn bộ định dạng xuất DOCX & Excel",
                  "Giải thuật OCR tự động khôi phục đại tự tố tụng",
                  "Quét tệp PDF dày tới hàng trăm trang riêng biệt",
                  "Quyền truy cập API tốc độ cao ưu tiên"
                ].map((item, index) => (
                  <li key={index} className="flex items-start space-x-2 text-xs text-slate-650 text-slate-700">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 space-y-3">
              <button
                onClick={handleOpenPayment}
                className="w-full bg-gradient-to-r from-red-650 to-red-600 bg-red-600 hover:bg-red-700 text-white font-black py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center cursor-pointer flex items-center justify-center space-x-2 border border-yellow-500/20"
              >
                <CreditCard className="h-4.5 w-4.5 text-yellow-400" />
                <span>NÂNG CẤP LÊN BẢN PRO NGAY</span>
              </button>

              <p className="text-[10px] text-center text-slate-400 italic">
                * Kích hoạt tự động sau khi hoàn tất giao dịch. Có xuất hóa đơn đỏ (VAT 8%) cho Viện kiểm sát nhân dân cấp tỉnh/huyện nếu được yêu cầu.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL HIỂN THỊ QR CHUYỂN KHOẢN VIETQR (REAL-TIME ACTIVATION) */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-150 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 overflow-hidden shadow-2xl relative animate-scale-up">
            
            {/* Nút đóng */}
            <button 
              onClick={() => {
                if (paymentStatus === "success") {
                  setActiveTab("ocr");
                }
                setShowQRModal(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12">
              
              {/* CỘT THÔNG TIN HÓA ĐƠN - MB Bank */}
              <div className="md:col-span-5 bg-slate-50 border-r border-slate-200 text-slate-900 p-6 flex flex-col justify-between">
                <div>
                  <div className="h-8 bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider inline-block mb-4">
                    VietQR / Napas 247
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 mb-4">Kết nối tới MB Bank</h3>
                  
                  <div className="space-y-4 text-xs font-medium">
                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Ngân hàng thụ hưởng</p>
                      <p className="text-slate-800 font-bold">MB Bank (Ngân hàng Quân đội)</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Số tài khoản nghiệp vụ</p>
                      <p className="text-red-600 font-mono font-bold text-sm tracking-wide">190820268888</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Chủ tài khoản</p>
                      <p className="text-slate-800 font-bold">DU AN CONG NGHE VKS OCR</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Số tiền quyết định</p>
                      <p className="text-slate-900 font-mono font-black text-sm text-[15px]">{activePlan.display}</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Nội dung bắt buộc</p>
                      <p className="text-red-700 font-mono font-bold bg-white p-1.5 rounded border border-red-200 break-words select-all text-[11px]">
                        VKS PRO {session.name.toUpperCase().replace(/[^A-Z ]/g, "")} {billingCycle === "yearly" ? "1Y" : "1M"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 mt-4 text-[10px] text-slate-500 leading-relaxed">
                  * Vui lòng nhập chuẩn xác nội dung chuyển khoản ở thiết bị di động để hệ thống khớp nối tự động trong 5-10 giây.
                </div>
              </div>

              {/* CỘT QUÉT MÃ QR & NHẬT KÝ ĐỒNG BỘ */}
              <div className="md:col-span-7 p-6 flex flex-col justify-between items-center text-center space-y-4">
                
                {paymentStatus === "pending" && (
                  <>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">Quét mã bằng ứng dụng Ngân hàng (VietQR)</h4>
                      <p className="text-[10px] text-slate-500">Mở ứng dụng Mobile Banking của bạn để quét mã và giao dịch tự động</p>
                    </div>

                    {/* QR BOX */}
                    <div className="border border-slate-200 p-2.5 rounded-2xl bg-white shadow-inner relative group select-none">
                      <img 
                        referrerPolicy="no-referrer"
                        src={vietQrUrl} 
                        alt="Mã QR thanh toán MB Bank" 
                        className="h-56 w-56 object-contain"
                      />
                      <div className="absolute top-2 right-2 bg-slate-900 border border-slate-800/40 px-2 py-0.5 rounded text-[8px] text-white font-mono font-bold flex items-center space-x-1 shadow">
                        <Clock className="h-3 w-3 text-red-500 animate-pulse" />
                        <span>Mã hết hạn trong: {formatTime(timerSeconds)}</span>
                      </div>
                    </div>

                    {/* LIVE STATUS LOGGER */}
                    <div className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-left space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                        <span>Trạng thái kết nối Napas</span>
                        <span className="flex items-center space-x-1">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin text-amber-600" />
                          <span className="text-amber-600">Đang trực tuyến...</span>
                        </span>
                      </p>
                      <div className="max-h-[75px] overflow-y-auto space-y-1 font-mono text-[9px] text-slate-600">
                        {logs.slice(-3).map((log, idx) => (
                          <p key={idx} className="flex items-start space-x-1.5">
                            <span className="text-slate-400 font-bold">&gt;</span>
                            <span>{log}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {paymentStatus === "verifying" && (
                  <div className="flex flex-col items-center justify-center space-y-4 py-8 w-full">
                    <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
                      <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-slate-800 text-sm">Đang xác thực bảo mật tài chính...</h4>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                        Nhận xung tín hiệu MB Bank thành công. Hệ thống đang đối soát nội dung chuyển khoản để tự động nâng cấp gói cho cán bộ.
                      </p>
                    </div>

                    <div className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-left">
                      <div className="space-y-1 font-mono text-[9px] text-slate-600">
                        {logs.slice(-3).map((log, idx) => (
                          <p key={idx} className="flex items-start space-x-1.5">
                            <span className="text-slate-400 font-bold">&gt;</span>
                            <span>{log}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {paymentStatus === "success" && (
                  <div className="flex flex-col items-center justify-center space-y-5 py-6 w-full">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-bounce">
                      <Check className="h-8 w-8 text-emerald-600 font-black animate-scale" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black text-slate-900 text-base">Nâng cấp VKS OCR PRO thành công!</h4>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                        Tài khoản Kiểm sát viên <strong className="font-bold">{session.name}</strong> đã tự động nâng cấp thành công lên quyền PRO vô hạn. Mở khóa xuất tệp Word lề tố tụng và Excel danh bị can ngay tức thì.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowQRModal(false);
                        setActiveTab("ocr");
                      }}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-wide border border-transparent flex items-center justify-center space-x-1.5"
                    >
                      <span>Trải nghiệm tính năng PRO ngay</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
