import { useState, useEffect } from 'react';
import { KeyRound, Bot, RefreshCw, Save, Link } from 'lucide-react';

const DEFAULT_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-pro-vision',
  'Khác'
];

export default function ApiConfig({ onConfigChange }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ocr_api_key') || '');
  const [hfEndpoint, setHfEndpoint] = useState(() => localStorage.getItem('ocr_hf_endpoint_url') || '');
  const [showToast, setShowToast] = useState(false);
  
  const [availableModels, setAvailableModels] = useState(() => {
    try {
      const cached = localStorage.getItem('ocr_available_models');
      return cached ? JSON.parse(cached) : DEFAULT_MODELS;
    } catch {
      return DEFAULT_MODELS;
    }
  });

  const [model, setModel] = useState(() => {
    const saved = localStorage.getItem('ocr_model');
    return availableModels.includes(saved) ? saved : availableModels[0];
  });
  
  const [customModel, setCustomModel] = useState(() => localStorage.getItem('ocr_custom_model') || '');
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  useEffect(() => {
    localStorage.setItem('ocr_model', model);
    localStorage.setItem('ocr_custom_model', customModel);
    localStorage.setItem('ocr_available_models', JSON.stringify(availableModels));
    localStorage.setItem('ocr_hf_endpoint_url', hfEndpoint);
    
    if (onConfigChange) {
      onConfigChange({
        apiKey,
        model: model === 'Khác' ? customModel : model,
        hfEndpoint
      });
    }
  }, [apiKey, model, customModel, availableModels, hfEndpoint, onConfigChange]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleSaveConfig = () => {
    localStorage.setItem('ocr_api_key', apiKey);
    localStorage.setItem('ocr_hf_endpoint_url', hfEndpoint);
    setShowToast(true);
  };

  const fetchModels = async () => {
    if (!apiKey) {
      alert("Vui lòng nhập API Key trước khi đồng bộ danh sách Model.");
      return;
    }
    setIsFetchingModels(true);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) {
        throw new Error("Lỗi xác thực API Key hoặc quá tải kết nối. Vui lòng kiểm tra lại Key.");
      }
      const data = await res.json();
      
      // Lọc các model hỗ trợ generateContent và lấy phần tên phía sau "models/"
      const models = data.models
        .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
        .map(m => m.name.replace('models/', ''));
        
      if (models.length > 0) {
        models.push('Khác');
        setAvailableModels(models);
        setModel(models[0]);
        alert("Đã đồng bộ danh sách Model mới nhất từ Google thành công!");
      } else {
        alert("Không tìm thấy model nào hỗ trợ trên tài khoản của bạn.");
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setIsFetchingModels(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 w-full rounded-xl shadow-[0_4px_20px_rgba(0,88,190,0.02)] p-4 space-y-4">
      {/* Row 1: Google Gemini API Config */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 text-on-surface select-none shrink-0 min-w-[160px]">
            <div className="p-2 bg-surface text-primary border border-outline-variant/30 rounded-xl">
              <KeyRound size={16} />
            </div>
            <h2 className="font-bold text-xs sm:text-sm tracking-tight text-on-surface">Google API Key</h2>
          </div>
          
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary">
              <KeyRound size={14} />
            </div>
            <input
              type="password"
              placeholder="Nhập Gemini API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-white border border-outline-variant/60 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-on-surface placeholder-on-surface-variant/50"
            />
          </div>

          <div className="relative w-full sm:w-48 group shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary">
              <Bot size={14} />
            </div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full h-10 pl-9 pr-8 bg-white border border-outline-variant/60 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-on-surface-variant cursor-pointer appearance-none"
            >
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-on-surface-variant/60">
              <svg width="8" height="5" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <button
            onClick={fetchModels}
            disabled={isFetchingModels || !apiKey}
            className="w-10 h-10 bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all border border-outline-variant/40 rounded-xl flex items-center justify-center disabled:opacity-50 cursor-pointer shrink-0"
            title="Đồng bộ danh sách Model từ Google"
          >
            <RefreshCw size={14} className={isFetchingModels ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {model === 'Khác' && (
        <div className="flex justify-end lg:pr-14">
          <input
            type="text"
            placeholder="VD: gemini-1.5-pro-latest"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            className="w-full sm:w-48 h-10 px-3 bg-secondary-fixed-dim/10 border border-secondary-fixed-dim/30 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-on-secondary-container placeholder-secondary-fixed-dim focus:ring-primary/10"
          />
        </div>
      )}

      {/* Row 2: Hugging Face Endpoint URL */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 border-t border-outline-variant/20 pt-4">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 text-on-surface select-none shrink-0 min-w-[160px]">
            <div className="p-2 bg-surface text-primary border border-outline-variant/30 rounded-xl">
              <Link size={16} />
            </div>
            <h2 className="font-bold text-xs sm:text-sm tracking-tight text-on-surface">HF Endpoint URL</h2>
          </div>
          
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary">
              <Link size={14} />
            </div>
            <input
              type="text"
              placeholder="Nhập Hugging Face Space URL (VD: https://user-space.hf.space)"
              value={hfEndpoint}
              onChange={(e) => setHfEndpoint(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-white border border-outline-variant/60 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-on-surface placeholder-on-surface-variant/50"
            />
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={!apiKey && !hfEndpoint}
            className="w-full sm:w-auto h-10 px-4 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-primary/10"
            title="Lưu cấu hình vào trình duyệt"
          >
            <Save size={14} />
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-surface-container-lowest border border-tertiary-container/30 text-tertiary px-4 py-3 rounded-xl shadow-lg shadow-on-surface/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-2 h-2 bg-tertiary rounded-full animate-ping" />
          <span className="text-sm font-semibold">✨ Đã lưu cấu hình của bạn an toàn!</span>
        </div>
      )}
    </div>
  );
}
