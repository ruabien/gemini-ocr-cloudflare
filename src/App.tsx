import React, { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import OcrScanner from "./components/OcrScanner";
import OcrEditor from "./components/OcrEditor";
import StructuredExtractionEditor from "./components/StructuredExtractionEditor";
import Navbar from "./components/Navbar";
import Upgrade from "./components/Upgrade";
import Settings from "./components/Settings";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { getUserStorageItem } from "./utils/userStorage";

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
  const [userGeminiKey, setUserGeminiKey] = useState<string>("");

  // Authentication guard
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      try {
        const saved = getUserStorageItem(user.uid, 'gemini_keys');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUserGeminiKey(parsed[0]);
          }
        }
      } catch (e) {}
    } else {
      setUserGeminiKey("");
    }
  }, [user]);

  useEffect(() => {
    const protectedTabs = ["scanner", "upgrade", "settings", "editor", "structured"];
    if (!user && protectedTabs.includes(activeTab)) {
      window.alert("Vui lòng đăng nhập Google để sử dụng LexOCR.");
      setActiveTab("landing");
    }
  }, [user, activeTab]);


  // Handlers for navigation and tab changes
  const handleStart = () => {
    setActiveTab("scanner");
  };
  const handleActiveTab = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <>
      <Navbar activeTab={activeTab} setActiveTab={handleActiveTab} membershipRole={membershipRole} />
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
          document?.outputMode === "structured" ? (
            <StructuredExtractionEditor
              document={document}
              onBack={handleStart}
              membershipRole={membershipRole}
              setActiveTab={handleActiveTab}
            />
          ) : (
            <OcrEditor
              document={document}
              onBack={handleStart}
              membershipRole={membershipRole}
              setActiveTab={handleActiveTab}
            />
          )
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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}