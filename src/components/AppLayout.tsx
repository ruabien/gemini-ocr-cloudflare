import React, { ReactNode, useEffect } from "react";
import Navbar from "./Navbar";

interface AppLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  membershipRole: "Free" | "Pro";
  children: ReactNode;
}

export default function AppLayout({
  activeTab,
  setActiveTab,
  membershipRole,
  children,
}: AppLayoutProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeTab]);

  const showFooter = ["privacy", "terms"].includes(activeTab);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} membershipRole={membershipRole} />
      {/* 
        Header is 72px fixed. So we use pt-[72px] to push content down.
        The content wrapper has the exact unified container specifications.
      */}
<main className={`flex-1 w-full flex flex-col ${activeTab === "landing" ? "pt-[72px]" : "max-w-[1280px] mx-auto px-[16px] md:px-[24px] py-6 pt-[calc(72px+1.5rem)]"}`}>
        {children}
      </main>
      
      {showFooter && (
        <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 w-full mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
              <button
                onClick={() => setActiveTab("privacy")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Chính sách bảo mật
              </button>
              <button
                onClick={() => setActiveTab("terms")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Điều khoản sử dụng
              </button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-1 mb-2 text-slate-500">
              <span>Hỗ trợ kỹ thuật: <a href="mailto:support@lexocr.com" className="hover:text-slate-300 transition-colors">support@lexocr.com</a></span>
            </div>
            <p>© 2026 LexOCR</p>
          </div>
        </footer>
      )}
    </div>
  );
}
