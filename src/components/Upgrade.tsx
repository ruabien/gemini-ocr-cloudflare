/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sparkles, Check, ChevronRight, ShieldCheck, CreditCard, 
  Clock, AlertTriangle, Layers, FileSpreadsheet, FileText, 
  ShieldAlert, RefreshCw, HelpCircle, ArrowLeft, Trophy, CheckCircle2, UserCheck, X, Receipt
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { createPaymentSession } from "../utils/payment";
import { auth, db } from "../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";

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
  const { user, isPro, planType, expiredAt } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const currentCycle = planType === "month" ? "monthly" : planType === "year" ? "yearly" : (localStorage.getItem('lexocr_pro_cycle') || 'yearly');
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success">("pending");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(300); // countdown in seconds
  const [logs, setLogs] = useState<string[]>([
    "Khởi tạo hóa đơn nghiệp vụ...",
    "Liên kết cổng thanh toán liên ngân hàng Napas 247..."
  ]);
  const [paymentSession, setPaymentSession] = useState<{
    orderCode?: number;
    amount?: number;
    checkoutUrl?: string;
    qrCode?: string;
    expiredAt?: string;
    isReuseOrder?: boolean;
  } | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [qrLoadError, setQrLoadError] = useState<boolean>(false);

  // Requirement 4: Track baseline subscription state when modal opens to avoid false successes
  const [initialExpiredAt, setInitialExpiredAt] = useState<number | null>(null);
  const [initialPlanType, setInitialPlanType] = useState<string | null>(null);
  const [initialIsPro, setInitialIsPro] = useState<boolean>(false);

  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user || !db) return;
      setLoadingPayments(true);
      try {
        const q = query(
          collection(db, "payments"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const fetchedPayments = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let createdAt = data.createdAt;
          if (createdAt && typeof createdAt.toMillis === 'function') {
            createdAt = createdAt.toMillis();
          } else if (createdAt && typeof createdAt.getTime === 'function') {
            createdAt = createdAt.getTime();
          }
          return {
            id: doc.id,
            uid: data.uid,
            orderCode: data.orderCode,
            amount: data.amount,
            planType: data.planType,
            status: data.status,
            payosTransactionId: data.payosTransactionId,
            createdAt,
            paidAt: data.paidAt,
            transactionType: data.transactionType,
            displayPlanName: data.displayPlanName
          };
        });

        setPayments(fetchedPayments);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPayments();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s === "PAID") return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-green-50 text-green-600 border border-green-200">PAID</span>;
    if (s === "PENDING") return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-orange-50 text-orange-600 border border-orange-200">PENDING</span>;
    if (s === "EXPIRED") return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-gray-50 text-gray-600 border border-gray-200">EXPIRED</span>;
    if (s === "CANCELLED" || s === "FAILED") return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-red-50 text-red-600 border border-red-200">CANCELLED</span>;
    
    return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-slate-50 text-slate-600 border border-slate-200">{s}</span>;
  };

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

  const qrType = (() => {
    if (paymentSession && paymentSession.qrCode) {
      const qr = paymentSession.qrCode.trim();
      // Chuẩn VietQR / EMV Co
      if (qr.startsWith("000201")) {
        return "vietqr_payload";
      }
      // Dạng ảnh URL hoặc Base64 Image
      if (qr.startsWith("http") || qr.startsWith("data:image/")) {
        // Không nhận dạng URL thanh toán (checkout) thành mã QR
        if (qr === paymentSession.checkoutUrl || qr.includes("checkout")) {
          return "invalid";
        }
        return "image";
      }
    }
    return "invalid";
  })();

  // Timer Countdown
  useEffect(() => {
    if (!showQRModal || paymentStatus === "success") return;
    
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showQRModal, paymentStatus]);

  // If isPro realtime becomes true in AuthContext when the modal is open, sync to paymentStatus = success
  useEffect(() => {
    // Requirement 4: Don't show "Thanh toán thành công" false success screen just because user is already PRO.
    // Only show success when subscription changes or transaction completes.
    if (showQRModal && paymentStatus !== "success" && paymentSession) {
      // Check if subscription has updated after the modal was opened
      const hasPlanTypeChanged = planType !== initialPlanType;
      const hasExpiryExtended = expiredAt && initialExpiredAt ? (expiredAt > initialExpiredAt) : (expiredAt && !initialExpiredAt);
      const hasBecomePro = isPro && !initialIsPro;

      if (hasPlanTypeChanged || hasExpiryExtended || hasBecomePro) {
        setPaymentStatus("success");
        setLogs(prev => [...prev, "Thanh toán thành công! LexOCR PRO đã được kích hoạt."]);
        setTimerSeconds(3); // 3 seconds auto-close countdown
      }
    }
  }, [showQRModal, isPro, expiredAt, planType, paymentStatus, paymentSession, initialExpiredAt, initialPlanType, initialIsPro]);

  // Toast handling for successful payment via URL query param (Requirement 6)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isSuccessParam = params.get("payment_success") === "true";
      const statusParam = params.get("status");
      
      if (isSuccessParam || statusParam === "PAID") {
        setToastMessage("Thanh toán thành công. Gói LexOCR PRO đã được kích hoạt.");
        setShowToast(true);
        // Auto hide after 3 seconds
        const timer = setTimeout(() => {
          setShowToast(false);
          // Clean query params from URL without reload
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Handle auto‑close countdown on success
  useEffect(() => {
    if (showQRModal && paymentStatus === "success") {
      const autoCloseInterval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(autoCloseInterval);
            setShowQRModal(false);
            setActiveTab("scanner");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(autoCloseInterval);
    }
  }, [showQRModal, paymentStatus, setActiveTab]);

  const handleOpenPayment = async (cycle: "monthly" | "yearly") => {
    if (!user) {
      window.alert("Vui lòng đăng nhập Google để thực hiện nâng cấp tài khoản PRO.");
      return;
    }

    // Capture baseline subscription details
    setInitialExpiredAt(expiredAt);
    setInitialPlanType(planType);
    setInitialIsPro(isPro);

    setBillingCycle(cycle);
    setPaymentStatus("pending");
    setTimerSeconds(300); 
    setIsExpired(false);
    setPaymentSession(null);
    setQrLoadError(false);
    setLogs([
      "Đang kết nối đến cổng thanh toán PayOS...",
      "Đang khởi tạo đơn hàng thanh toán..."
    ]);
    setShowQRModal(true);

    try {
      const firebaseUser = auth.currentUser;
      const idToken = firebaseUser ? await firebaseUser.getIdToken() : "";
      const planType = cycle === "monthly" ? "month" : "year";
      const res = await createPaymentSession(idToken, planType);
      
      // DEV Logging for PayOS response
      console.log("DEV - PayOS response keys:", res ? Object.keys(res) : []);
      console.log("DEV - PayOS response typeof qrCode:", typeof res?.qrCode);
      console.log("DEV - PayOS response checkoutUrl exists:", res?.checkoutUrl ? "Yes" : "No");

      if (res.error) {
        setLogs(prev => [...prev, `Lỗi: ${res.error}`]);
        return;
      }

      setPaymentSession({
        orderCode: res.orderCode,
        amount: res.amount,
        checkoutUrl: res.checkoutUrl,
        qrCode: res.qrCode,
        expiredAt: res.expiredAt,
        isReuseOrder: res.isReuseOrder
      });

      setLogs(prev => [
        ...prev,
        `Tạo đơn hàng #${res.orderCode} thành công.`,
        res.isReuseOrder ? "Sử dụng lại mã thanh toán chưa hoàn tất trước đó." : "Khởi tạo mã thanh toán mới."
      ]);

      if (res.expiredAt) {
        const diffMs = new Date(res.expiredAt).getTime() - Date.now();
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
        setTimerSeconds(diffSecs);
        if (diffSecs <= 0) {
          setIsExpired(true);
        }
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `Lỗi khởi tạo thanh toán: ${err.message || err}`]);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
  };

  const isProMonthly = isPro && currentCycle === 'monthly';
  const isProYearly = isPro && currentCycle === 'yearly';

  return (
    <div id="upgrade-view" className="space-y-6">
      
        {/* HEADER QUYỀN TÁC VỤ */}
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase mb-2">
                <Trophy className="h-3.5 w-3.5 text-amber-600" />
                <span>NÂNG THẾ NGHIỆP CÔNG TỐ & KIỂM SÁT</span>
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
            <span className="font-medium text-slate-700">
              {expiredAt 
                ? (() => {
                    const dateObj = new Date(expiredAt);
                    const dd = String(dateObj.getDate()).padStart(2, '0');
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const yyyy = dateObj.getFullYear();
                    return `${dd}/${mm}/${yyyy}`;
                  })()
                : '--'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Còn lại</span>
            <span className="font-medium text-slate-700">
              {expiredAt
                ? (() => {
                    const diff = Math.ceil((expiredAt - Date.now()) / (1000 * 60 * 60 * 24));
                    return diff > 0 ? `${diff} ngày` : 'Hết hạn';
                  })()
                : '--'}
            </span>
          </div>
          {(() => {
            if (membershipRole !== "Pro") return null;
            const diff = expiredAt ? Math.ceil((expiredAt - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
            if (diff > 7) return null;
            if (diff >= 1) {
              return (
                <button 
                  onClick={() => handleOpenPayment(currentCycle === 'monthly' ? 'monthly' : 'yearly')}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors ml-auto sm:ml-0 border border-slate-200 shadow-sm cursor-pointer"
                >
                  Gia hạn
                </button>
              );
            }
            return (
              <button 
                onClick={() => handleOpenPayment(currentCycle === 'monthly' ? 'monthly' : 'yearly')}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors ml-auto sm:ml-0 border border-amber-500 shadow-sm cursor-pointer animate-pulse"
              >
                Gia hạn ngay
              </button>
            );
          })()}
        </div>
      </div>

      {/* BOX SO SÁNH & BẢNG GIÁ */}
      <section className="mt-8 flex flex-col-reverse lg:grid lg:grid-cols-[1.4fr_0.65fr_0.75fr] gap-6 items-start">
        
        {/* BAN BIỂU SO SÁNH CÁC TÍNH NĂNG CHUYÊN BIỆT */}
        <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
            * Tuân thủ chuyển đổi số trong lĩnh vực tư pháp.
          </div>
        </div>

        {/* GÓI THÁNG */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full relative">
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
        <div className="w-full flex flex-col h-full relative bg-white rounded-2xl border-2 border-[#FBBF24] shadow-[0_4px_12px_rgba(245,158,11,0.18)] overflow-hidden">
          {/* Banner "Khuyến nghị" */}
          <div className="bg-[#F59E0B] text-white font-bold text-xs py-1.5 text-center uppercase tracking-wider shadow-sm flex items-center justify-center space-x-1 w-full">
            <span>⭐ Khuyến nghị</span>
          </div>
          
          {/* Card nội dung */}
          <div className="p-6 flex flex-col justify-between flex-1 relative bg-white">
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
            <div className="flex flex-col space-y-2">
              <button disabled className="w-full bg-emerald-50 text-emerald-700 font-bold py-2.5 px-4 rounded-xl text-sm flex justify-center items-center space-x-1.5 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                <span>Đang sử dụng</span>
              </button>
              <button
                onClick={() => handleOpenPayment("yearly")}
                className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-black py-2.5 px-4 rounded-xl text-sm flex justify-center items-center space-x-1.5 border border-[#FBBF24]/20"
              >
                Gia hạn PRO Năm
              </button>
            </div>
          ) : isProMonthly ? (
            <>
              <button
                onClick={() => handleOpenPayment("yearly")}
                className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-black py-2.5 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center cursor-pointer flex items-center justify-center space-x-2 border border-[#FBBF24]/20"
              >
                <Trophy className="h-4 w-4 text-amber-100" />
                <span>Chuyển sang PRO Năm</span>
              </button>
              <p className="text-[11px] text-slate-500 italic mt-1 leading-normal text-center">
                Thời gian còn lại của gói hiện tại sẽ được cộng dồn sau khi thanh toán.
              </p>
            </>
          ) : (
            <button
              onClick={() => handleOpenPayment("yearly")}
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-black py-2.5 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center cursor-pointer flex items-center justify-center space-x-2 border border-[#FBBF24]/20"
            >
              <CreditCard className="h-4 w-4 text-amber-100" />
              <span>ĐĂNG KÝ PRO NĂM</span>
            </button>
          )}
        </div>
          </div>
        </div>

      </section>

      {/* LỊCH SỬ THANH TOÁN */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 mt-8">
        <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Receipt className="h-5 w-5 text-slate-500" />
          <span>LỊCH SỬ THANH TOÁN</span>
        </h3>

        {loadingPayments ? (
          <div className="text-center py-8 text-slate-500">Đang tải lịch sử...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p>Chưa có giao dịch nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4 font-semibold rounded-tl-lg">Ngày</th>
                  <th className="py-3 px-4 font-semibold">Tên gói</th>
                  <th className="py-3 px-4 font-semibold">Số tiền</th>
                  <th className="py-3 px-4 font-semibold rounded-tr-lg">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                      {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                      }) : "N/A"}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 whitespace-nowrap">
                      {payment.transactionType === "purchase" ? (payment.planType === "year" ? "PRO Năm" : "PRO Tháng") :
                       payment.transactionType === "renewal" ? (payment.planType === "year" ? "Gia hạn PRO Năm" : "Gia hạn PRO Tháng") :
                       payment.transactionType === "upgrade" ? "Nâng cấp lên PRO Năm" :
                       (payment.displayPlanName || (payment.planType === "year" ? "PRO Năm" : "PRO Tháng"))}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.amount || 0)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL HIỂN THỊ QR CHUYỂN KHOẢN PAYOS */}
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
              
              {/* CỘT THÔNG TIN HÓA ĐƠN */}
              <div className="md:col-span-5 bg-slate-50 border-r border-slate-200 text-slate-900 p-6 flex flex-col justify-between">
                <div>
                  <div className="h-8 bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider inline-block mb-4">
                    Thanh toán LexOCR PRO
                  </div>
                  <h3 className="text-base font-bold uppercase tracking-tight text-slate-900 mb-4">
                    Gói {billingCycle === "yearly" ? "PRO Năm" : "PRO Tháng"}
                  </h3>
                  
                  <div className="space-y-4 text-xs font-medium">
                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Mã đơn hàng</p>
                      <p className="text-slate-800 font-mono font-bold">
                        {paymentSession?.orderCode ? `#${paymentSession.orderCode}` : "Đang tạo..."}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Số tiền</p>
                      <p className="text-slate-900 font-mono font-black text-[15px]">{activePlan.display}</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-slate-500 text-[10px] uppercase">Trạng thái</p>
                      <p className="text-amber-600 font-bold animate-pulse">
                        {paymentStatus === "success" ? "Thanh toán thành công" : "Đang chờ thanh toán..."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 mt-4 text-[10px] text-slate-500 leading-relaxed">
                  * Hệ thống sẽ tự động kích hoạt quyền PRO ngay sau khi nhận được thông tin thanh toán từ PayOS.
                </div>
              </div>

              {/* CỘT QUÉT MÃ QR */}
              <div className="md:col-span-7 p-6 flex flex-col justify-between items-center text-center space-y-4">
                
                {paymentStatus === "pending" && (
                  <>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">Quét mã QR thanh toán PayOS</h4>
                      <p className="text-[10px] text-slate-500">Mở ứng dụng Mobile Banking của bạn để quét mã và giao dịch tự động</p>
                    </div>

                    {/* QR BOX OR FALLBACK MESSAGE */}
                    {!paymentSession ? (
                      <div className="h-56 w-56 flex flex-col items-center justify-center bg-slate-50 space-y-3 border border-slate-200 p-2.5 rounded-2xl">
                        <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
                        <p className="text-xs text-slate-500">Đang khởi tạo mã QR...</p>
                      </div>
                    ) : isExpired ? (
                      <div className="border border-slate-200 p-2.5 rounded-2xl bg-white shadow-inner relative group select-none">
                        <div className="h-56 w-56 flex flex-col items-center justify-center bg-slate-50 space-y-3">
                          <AlertTriangle className="h-10 w-10 text-red-500 animate-pulse" />
                          <p className="text-xs font-bold text-slate-700">Mã thanh toán đã hết hạn</p>
                          <button
                            onClick={() => handleOpenPayment(billingCycle)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
                          >
                            Tạo mã mới
                          </button>
                        </div>
                      </div>
                    ) : qrLoadError ? (
                      <div className="border border-slate-200 p-2.5 rounded-2xl bg-white shadow-inner relative group select-none">
                        <div className="h-56 w-56 flex flex-col items-center justify-center bg-slate-50 p-4 space-y-3 text-center border border-slate-100 rounded-xl">
                          <AlertTriangle className="h-8 w-8 text-amber-500" />
                          <p className="text-xs font-bold text-slate-700 leading-tight">
                            Không tải được mã QR, vui lòng mở trang thanh toán.
                          </p>
                          {paymentSession?.checkoutUrl && (
                            <a
                              href={paymentSession.checkoutUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm cursor-pointer transition-all text-center mt-2 inline-block"
                            >
                              Mở trang thanh toán PayOS
                            </a>
                          )}
                        </div>
                      </div>
                    ) : qrType === "invalid" ? (
                      <div className="h-56 w-56 flex flex-col items-center justify-center bg-amber-50/50 p-4 space-y-3 text-center border border-amber-200 rounded-2xl">
                        <AlertTriangle className="h-8 w-8 text-amber-500 animate-pulse" />
                        <p className="text-xs font-bold text-amber-800 leading-normal">
                          Không có mã QR thanh toán hợp lệ. Vui lòng mở trang thanh toán PayOS.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 p-2.5 rounded-2xl bg-white shadow-inner relative group select-none">
                        <div className="relative flex items-center justify-center h-56 w-56 bg-white overflow-hidden">
                          {qrType === "vietqr_payload" ? (
                            <QRCodeSVG 
                              value={paymentSession.qrCode?.trim() || ""} 
                              size={220}
                              level="M"
                              includeMargin={true}
                            />
                          ) : (
                            <img 
                              referrerPolicy="no-referrer"
                              src={paymentSession.qrCode?.trim()} 
                              onError={() => setQrLoadError(true)}
                              alt="Mã QR thanh toán PayOS" 
                              className="h-56 w-56 object-contain"
                            />
                          )}
                          <div className="absolute top-2 right-2 bg-slate-900 border border-slate-800/40 px-2 py-0.5 rounded text-[8px] text-white font-mono font-bold flex items-center space-x-1 shadow">
                            <Clock className="h-3 w-3 text-red-500 animate-pulse" />
                            <span>Mã hết hạn trong: {formatTime(timerSeconds)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Button to open checkout url directly */}
                    {paymentSession?.checkoutUrl && !isExpired && (
                      <a
                        href={paymentSession.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm cursor-pointer transition-all text-center"
                      >
                        Mở trang thanh toán PayOS
                      </a>
                    )}

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
                            <span className="text-slate-400 font-bold">{">"}</span>
                            <span>{log}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {paymentStatus === "success" && (
                  <div className="flex flex-col items-center justify-center space-y-5 py-6 w-full">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-bounce">
                      <Check className="h-8 w-8 text-emerald-600 font-black" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black text-slate-900 text-base">Thanh toán thành công</h4>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                        LexOCR PRO đã được kích hoạt. Trợ lý Số hóa LexOCR PRO sẵn sàng phục vụ cán bộ.
                      </p>
                    </div>

                    <p className="text-xs text-slate-400">
                      Cửa sổ sẽ tự đóng sau {timerSeconds} giây...
                    </p>

                    <button
                      onClick={() => {
                        setShowQRModal(false);
                        setActiveTab("scanner");
                      }}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-wide border border-transparent"
                    >
                      Đóng
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