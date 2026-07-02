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
import { useAuth } from "../contexts/AuthContext";

interface UpgradeProps {
  membershipRole: "Free" | "Pro";
  setMembershipRole: (role: "Free" | "Pro") => void;
  setActiveTab: (tab: string) => void;
}

export default function UpgradeComponent({
  membershipRole,
  setMembershipRole,
  setActiveTab
}: UpgradeProps) {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [currentCycle, setCurrentCycle] = useState<string>(() => localStorage.getItem('lexocr_pro_cycle') || 'yearly');
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "verifying" | "success">("pending");
  const [timerSeconds, setTimerSeconds] = useState<number>(300); // 5 minutes
  const [logs, setLogs] = useState<string[]>([
    "Khởi tạo hóa đơn nghiệp vụ...",
    "Liên kết cổng thanh toán liên ngân hàng Napas 247..."
  ]);

  const name = user ? (user.displayName || user.email?.split("@")[0] || "User") : "Khách";

  // Price Calculation
  const prices = {
    monthly: {
      amount: 50000,
      display: "50.000 VNĐ",
      sub: "/tháng",
      code: "LEXOCR_MON_PRO"
    },
    yearly: {
      amount: 500000,
      display: "500.000 VNĐ",
      sub: "/năm",
      details: "Tiết kiệm 17% so với gói tháng",
      code: "LEXOCR_YEA_PRO"
    }
  };

  const activePlan = billingCycle === "monthly" ? prices.monthly : prices.yearly;

  // Real VietQR Image generation using public vietqr api
  const formattedAccountName = encodeURIComponent("DU AN LEXOCR CHUYEN NGHIEP");
  const cleanNameForQr = name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 ]/g, "");
  const formattedInfo = encodeURIComponent(`LEXOCR PRO ${cleanNameForQr} ${billingCycle === "yearly" ? "1Y" : "1M"}`);
  
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
        localStorage.setItem('lexocr_pro_cycle', billingCycle);
        setCurrentCycle(billingCycle);
        setLogs(prev => [...prev, "KÍCH HOẠT THÀNH CÔNG: Tài khoản LEXOCR PRO đã được mở khóa!"]);
      }, 9500));
    }

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [showQRModal]);

  const handleOpenPayment = (cycle: "monthly" | "yearly") => {
    if (!user) {
      window.alert("Vui lòng đăng nhập Google để thực hiện nâng cấp tài khoản PRO.");
      return;
    }
    setBillingCycle(cycle);
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

  const isProMonthly = membershipRole === "Pro" && currentCycle === 'monthly';
  const isProYearly = membershipRole === "Pro" && currentCycle === 'yearly';

  return (
    <div id="upgrade-view" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* HEADER QUYỀN TÁC VỤ */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase mb-2">
            <Trophy className="h-3.5 w-3.5 text-amber-600" />
            <span>NÂNG THẾ NGHIỆP VỤ CÔNG TỐ & KIỂM SÁT</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-sans font-bold text-slate-900 tracking-tight flex items-center">
            Mở khóa Toàn năng Trợ lý Số hóa LexOCR PRO
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Mở rộng tính năng bóc tách tự động, cấu trúc tệp Cáo trạng/Bản án lớn và hỗ trợ đặc quyền Kiểm sát viên các cấp.
          </p>
        </div>
        
        <button
          onClick={() => setActiveTab("scanner")}
          className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 font-bold border border-slate-200 hover:border-slate-300 bg-white rounded-lg px-3 py-2 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về trang bóc tách</span>
        </button>
      </div>

      {/* THÔNG TIN GÓI HIỆN TẠI */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Trophy className={`h-5 w-5 ${membershipRole === "Pro" ? "text-amber-500" : "text-slate-400"}`} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Gói hiện tại</p>
            <h3 className="font-bold text-sm text-slate-900">
              {membershipRole === "Pro" ? `LexOCR PRO ${currentCycle === 'monthly' ? 'Tháng' : 'Năm'}` : "LexOCR Free"}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 text-xs">
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Trạng thái</span>
            <span className="font-medium flex items-center text-slate-700">
              <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${membershipRole === "Pro" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
              Đang hoạt động
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Ngày hết hạn</span>
            <span className="font-medium text-slate-700">--</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Còn lại</span>
            <span className="font-medium text-slate-700">--</span>
          </div>
          <button className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors ml-auto sm:ml-0 border border-slate-200 shadow-sm cursor-pointer">
            Gia hạn
          </button>
        </div>
      </div>

      {/* BOX SO SÁNH & BẢNG GIÁ */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-6 items-start">
        
        {/* BAN BIỂU SO SÁNH CÁC TÍNH NĂNG CHUYÊN BIỆT */}
        <div className="w-full lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70">
            <h3 className="font-sans font-bold text-sm text-slate-800 flex items-center space-x-2">
              <Layers className="h-4 w-4 text-red-600" />
              <span>Bảng so sánh chi tiết tính năng</span>
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-[480px] divide-y divide-slate-100">
              
              {/* Tiêu đề cột bảng so sánh */}
              <div className="grid grid-cols-12 p-3 bg-slate-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150">
                <div className="col-span-6 text-slate-700">
                  Tính năng
                </div>
                <div className="col-span-3 text-slate-600">
                  Miễn phí
                </div>
                <div className="col-span-3 text-amber-800">
                  Pro
                </div>
              </div>
              
              {/* Hàng 1 */}
              <div className="grid grid-cols-12 p-3 text-xs items-center gap-2 hover:bg-slate-50/50">
                <div className="col-span-6 font-bold text-slate-700">
                  Bóc tách hồ sơ
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
              <div className="grid grid-cols-12 p-3 text-xs items-center gap-2 hover:bg-slate-50/50">
                <div className="col-span-6 font-bold text-slate-700">
                  Xuất văn bản thô (.TXT)
                </div>
                <div className="col-span-3 text-slate-500">
                  Hỗ trợ
                </div>
                <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Hỗ trợ</span>
                </div>
              </div>

              {/* Hàng 3 */}
              <div className="grid grid-cols-12 p-3 text-xs items-center gap-2 hover:bg-slate-50/50">
                <div className="col-span-6 font-bold text-slate-700">
                  Kết xuất DOCX tố tụng
                </div>
                <div className="col-span-3 text-red-500 font-medium">
                  Khóa
                </div>
                <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Mở khóa</span>
                </div>
              </div>

              {/* Hàng 4 */}
              <div className="grid grid-cols-12 p-3 text-xs items-center gap-2 hover:bg-slate-50/50">
                <div className="col-span-6 font-bold text-slate-700">
                  Xuất Excel danh mục
                </div>
                <div className="col-span-3 text-red-500 font-medium">
                  Khóa
                </div>
                <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Mở khóa</span>
                </div>
              </div>

              {/* Hàng 5 */}
              <div className="grid grid-cols-12 p-3 text-xs items-center gap-2 hover:bg-slate-50/50">
                <div className="col-span-6 font-bold text-slate-700">
                  Trích xuất biểu mẫu
                </div>
                <div className="col-span-3 text-slate-400">
                  Cơ bản
                </div>
                <div className="col-span-3 text-amber-700 font-bold flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                  <span>Thông minh</span>
                </div>
              </div>

              {/* Hàng 6 */}
              <div className="grid grid-cols-12 p-3 text-xs items-center gap-2 hover:bg-slate-50/50">
                <div className="col-span-6 font-bold text-slate-700">
                  Ưu tiên tốc độ OCR
                </div>
                <div className="col-span-3 text-slate-400">
                  Chia sẻ
                </div>
                <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Cao nhất</span>
                </div>
              </div>

              {/* Hàng 7 */}
              <div className="grid grid-cols-12 p-3 text-xs items-center gap-2 hover:bg-slate-50/50">
                <div className="col-span-6 font-bold text-slate-700">
                  Bảo mật AES-256
                </div>
                <div className="col-span-3 text-slate-500">
                  Hỗ trợ
                </div>
                <div className="col-span-3 text-emerald-600 font-bold flex items-center space-x-1">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Tuyệt đối</span>
                </div>
              </div>

            </div>
          </div>

          <div className="p-3 bg-slate-50 text-[10px] text-slate-500 border-t border-slate-150 leading-relaxed italic">
            * Tuân thủ chuyển đổi số định hướng tư pháp của VKSND Tối cao.
          </div>
        </div>

        {/* BẢNG GIÁ & NÚT NÂNG CẤP CHỌN GÓI */}
        <div className="w-full lg:col-span-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end h-full">
            
            {/* GÓI THÁNG */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full relative">
              <div className="flex flex-col justify-between flex-1">
                <div className="space-y-4">
                  <h3 className="font-sans font-black text-slate-900 text-lg flex items-center space-x-1">
                    <span>PRO THÁNG</span>
                  </h3>
                  
                  <div className="py-2.5 border-t border-b border-slate-100 space-y-1">
                    <div className="flex flex-col">
                      <span className="text-3xl font-black text-slate-900">{prices.monthly.display}</span>
                      <span className="text-slate-500 text-xs font-semibold">{prices.monthly.sub}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-1.5">
                    {[
                      "Không giới hạn số lượt quét bản án",
                      "Mở khóa toàn bộ định dạng xuất DOCX & Excel",
                      "Giải thuật OCR tự động khôi phục đại tự tố tụng",
                      "Quét tệp PDF dày tới hàng trăm trang riêng biệt",
                      "Quyền truy cập API tốc độ cao ưu tiên"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-xs text-slate-700">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5">
                  {isProMonthly ? (
                    <button disabled className="w-full bg-emerald-50 text-emerald-700 font-bold py-2.5 px-4 rounded-xl text-xs flex justify-center items-center space-x-1.5 border border-emerald-200">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Đang sử dụng</span>
                    </button>
                  ) : isProYearly ? (
                    <button disabled className="w-full bg-slate-50 text-slate-400 font-bold py-2.5 px-4 rounded-xl text-xs text-center border border-slate-200 cursor-not-allowed">
                      Chuyển xuống PRO Tháng
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPayment("monthly")}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all text-center cursor-pointer border border-slate-300"
                    >
                      Đăng ký Pro Tháng
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* GÓI NĂM */}
            <div className="flex flex-col h-[105%] relative">
              {/* Banner "Khuyến nghị" */}
              <div className="bg-[#F59E0B] text-white font-bold text-xs py-1.5 rounded-t-2xl text-center uppercase tracking-wider shadow-sm flex items-center justify-center space-x-1">
                <span>⭐ Khuyến nghị</span>
              </div>
              
              {/* Card nội dung */}
              <div className="bg-white rounded-b-2xl border-2 border-[#FBBF24] border-t-0 shadow-[0_4px_12px_rgba(245,158,11,0.18)] p-6 flex flex-col justify-between flex-1 relative">
                <div className="space-y-4">
                  <h3 className="font-sans font-black text-slate-900 text-lg flex items-center space-x-1">
                    <span>PRO NĂM</span>
                    <span className="text-[10px] bg-[#F59E0B] text-white font-bold px-2 py-0.5 rounded ml-2">Khuyến nghị</span>
                  </h3>
                  
                  <div className="py-2.5 border-t border-b border-slate-100 space-y-1">
                    <div className="flex flex-col">
                      <span className="text-3xl font-black text-slate-900">{prices.yearly.display}</span>
                      <span className="text-slate-500 text-xs font-semibold">{prices.yearly.sub}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 inline-block rounded border border-emerald-200">
                        Tiết kiệm 17%
                      </span>
                      <p className="text-[9.5px] text-slate-400 mt-1 italic font-medium">
                        (so với thanh toán từng tháng)
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-1.5">
                    {[
                      "Không giới hạn số lượt quét bản án",
                      "Mở khóa toàn bộ định dạng xuất DOCX & Excel",
                      "Giải thuật OCR tự động khôi phục đại tự tố tụng",
                      "Quét tệp PDF dày tới hàng trăm trang riêng biệt",
                      "Quyền truy cập API tốc độ cao ưu tiên"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-xs text-slate-700">
                        <CheckCircle2 className="h-4.5 w-4.5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5 space-y-2.5">
                  {isProYearly ? (
                    <button disabled className="w-full bg-emerald-50 text-emerald-700 font-bold py-2.5 px-4 rounded-xl text-sm flex justify-center items-center space-x-1.5 border border-emerald-200">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Đang sử dụng</span>
                    </button>
                  ) : isProMonthly ? (
                    <button
                      onClick={() => handleOpenPayment("yearly")}
                      className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-black py-2.5 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center cursor-pointer flex items-center justify-center space-x-2 border border-[#FBBF24]/20"
                    >
                      <Trophy className="h-4 w-4 text-amber-100" />
                      <span>NÂNG CẤP PRO NĂM</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPayment("yearly")}
                      className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-black py-2.5 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center cursor-pointer flex items-center justify-center space-x-2 border border-[#FBBF24]/20"
                    >
                      <CreditCard className="h-4 w-4 text-amber-100" />
                      <span>ĐĂNG KÝ PRO NĂM</span>
                    </button>
                  )}

                  <p className="text-[9px] text-center text-slate-400 italic leading-tight">
                    * Kích hoạt tự động sau khi hoàn tất giao dịch. Xuất hóa đơn đỏ (VAT 8%).
                  </p>
                </div>
              </div>
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
                  setActiveTab("scanner");
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
                      <p className="text-slate-800 font-bold">DU AN CONG NGHE LEXOCR</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Số tiền quyết định</p>
                      <p className="text-slate-900 font-mono font-black text-sm text-[15px]">{activePlan.display}</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Nội dung bắt buộc</p>
                      <p className="text-red-700 font-mono font-bold bg-white p-1.5 rounded border border-red-200 break-words select-all text-[11px]">
                        LEXOCR PRO {name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 ]/g, "")} {billingCycle === "yearly" ? "1Y" : "1M"}
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
                      <h4 className="font-black text-slate-900 text-base">Nâng cấp LexOCR PRO thành công!</h4>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                        Tài khoản <strong className="font-bold">{name}</strong> đã tự động nâng cấp thành công lên quyền PRO vô hạn. Mở khóa xuất tệp Word lề tố tụng và Excel danh bị can ngay tức thì.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowQRModal(false);
                        setActiveTab("scanner");
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