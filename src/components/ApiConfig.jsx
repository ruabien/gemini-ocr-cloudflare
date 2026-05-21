import { useState, useEffect } from 'react';
import { Settings2, KeyRound, Bot, RefreshCw, Server } from 'lucide-react';

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
  const [workerUrl, setWorkerUrl] = useState(() => localStorage.getItem('ocr_worker_url') || DEFAULT_WORKER_URL);
  
  const [isAdmin, setIsAdmin] = useState(() => {
    return typeof window !== 'undefined' && window.location.search.includes('admin=true');
  });

  const handleTitleDoubleClick = () => {
    setIsAdmin(prev => !prev);
  };
  
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
    localStorage.setItem('ocr_api_key', apiKey);
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
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div 
          className="flex items-center gap-2 text-slate-800 cursor-pointer select-none" 
          onDoubleClick={handleTitleDoubleClick}
          title="Nhấp đúp chuột để bật/tắt Cấu hình nâng cao"
        >
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <Settings2 size={20} />
          </div>
          <h1 className="font-bold text-lg tracking-tight hidden sm:block">Cấu hình</h1>
        </div>

        <div className="flex flex-1 md:flex-none flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          
          {isAdmin && (
            <div className="relative w-full sm:w-60 group animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500">
                <Server size={16} />
              </div>
              <input
                type="text"
                placeholder="Cloudflare Worker URL"
                value={workerUrl}
                onChange={(e) => setWorkerUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
              />
            </div>
          )}

          <div className="relative w-full sm:w-64 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500">
              <KeyRound size={16} />
            </div>
            <input
              type="password"
              placeholder="Nhập Gemini API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
            />
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <div className="relative flex-1 sm:w-48 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500">
                <Bot size={16} />
              </div>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 appearance-none cursor-pointer"
              >
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <button
              onClick={fetchModels}
              disabled={isFetchingModels || !apiKey}
              className="px-3 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200 flex items-center justify-center disabled:opacity-50"
              title="Đồng bộ danh sách Model từ Google"
            >
              <RefreshCw size={16} className={isFetchingModels ? "animate-spin" : ""} />
            </button>
          </div>

          {model === 'Khác' && (
            <input
              type="text"
              placeholder="VD: gemini-1.5-pro-latest"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="w-full sm:w-48 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-amber-900 placeholder-amber-400"
            />
          )}
          
        </div>
      </div>
    </div>
  );
}
