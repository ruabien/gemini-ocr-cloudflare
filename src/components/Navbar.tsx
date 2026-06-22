/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { Shield, UserCheck, LogOut, ScanLine, LayoutDashboard, Settings, Sparkles, User, Key, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  membershipRole: "Free" | "Pro"; // Used for other parts, but we'll reflect AuthContext here
}

export default function Navbar({ activeTab, setActiveTab, membershipRole }: NavbarProps) {
  const { user, loginWithGoogle, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lắng nghe click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = async () => {
    await loginWithGoogle();
  };

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
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
        <div className="flex items-center space-x-3 relative" ref={dropdownRef}>
          {user ? (
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-slate-800/50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-700/50"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="hidden lg:flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-200">
                  {user.displayName || user.email?.split("@")[0]}
                </span>
                {user.plan === "pro" ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] tracking-wider uppercase font-black bg-amber-500/20 text-amber-400 border border-amber-500/35 animate-pulse">
                    PRO
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] tracking-wider uppercase font-black bg-slate-800 text-slate-400 border border-slate-700">
                    FREE
                  </span>
                )}
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="h-8 w-8 rounded-full border border-slate-600 object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-yellow-400">
                  {(user.displayName || user.email || "A").charAt(0).toUpperCase()}
                </div>
              )}

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1 lg:hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  
                  <button 
                    onClick={() => { setIsDropdownOpen(false); /* Optional hook */ }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center space-x-2 transition-colors"
                  >
                    <User className="h-4 w-4 text-slate-500" />
                    <span>Hồ sơ cá nhân</span>
                  </button>
                  <button 
                    onClick={() => { setIsDropdownOpen(false); setActiveTab("settings"); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center space-x-2 transition-colors"
                  >
                    <Key className="h-4 w-4 text-slate-500" />
                    <span>Quản lý API Key</span>
                  </button>
                  <button 
                    onClick={() => { setIsDropdownOpen(false); setActiveTab("settings"); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center space-x-2 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    <span>Cài đặt</span>
                  </button>
                  <button 
                    onClick={() => { setIsDropdownOpen(false); setActiveTab("upgrade"); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-amber-50 text-amber-700 flex items-center space-x-2 transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">Nâng cấp PRO</span>
                  </button>
                  
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-rose-50 text-rose-600 flex items-center space-x-2 transition-colors"
                    >
                      <LogOut className="h-4 w-4 text-rose-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide flex items-center space-x-2 border border-red-500/50 shadow-md transition-all cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fillOpacity="0.9"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.6-4.53-5.67-4.53z" fillOpacity="0.9"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fillOpacity="0.9"/>
              </svg>
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
