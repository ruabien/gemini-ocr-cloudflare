import React from "react";
import { User, LogOut, Settings, Sparkles, ScanLine, Shield, Key, Calendar, CreditCard } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface AccountProps {
  setActiveTab: (tab: string) => void;
}

export default function AccountComponent({ setActiveTab }: AccountProps) {
  const { user, isPro, planType, expiredAt, logout } = useAuth();

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