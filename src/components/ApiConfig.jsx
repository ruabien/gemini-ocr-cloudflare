import { useState, useEffect } from 'react';
import { KeyRound, Bot, RefreshCw, Save, ChevronDown, CheckCircle2 } from 'lucide-react';

const DEFAULT_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-pro-vision',
  'Khác'
];

const DEFAULT_WORKER_URL = 'https://gemini-ocr-backend.ruabien1504.workers.dev';

export default function ApiConfig({ onConfigChange }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ocr_api_key') || localStorage.getItem('gemini_api_key') || '');
  const [workerUrl] = useState(() => localStorage.getItem('ocr_worker_url') || DEFAULT_WORKER_URL);
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
    localStorage.setItem('ocr_worker_url', workerUrl);
    
    if (onConfigChange) {
      onConfigChange({
        apiKey,
        model: model === 'Khác' ? customModel : model,
        workerUrl
      });
    }
  }, [apiKey, model, customModel, availableModels, workerUrl, onConfigChange]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleSaveKey = () => {
    localStorage.setItem('ocr_api_key', apiKey);
    localStorage.setItem('gemini_api_key', apiKey);
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
    <div className="bg-white border border-slate-200/60 w-full rounded-[24px] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,88,190,0.04)] flex flex-col gap-3 font-sans">
      <div className="space-y-2 w-full">
        <h2 className="font-display text-xl md:text-2xl font-bold text-[#0b1c30]">
          Điền API Key của bạn
        </h2>
        
        <div className="flex flex-col md:flex-row gap-3 w-full items-stretch">
          {/* API Key Input and Save Button */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0058be]">
                <KeyRound size={16} />
              </div>
              <input
                type="password"
                placeholder="Nhập Gemini API Key của bạn"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-10 pr-4 h-12 bg-white border border-[#0058be]/20 rounded-xl text-base font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0058be]/50 focus:border-[#0058be] transition-all"
              />
            </div>
            <button
              onClick={handleSaveKey}
              disabled={!apiKey}
              className="h-12 px-6 bg-[#0058be] hover:bg-[#004395] text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span>Lưu Key</span>
            </button>
          </div>

          {/* Model Dropdown and Sync Button */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0058be]">
                <Bot size={16} />
              </div>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full pl-10 pr-10 h-12 bg-white border border-[#0058be]/20 rounded-xl text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0058be]/50 focus:border-[#0058be] transition-all appearance-none cursor-pointer"
              >
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                <ChevronDown size={16} />
              </div>
            </div>
            <button
              onClick={fetchModels}
              disabled={isFetchingModels || !apiKey}
              className="h-12 px-4 bg-white text-[#0b1c30] border border-[#0058be]/20 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-base font-bold w-full sm:w-auto"
              title="Đồng bộ danh sách Model từ Google"
            >
              <RefreshCw size={16} className={isFetchingModels ? "animate-spin" : ""} />
              <span>Đồng bộ Model</span>
            </button>
          </div>

          {model === 'Khác' && (
            <input
              type="text"
              placeholder="VD: gemini-1.5-pro-latest"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="w-full md:w-48 h-12 px-4 bg-white border border-[#0058be]/20 rounded-xl text-base font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0058be]/50 focus:border-[#0058be] transition-all"
            />
          )}
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg text-base flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 size={20} className="text-white" />
          <span>✨ Đã lưu API Key của bạn an toàn!</span>
        </div>
      )}
    </div>
  );
}
