import React, { useState, useEffect } from "react";
import { User, LogOut, Settings, Sparkles, ScanLine, Shield, Key, Calendar, CreditCard, Receipt, Copy, Check, Info } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AccountProps {
  setActiveTab: (tab: string) => void;
}

export default function AccountComponent({ setActiveTab }: AccountProps) {
  const { user, isPro, planType, expiredAt, logout } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

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
            paidAt: data.paidAt
          };
        });

        // Determine "Gia hạn" by checking prior PAID status
        const ascending = [...fetchedPayments].reverse();
        let hasPriorPro = false;
        
        const processed = ascending.map(p => {
          let name = p.planType === "year" ? "PRO Năm" : "PRO Tháng";
          if (hasPriorPro) {
            name = "Gia hạn " + name;
          }
          if (p.status === "PAID") {
            hasPriorPro = true;
          }
          return {
            ...p,
            displayPlanName: name
          };
        });

        setPayments(processed.reverse());
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPayments();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setActiveTab("landing");
  };

  const getDaysRemaining = () => {
    if (!expiredAt) return 0;
    const now = Date.now();
    const diff = expiredAt - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "--";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "--";
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return "--";
    }
  };

  const getProviderName = () => {
    if (user?.providerData && user.providerData.length > 0) {
      const provider = user.providerData[0].providerId;
      if (provider.includes("google")) return "Google";
      if (provider.includes("facebook")) return "Facebook";
      if (provider.includes("github")) return "GitHub";
      if (provider.includes("password")) return "Email/Mật khẩu";
      return provider;
    }
    return "--";
  };

  const getShortUid = (uid?: string) => {
    if (!uid) return "--";
    if (uid.length <= 10) return uid;
    return `${uid.substring(0, 8)}...${uid.substring(uid.length - 6)}`;
  };

  const handleCopyUid = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
          <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Chưa đăng nhập</h2>
          <p className="text-slate-500 text-sm">Vui lòng đăng nhập để xem thông tin tài khoản.</p>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s === "PAID") return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-green-50 text-green-600 border border-green-200">PAID</span>;
    if (s === "PENDING") return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-orange-50 text-orange-600 border border-orange-200">PENDING</span>;
    if (s === "EXPIRED") return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-gray-50 text-gray-600 border border-gray-200">EXPIRED</span>;
    if (s === "CANCELLED" || s === "FAILED") return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-red-50 text-red-600 border border-red-200">CANCELLED</span>;
    
    return <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-bold bg-slate-50 text-slate-600 border border-slate-200">{s}</span>;
  };

  return (
    <div id="account-view" className="space-y-6">
      {/* HEADER SECTION */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
          <User className="h-6 w-6 text-slate-700" />
          <span>Hồ sơ cá nhân</span>
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Quản lý thông tin tài khoản và trạng thái gói thành viên.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* PANEL TRÁI: THÔNG TIN CHUNG - 7 CỘT */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center sm:items-start sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  className="h-24 w-24 rounded-full border-4 border-white shadow-md object-cover" 
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-slate-700 border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-yellow-400">
                  {(user.displayName || user.email || "A").charAt(0).toUpperCase()}
                </div>
              )}
              {isPro && (
                <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white rounded-full p-1.5 border-2 border-white shadow-sm">
                  <Shield className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-slate-900">{user.displayName || user.email?.split("@")[0]}</h3>
              <p className="text-sm text-slate-500">{user.email}</p>
              
              <div className="mt-4 inline-flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái:</span>
                {isPro ? (
                  <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-black bg-amber-50 text-amber-600 border border-amber-200 flex items-center space-x-1">
                    <Sparkles className="h-3 w-3" />
                    <span>PRO</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md text-[11px] tracking-wider uppercase font-black bg-slate-100 text-slate-600 border border-slate-200">
                    FREE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* THÔNG TIN HỒ SƠ */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Info className="h-4 w-4 text-slate-500" />
              <span>Thông tin hồ sơ</span>
            </h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-50 border-dashed">
                <span className="text-sm text-slate-600 font-medium">Đăng nhập bằng</span>
                <span className="text-sm font-bold text-slate-900">{getProviderName()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50 border-dashed">
                <span className="text-sm text-slate-600 font-medium">Ngày tham gia</span>
                <span className="text-sm font-bold text-slate-900">{formatDateTime(user.metadata.creationTime)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50 border-dashed">
                <span className="text-sm text-slate-600 font-medium">Lần đăng nhập gần nhất</span>
                <span className="text-sm font-bold text-slate-900">{formatDateTime(user.metadata.lastSignInTime)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600 font-medium">UID</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{getShortUid(user.uid)}</span>
                  <button 
                    onClick={handleCopyUid}
                    title="Copy UID"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    {copiedUid ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
              <CreditCard className="h-4 w-4 text-slate-500" />
              <span>Thông tin gói cước</span>
            </h4>
            
            <div className="space-y-4">
              {isPro ? (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50 border-dashed">
                    <span className="text-sm text-slate-600 font-medium">Gói hiện tại</span>
                    <span className="text-sm font-bold text-slate-900">
                      LexOCR PRO {planType === "year" ? "Năm" : "Tháng"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50 border-dashed">
                    <span className="text-sm text-slate-600 font-medium flex items-center">
                      <Calendar className="h-4 w-4 mr-1.5 text-slate-400" />
                      Ngày hết hạn
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {expiredAt ? formatDate(expiredAt) : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600 font-medium">Thời gian còn lại</span>
                    <span className={`text-sm font-bold ${daysRemaining <= 7 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {daysRemaining} ngày
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50 border-dashed">
                    <span className="text-sm text-slate-600 font-medium">Gói hiện tại</span>
                    <span className="text-sm font-bold text-slate-900">LexOCR Free</span>
                  </div>
                  <div className="bg-blue-50/50 rounded-xl p-4 mt-2 border border-blue-100/50">
                    <p className="text-sm text-blue-800 font-medium mb-3">
                      Nâng cấp lên PRO để mở khóa toàn bộ tính năng và không giới hạn lượt bóc tách.
                    </p>
                    <button 
                      onClick={() => setActiveTab("upgrade")}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center space-x-1.5 transition-colors"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Khám phá gói PRO</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* PANEL PHẢI: HÀNH ĐỘNG NHANH - 5 CỘT */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Zap className="h-4 w-4 text-slate-500" />
              <span>Hành động nhanh</span>
            </h4>
            
            <div className="space-y-3">
              <button
                onClick={() => setActiveTab("scanner")}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 p-3 rounded-xl flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <ScanLine className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">Bóc tách tài liệu</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("upgrade")}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 p-3 rounded-xl flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-amber-100 text-amber-600 p-2 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">Gói thành viên</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 p-3 rounded-xl flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-200 text-slate-600 p-2 rounded-lg group-hover:bg-slate-600 group-hover:text-white transition-colors">
                    <Key className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">Cài đặt & API Key</span>
                </div>
              </button>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 p-3 rounded-xl flex items-center justify-center space-x-2 transition-colors font-semibold text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* LỊCH SỬ THANH TOÁN */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Receipt className="h-4 w-4 text-slate-500" />
          <span>Lịch sử thanh toán</span>
        </h4>

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
                      {payment.displayPlanName || (payment.planType === "year" ? "PRO Năm" : "PRO Tháng")}
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
    </div>
  );
}

// Add missing icon
function Zap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}