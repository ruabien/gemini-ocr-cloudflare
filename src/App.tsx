import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import OcrScanner from "./components/OcrScanner";
import OcrEditor from "./components/OcrEditor";
import Navbar from "./components/Navbar";
import Upgrade from "./components/Upgrade";
import Settings from "./components/Settings";

function AppRoutes() {
  const navigate = useNavigate();

  // State to hold OCR configuration, document data, session and membership
  const [config, setConfig] = useState<any>(null);
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

  // Handlers for navigation and tab changes
  const handleStart = () => {
    setActiveTab("scanner");
    navigate("/scanner");
  };
  const handleActiveTab = (tab: string) => {
    setActiveTab(tab);
    navigate(`/${tab}`);
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
      <div className="pt-16 min-h-[calc(100vh-4rem)]">
        <Routes>
          <Route
            path="/"
            element={<LandingPage onStart={handleStart} setActiveTab={handleActiveTab} />}
          />
          <Route path="/dashboard" element={<Dashboard onStartOcr={handleStart} />} />
          <Route
            path="/scanner"
            element={
              <OcrScanner
                onFileLoaded={(fileData) => {
                  setDocument(fileData);
                  navigate("/editor");
                }}
                config={config}
                setConfig={setConfig}
              />
            }
          />
          <Route
            path="/editor"
            element={
              <OcrEditor
                document={document}
                onBack={handleStart}
                membershipRole={membershipRole}
                setActiveTab={handleActiveTab}
              />
            }
          />
          <Route
            path="/upgrade"
            element={
              <Upgrade
                session={session}
                membershipRole={membershipRole}
                setMembershipRole={setMembershipRole}
                setActiveTab={handleActiveTab}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <Settings
                userGeminiKey={userGeminiKey}
                setUserGeminiKey={setUserGeminiKey}
                membershipRole={membershipRole}
                setMembershipRole={setMembershipRole}
                setActiveTab={handleActiveTab}
              />
            }
          />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}