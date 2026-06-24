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
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="Google" />
              <span>{loading ? "Đang xử lý..." : "Tiếp tục"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
