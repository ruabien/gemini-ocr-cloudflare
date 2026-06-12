/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Shield, Lock, ArrowLeft, CheckCircle2, FileLock, AlertCircle, HelpCircle } from "lucide-react";
import { UserSession } from "../types";

interface LoginWallProps {
  onLogin: () => Promise<void>;
  onBackToHome: () => void;
}

export default function LoginWall({ onLogin, onBackToHome }: LoginWallProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const triggerLogin = async () => {
    setIsConnecting(true);
    setErrorMessage("");
    try {
      await onLogin();
    } catch (err: any) {
      setErrorMessage("Không thể kết nối cổng thông tin xác thực. Vui lòng thử lại.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div id="login-wall-container" className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Decorative patterns */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Back link */}
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại trang chủ</span>
        </button>

        {/* Security Crest & Lock */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Presidential Top Border Accent */}
          <div className="h-1.5 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 w-full" />
          
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="h-16 w-16 mx-auto bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-center justify-center shadow-inner mb-4">
                <FileLock className="h-8 w-8 animate-pulse" />
              </div>
              
              <div className="inline-flex items-center space-x-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 border border-slate-200">
                <Shield className="h-3 w-3 text-red-500" />
                <span>Yêu Cầu Xác Thực Nghiệp Vụ</span>
              </div>
              
              <h2 className="text-xl font-black text-slate-900 tracking-tight">CỔNG XÁC THỰC TỐ TỤNG</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Vui lòng xác thực tài khoản nghiệp vụ của Kiểm sát viên để sử dụng chức năng số hóa, bóc tách cáo trạng, bản án và kiểm sát thụ lý vụ án nâng cao.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-700 text-xs flex items-start space-x-2 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Simulated/Real OAuth button */}
            <div className="space-y-4">
              <button
                onClick={triggerLogin}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white py-3 px-4 rounded-xl text-xs font-bold tracking-wide flex items-center justify-center space-x-3 shadow-lg border border-yellow-500/10 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                {isConnecting ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fillOpacity="0.9"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.6-4.53-5.67-4.53z" fillOpacity="0.9"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fillOpacity="0.9"/>
                  </svg>
                )}
                <span>Xác thực OAuth Google</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nguyên tắc hệ thống</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Policy reminders */}
              <div className="space-y-2.5">
                <div className="flex items-start space-x-2 text-[11px] text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Không lưu tài liệu:</strong> Toàn bộ dữ liệu trích xuất nằm hoàn toàn trên RAM tạm thời và bị xóa ngay khi đóng trình duyệt.</span>
                </div>
                <div className="flex items-start space-x-2 text-[11px] text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Mã hóa đầu cuối:</strong> Dữ liệu được truyền tải bảo vệ bằng giao thức mã hóa quân sự AES-256.</span>
                </div>
                <div className="flex items-start space-x-2 text-[11px] text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Mã chuẩn hóa:</strong> Tự động sắp xếp trường thông tin vụ án, ngày thụ lý, thông tin bị can/bị cáo tuân thủ quy biểu công tố & kiểm sát tư pháp của Viện kiểm sát nhân dân.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Cần trợ giúp kỹ thuật?</span>
            </span>
            <a href="mailto:hangdepg96@gmail.com" className="text-red-600 hover:underline font-bold">hangdepg96@gmail.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}
