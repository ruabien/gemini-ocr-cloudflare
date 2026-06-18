import React, { useState } from "react";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import OcrScanner from "./components/OcrScanner";
import OcrEditor from "./components/OcrEditor";
import Navbar from "./components/Navbar";
import Upgrade from "./components/Upgrade";
import Settings from "./components/Settings";

function AppContent() {
  // State to hold OCR configuration, document data, session and membership
  const [config, setConfig] = useState<any>(() => {
    const saved = localStorage.getItem('ocr_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      engine: 'precision',
      outputFormat: 'TXT',
      language: 'vi',
      preserveLayout: true
    };
  });
  const [document, setDocument] = useState<any>(null);
  const [session, setSession] = useState<any>({
    name: "Khách",
    role: "Guest",
    department: "Chưa xác thực",
    isAuthenticated: false
  });
  const [activeTab, setActiveTab] = useState("landing");
  const [membershipRole, setMembershipRole] = useState<"Free" | "Pro">("Free");
  const [userGeminiKey, setUserGeminiKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vks_gemini_api_keys');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0];
        }
      }
    } catch (e) {}
    return "";
  });

  // Handlers for navigation and tab changes
  const handleStart = () => {
    setActiveTab("scanner");
  };
  const handleActiveTab = (tab: string) => {
    setActiveTab(tab);
  };

  const login = async () => {
    // Dummy login implementation; replace with real auth flow as needed
    setSession({
      name: "Người dùng",
      role: "User",
      department: "Department",
      isAuthenticated: true
    });
  };

  return (
    <>
      <Navbar
        session={session}
        setSession={setSession}
        activeTab={activeTab}
        setActiveTab={handleActiveTab}
        onLogin={login}
        membershipRole={membershipRole}
      />
      <div className="pt-16 min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900">
        {activeTab === "landing" && (
          <LandingPage onStart={handleStart} setActiveTab={handleActiveTab} />
        )}
        {activeTab === "dashboard" && (
          <Dashboard onStartOcr={handleStart} />
        )}
        {activeTab === "scanner" && (
          <OcrScanner
            onFileLoaded={(fileData) => {
              setDocument(fileData);
              setActiveTab("editor");
            }}
            config={config}
            setConfig={setConfig}
          />
        )}
        {activeTab === "editor" && (
          <OcrEditor
            document={document}
            onBack={handleStart}
            membershipRole={membershipRole}
            setActiveTab={handleActiveTab}
          />
        )}
        {activeTab === "upgrade" && (
          <Upgrade
            session={session}
            membershipRole={membershipRole}
            setMembershipRole={setMembershipRole}
            setActiveTab={handleActiveTab}
          />
        )}
        {activeTab === "settings" && (
          <Settings
            userGeminiKey={userGeminiKey}
            setUserGeminiKey={setUserGeminiKey}
            membershipRole={membershipRole}
            setMembershipRole={setMembershipRole}
            setActiveTab={handleActiveTab}
          />
        )}
      </div>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
