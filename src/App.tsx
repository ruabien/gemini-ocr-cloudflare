import React, { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
// Dashboard component removed per MVP simplification
import OcrScanner from "./components/OcrScanner";
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfUse from "./components/TermsOfUse";
import OcrEditor from "./components/OcrEditor";
import StructuredExtractionEditor from "./components/StructuredExtractionEditor";
import Navbar from "./components/Navbar";
import Upgrade from "./components/Upgrade";
import Settings from "./components/Settings";
import AppLayout from "./components/AppLayout";
import Account from "./components/Account";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { getUserStorageItem } from "./utils/userStorage";

function AppContent() {
  // State to hold OCR configuration, document data
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
  const [activeTab, setActiveTab] = useState("landing");
  const [userGeminiKey, setUserGeminiKey] = useState<string>("");

  const { user, updateUserPlan, isPro } = useAuth();

  const membershipRole = isPro ? "Pro" : "Free";
  const setMembershipRole = (role: "Free" | "Pro") => {
    updateUserPlan(role === "Pro" ? "pro" : "free");
  };

  useEffect(() => {
    try {
      const saved = getUserStorageItem(user?.uid, 'gemini_keys');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserGeminiKey(parsed[0]);
          return;
        }
      }
    } catch (e) {}
    setUserGeminiKey("");
  }, [user]);


  // Handlers for navigation and tab changes
  const handleStart = () => {
    setActiveTab("scanner");
  };
  const handleActiveTab = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <AppLayout activeTab={activeTab} setActiveTab={handleActiveTab} membershipRole={membershipRole}>
      {activeTab === "landing" && (
        <LandingPage onStart={handleStart} setActiveTab={handleActiveTab} />
      )}
      {/* Dashboard view removed */}
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
      {activeTab === "account" && (
        <Account setActiveTab={handleActiveTab} />
      )}
      {activeTab === "privacy" && (
        <PrivacyPolicy />
      )}
      {activeTab === "terms" && (
        <TermsOfUse />
      )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}