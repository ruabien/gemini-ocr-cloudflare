import React from "react";
import { X, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface LoginPromptModalProps {
  onClose: () => void;
  featureName?: string;
}

export default function LoginPromptModal({ onClose, featureName }: LoginPromptModalProps) {
  const { loginWithGoogle, loading } = useAuth();

  const handleLogin = async () => {
    await loginWithGoogle();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="bg-slate-900 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-emerald-400" />
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
              Xác thực danh tính
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-100 mt-1 leading-snug">
            Đăng nhập Google để sử dụng tính năng này
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
            {featureName ? `Tính năng "${featureName}" yêu cầu đăng nhập.` : "Tính năng này yêu cầu đăng nhập."}
          </p>
          
          <div className="flex items-start space-x-2.5 text-xs bg-emerald-50 text-emerald-900 p-3 rounded-lg border border-emerald-200/55">
            <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-extrabold text-[11px]">Bảo mật tuyệt đối</p>
              <p className="mt-0.5 text-[11px] leading-relaxed">
                LexOCR chỉ dùng Google để xác thực danh tính. Hồ sơ tố tụng và nội dung OCR không được lưu trên máy chủ.
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2 pt-2 text-xs">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-slate-700 font-bold border border-slate-300"
            >
              Để sau
            </button>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="flex-1 bg-white hover:bg-slate-50 py-2 rounded-lg text-slate-800 font-bold border border-slate-300 flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.6-4.53-5.67-4.53z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{loading ? "Đang xử lý..." : "Tiếp tục"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
