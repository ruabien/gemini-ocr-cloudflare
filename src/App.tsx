import React, { useState, useEffect, Suspense, lazy } from "react";
import LandingPage from "./components/LandingPage";
// Dashboard component removed per MVP simplification
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfUse from "./components/TermsOfUse";
import Navbar from "./components/Navbar";
import AppLayout from "./components/AppLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const OcrScanner = lazy(() => import("./components/OcrScanner"));
const OcrEditor = lazy(() => import("./components/OcrEditor"));
const StructuredExtractionEditor = lazy(() => import("./components/StructuredExtractionEditor"));
const Upgrade = lazy(() => import("./components/Upgrade"));
const Settings = lazy(() => import("./components/Settings"));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center py-12 w-full">
    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-2 text-sm text-slate-500">Loading...</p>
  </div>
);
import { getUserStorageItem } from "./utils/userStorage";

const KnowledgeCenter = lazy(() => import("./knowledge/KnowledgeCenter"));
const KnowledgeArticle = lazy(() => import("./knowledge/KnowledgeArticle"));

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
  const [articleSlug, setArticleSlug] = useState<string>("");
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

  useEffect(() => {
    const handleLocation = (event?: PopStateEvent) => {
      const path = window.location.pathname;
      if (path === "/knowledge") {
        setActiveTab("knowledge");
        setArticleSlug("");
      } else if (path.startsWith("/knowledge/")) {
        const slug = path.split("/")[2] || "";
        setActiveTab("knowledge-article");
        setArticleSlug(slug);
      } else if (path === "/" || path === "") {
        const targetTab = (event && event.state && event.state.activeTab) || "landing";
        setActiveTab(targetTab);
      }
    };
    handleLocation();
    window.addEventListener("popstate", handleLocation as any);
    return () => window.removeEventListener("popstate", handleLocation as any);
  }, []);

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
    if (tab !== "knowledge" && tab !== "knowledge-article") {
      if (window.location.pathname.startsWith('/knowledge')) {
        window.history.pushState({}, '', '/');
      }
    }
  };

  return (
    <>
      <AppLayout activeTab={activeTab} setActiveTab={handleActiveTab} membershipRole={membershipRole}>
        {activeTab === "landing" && (
          <LandingPage onStart={handleStart} setActiveTab={handleActiveTab} />
        )}
        {/* Dashboard view removed */}
        {activeTab === "scanner" && (
          <Suspense fallback={<PageLoader />}>
            <OcrScanner
              onFileLoaded={(fileData) => {
                setDocument(fileData);
                setActiveTab("editor");
              }}
              config={config}
              setConfig={setConfig}
              setActiveTab={handleActiveTab}
            />
          </Suspense>
        )}
        {activeTab === "editor" && (
          <Suspense fallback={<PageLoader />}>
            {document?.outputMode === "structured" ? (
                <StructuredExtractionEditor
                  document={document}
                  onBack={handleStart}
                  membershipRole={membershipRole}
                  setActiveTab={handleActiveTab}
                  userGeminiKey={userGeminiKey}
                />
            ) : (
              <OcrEditor
                document={document}
                onBack={handleStart}
                membershipRole={membershipRole}
                setActiveTab={handleActiveTab}
              />
            )}
          </Suspense>
        )}
        {activeTab === "upgrade" && (
          <Suspense fallback={<PageLoader />}>
            <Upgrade
              membershipRole={membershipRole}
              setMembershipRole={setMembershipRole}
              setActiveTab={handleActiveTab}
            />
          </Suspense>
        )}
        {activeTab === "settings" && (
          <Suspense fallback={<PageLoader />}>
            <Settings
              userGeminiKey={userGeminiKey}
              setUserGeminiKey={setUserGeminiKey}
              membershipRole={membershipRole}
              setMembershipRole={setMembershipRole}
              setActiveTab={handleActiveTab}
            />
          </Suspense>
        )}
        {activeTab === "privacy" && (
          <PrivacyPolicy />
        )}
        {activeTab === "terms" && (
          <TermsOfUse />
        )}
        {activeTab === "knowledge" && (
          <Suspense fallback={<PageLoader />}>
            <KnowledgeCenter />
          </Suspense>
        )}
        {activeTab === "knowledge-article" && (
          <Suspense fallback={<PageLoader />}>
            <KnowledgeArticle slug={articleSlug} />
          </Suspense>
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