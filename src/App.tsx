import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import OcrScanner from "./components/OcrScanner";
import OcrEditor from "./components/OcrEditor";

function AppRoutes() {
  const navigate = useNavigate();

  // State to hold OCR configuration and document data
  const [config, setConfig] = useState(null);
  const [document, setDocument] = useState(null);

  // Handlers for navigation and tab changes
  const handleStart = () => navigate("/ocr");
  const handleActiveTab = (tab) => navigate(`/${tab}`);

  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage onStart={handleStart} setActiveTab={handleActiveTab} />}
      />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route
        path="/ocr"
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
            onBack={() => navigate("/ocr")}
            membershipRole="Free"
            setActiveTab={handleActiveTab}
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}