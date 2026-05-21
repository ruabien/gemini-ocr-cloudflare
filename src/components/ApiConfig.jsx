import { useState, useEffect } from 'react';
import { KeyRound, Bot, RefreshCw, Save } from 'lucide-react';

const DEFAULT_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-pro-vision',
  'Khác'
];

// Bạn có thể thay địa chỉ URL Cloudflare Worker sau khi deploy vào đây
// để làm địa chỉ mặc định cho tất cả người dùng mà không cần họ tự nhập.
const DEFAULT_WORKER_URL = 'https://gemini-ocr-backend.ruabien1504.workers.dev';

export default function ApiConfig({ onConfigChange }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ocr_api_key') || '');
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
    <div className="bg-white border border-slate-200/80 w-full rounded-xl shadow-sm">
      <div className="px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="flex items-center gap-2 text-slate-800 select-none">
          <div className="p-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl">
            <KeyRound size={18} />
          </div>
          <h1 className="font-bold text-sm tracking-tight text-slate-900">Điền API Key của bạn</h1>
        </div>

        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full lg:justify-end">
          
          <div className="flex w-full sm:w-auto gap-2">
            <div className="relative flex-1 sm:w-64 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600">
                <KeyRound size={14} />
              </div>
              <input
                type="password"
                placeholder="Nhập Gemini API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-800 placeholder-slate-400"
              />
            </div>

            <button
              onClick={handleSaveKey}
              disabled={!apiKey}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-indigo-100"
              title="Lưu API Key vào trình duyệt"
            >
              <Save size={14} />
              <span>Lưu Key</span>
            </button>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <div className="relative flex-1 sm:w-48 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600">
                <Bot size={14} />
              </div>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700 appearance-none cursor-pointer"
              >
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                <svg width="8" height="5" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <button
              onClick={fetchModels}
              disabled={isFetchingModels || !apiKey}
              className="px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all border border-slate-200 rounded-xl flex items-center justify-center disabled:opacity-50 cursor-pointer"
              title="Đồng bộ danh sách Model từ Google"
            >
              <RefreshCw size={14} className={isFetchingModels ? "animate-spin" : ""} />
            </button>
          </div>

          {model === 'Khác' && (
            <input
              type="text"
              placeholder="VD: gemini-1.5-pro-latest"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-550 focus:border-amber-500 transition-all font-medium text-amber-900 placeholder-amber-500 focus:ring-amber-500/10"
            />
          )}
          
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl shadow-lg shadow-slate-200/80 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-sm font-semibold">✨ Đã lưu API Key của bạn an toàn!</span>
        </div>
      )}
    </div>
  );
}
