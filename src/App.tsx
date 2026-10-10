import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams, useParams } from "react-router-dom";
import LandingPage from "./components/LandingPage";
// Dashboard component removed per MVP simplification
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfUse from "./components/TermsOfUse";
import Navbar from "./components/Navbar";
import AppLayout from "./components/AppLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import type { OcrConfig } from "./types";
import { migrateOcrConfig } from "./utils/ocrConfigMigration";

const OcrScanner = lazy(() => import("./components/OcrScanner"));
const OcrEditor = lazy(() => import("./components/OcrEditor"));
const StructuredExtractionEditor = lazy(() => import("./components/StructuredExtractionEditor"));
const DesktopProPage = lazy(() => import("./components/DesktopProPage"));
const Settings = lazy(() => import("./components/Settings"));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center py-12 w-full">
    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-2 text-sm text-slate-500">Loading...</p>
  </div>
);
import { getUserStorageItem } from "./utils/userStorage";
import { migrateOldStorage } from "./utils/geminiModelResolver";

const KnowledgeCenter = lazy(() => import("./knowledge/KnowledgeCenter"));
const KnowledgeArticle = lazy(() => import("./knowledge/KnowledgeArticle"));

const pathToTab = (path: string) => {
  if (path.startsWith("/knowledge/")) return "knowledge-article";

  const tabs: Record<string, string> = {
    "/": "landing",
    "/scanner": "scanner",
    "/editor": "editor",
    "/upgrade": "upgrade",
    "/settings": "settings",
    "/privacy": "privacy",
    "/terms": "terms",
    "/knowledge": "knowledge",
  };

  return tabs[path] || "landing";
};

const tabToPath = (tab: string) => {
  const paths: Record<string, string> = {
    landing: "/",
    scanner: "/scanner",
    editor: "/editor",
    upgrade: "/upgrade",
    settings: "/settings",
    privacy: "/privacy",
    terms: "/terms",
    knowledge: "/knowledge",
  };

  return paths[tab];
};

function KnowledgeArticleRoute() {
  const { slug = "" } = useParams();
  return <KnowledgeArticle slug={slug} />;
}

const getDefaultOcrConfig = (isPro: boolean): OcrConfig => ({
  engine: isPro ? "gemini" : "tesseract",
  outputFormat: "TXT",
  language: "vie",
  preserveLayout: true,
});

function AppContent() {
  const { user, updateUserPlan, isPro, loadingSubscription } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = pathToTab(location.pathname);
  const setActiveTab = (tab: string) => {
    const path = tabToPath(tab);
    if (path) navigate(path);
  };
  // State to hold OCR configuration, document data
  const [config, setConfig] = useState<OcrConfig>(() => getDefaultOcrConfig(isPro));
  const [document, setDocument] = useState<any>(null);
  const [userGeminiKey, setUserGeminiKey] = useState<string>("");
  const [showPaymentSuccessToast, setShowPaymentSuccessToast] = useState(false);

  useEffect(() => {
    if (loadingSubscription) {
      return;
    }

    let saved: string | null = null;
    try {
      saved = localStorage.getItem("ocr_config");
    } catch (e) {
      saved = null;
    }

    let parsed: unknown = null;
    try {
      parsed = saved ? JSON.parse(saved) : null;
    } catch (e) {
      parsed = null;
    }

    const nextConfig = migrateOcrConfig(parsed, isPro);

    try {
      localStorage.setItem("ocr_config", JSON.stringify(nextConfig));
    } catch (e) {}

    setConfig(nextConfig);
  }, [isPro, loadingSubscription]);

  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success") === "true";
    const status = searchParams.get("status");

    if (paymentSuccess || status === "PAID") {
      setShowPaymentSuccessToast(true);
      setSearchParams({}, { replace: true });
      navigate("/upgrade", { replace: true });
    }
  }, [searchParams, setSearchParams, navigate]);

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
    // Migrate old model storage to auto mode
    migrateOldStorage(user?.uid);

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
  const handleStart = () => navigate("/scanner");

  return (
    <>
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} membershipRole={membershipRole}>
        <Routes>
          <Route path="/" element={<LandingPage onStart={handleStart} setActiveTab={setActiveTab} />} />
          <Route path="/scanner" element={
            <Suspense fallback={<PageLoader />}>
            <OcrScanner
              onFileLoaded={(fileData) => {
                setDocument(fileData);
                navigate("/editor");
              }}
              config={config}
              setConfig={setConfig}
              setActiveTab={setActiveTab}
            />
            </Suspense>
          } />
          <Route path="/editor" element={
          <Suspense fallback={<PageLoader />}>
            {document?.outputMode === "structured" ? (
                <StructuredExtractionEditor
                  document={document}
                  onBack={() => navigate("/scanner")}
                  membershipRole={membershipRole}
                  setActiveTab={setActiveTab}
                  userGeminiKey={userGeminiKey}
                />
            ) : (
              <OcrEditor
                document={document}
                onBack={() => navigate("/scanner")}
                membershipRole={membershipRole}
                setActiveTab={setActiveTab}
              />
            )}
          </Suspense>
          } />
          <Route path="/upgrade" element={
          <Suspense fallback={<PageLoader />}>
            <DesktopProPage />
          </Suspense>
          } />
          <Route path="/settings" element={
          <Suspense fallback={<PageLoader />}>
            <Settings
              userGeminiKey={userGeminiKey}
              setUserGeminiKey={setUserGeminiKey}
              membershipRole={membershipRole}
              setMembershipRole={setMembershipRole}
              setActiveTab={setActiveTab}
            />
          </Suspense>
          } />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/knowledge" element={<Suspense fallback={<PageLoader />}><KnowledgeCenter /></Suspense>} />
          <Route path="/knowledge/:slug" element={<Suspense fallback={<PageLoader />}><KnowledgeArticleRoute /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}