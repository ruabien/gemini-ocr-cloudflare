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
  const [showPaymentSuccessToast, setShowPaymentSuccessToast] = useState(false);

  const { user, updateUserPlan, isPro } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.get("payment_success") === "true";
    const status = params.get("status");

    if (paymentSuccess || status === "PAID") {
      setActiveTab("upgrade");
      setShowPaymentSuccessToast(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (showPaymentSuccessToast) {
      const timer = setTimeout(() => {
        setShowPaymentSuccessToast(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showPaymentSuccessToast]);

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
    <>
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
        {activeTab === "privacy" && (
          <PrivacyPolicy />
        )}
        {activeTab === "terms" && (
          <TermsOfUse />
        )}
      </AppLayout>

      {showPaymentSuccessToast && (
        <div className="fixed bottom-5 right-5 z-[9999] flex items-center w-full max-w-md p-4 text-slate-800 bg-white rounded-xl shadow-2xl border border-emerald-100 animate-in fade-in slide-in-from-bottom-5 duration-300" role="alert">
          <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-emerald-500 bg-emerald-50 rounded-lg">
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
            </svg>
            <span className="sr-only">Success icon</span>
          </div>
          <div className="ms-3 text-sm font-semibold">
            Thanh toán thành công. Gói LexOCR PRO đã được kích hoạt.
          </div>
          <button 
            type="button" 
            onClick={() => setShowPaymentSuccessToast(false)}
            className="ms-auto -mx-1.5 -my-1.5 bg-white text-slate-400 hover:text-slate-900 rounded-lg focus:ring-2 focus:ring-slate-300 p-1.5 hover:bg-slate-100 inline-flex items-center justify-center h-8 w-8 cursor-pointer transition-colors" 
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
          </button>
        </div>
      )}
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