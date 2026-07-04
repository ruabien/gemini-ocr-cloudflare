import React, { ReactNode } from "react";
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
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} membershipRole={membershipRole} />
      {/* 
        Header is 72px fixed. So we use pt-[72px] to push content down.
        The content wrapper has the exact unified container specifications.
      */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-[16px] md:px-[24px] py-6 flex flex-col pt-[calc(72px+1.5rem)]">
        {children}
      </main>
    </div>
  );
}
