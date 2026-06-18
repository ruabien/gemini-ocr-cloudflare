/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { Shield, UserCheck, LogOut, ScanLine, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { UserSession } from "../types";

interface NavbarProps {
  session: UserSession;
  setSession: React.Dispatch<React.SetStateAction<UserSession>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogin: () => Promise<void>;
  membershipRole: "Free" | "Pro";
}

export default function Navbar({ session, setSession, activeTab, setActiveTab, onLogin, membershipRole }: NavbarProps) {
  
  // Lắng nghe sự kiện login từ OAuth Popup (tuân thủ oauth-integration skill)
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "OAUTH_AUTH_SUCCESS") {
        setSession(event.data.user);
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [setSession]);

  const handleLogin = async () => {
    await onLogin();
  };

  const handleLogout = () => {
    setSession({
      name: "Khách",
      role: "Guest",
      department: "Chưa xác thực",
      isAuthenticated: false
    });
  };

  return (
    <header id="gov-header" className="border-b border-rose-900/10 bg-slate-900 text-white fixed top-0 left-0 w-full z-50 shadow-md">
      {/* Thanh cờ Tổ quốc trang nghiêm ở phần rìa trên */}
      <div id="flag-bar" className="h-1 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 w-full" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("landing")}>
          <div className="h-9 w-9 bg-red-600 rounded-lg flex items-center justify-center shadow-lg border border-yellow-500/30">
            <Shield className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-sm tracking-tight text-white flex items-center">
              LEXOCR
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-red-600/30 text-red-500 rounded border border-red-500/30 uppercase tracking-widest font-mono">PROCURACY v2.5</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Hệ thống bóc tách hồ sơ & trợ lý Kiểm sát viên</p>
          </div>
        </div>

        {/* Menu chuyển trang mượt mà */}
        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center space-x-1.5 transition-all ${
              activeTab === "dashboard"
                ? "bg-slate-800 text-yellow-400 font-bold border border-slate-700"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Tổng quan</span>
          </button>
          
<button
  onClick={() => setActiveTab("scanner")}
  className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center space-x-1.5 transition-all ${
    activeTab === "scanner" || activeTab === "editor"
      ? "bg-slate-800 text-yellow-400 font-bold border border-slate-700"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`}
>
            <ScanLine className="h-4 w-4" />
            <span>Phân tích OCR</span>
          </button>

          <button
            onClick={() => setActiveTab("upgrade")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center space-x-1.5 transition-all ${
              activeTab === "upgrade"
                ? "bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20"
                : "text-amber-300 hover:bg-slate-800/60 hover:text-amber-200"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-550 text-amber-500 animate-pulse" />
            <span>Nâng cấp PRO</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center space-x-1.5 transition-all ${
              activeTab === "settings"
                ? "bg-slate-800 text-yellow-400 font-bold border border-slate-700"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Cài đặt</span>
          </button>
        </nav>

        {/* Section tài khoản OAuth */}
        <div className="flex items-center space-x-3">
          {session.isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-slate-200 flex items-center justify-end space-x-1.5">
                  <UserCheck className="h-3 w-3 text-emerald-400" />
                  <span>{session.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-black ${
                    membershipRole === 'Pro' 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35 animate-pulse' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {membershipRole}
                  </span>
                </p>
                <p className="text-[9px] text-slate-400 font-medium">
                  {session.role} • {session.department}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-yellow-400">
                {session.name.charAt(0)}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide flex items-center space-x-2 border border-yellow-500/20 shadow-md transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fillOpacity="0.9"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.6-4.53-5.67-4.53z" fillOpacity="0.9"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fillOpacity="0.9"/>
              </svg>
              <span>Xác thực OAuth</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
