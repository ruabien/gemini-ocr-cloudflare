import { useState, useEffect } from 'react';
import { KeyRound, Save } from 'lucide-react';

// Địa chỉ URL Cloudflare Worker mặc định
const DEFAULT_WORKER_URL = 'https://gemini-ocr-backend.ruabien1504.workers.dev';

export default function ApiConfig({ onConfigChange }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ocr_api_key') || '');
  const [workerUrl] = useState(() => localStorage.getItem('ocr_worker_url') || DEFAULT_WORKER_URL);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    localStorage.setItem('ocr_api_key', apiKey);
    localStorage.setItem('ocr_worker_url', workerUrl);
    
    if (onConfigChange) {
      onConfigChange({
        apiKey,
        model: 'gemini-2.5-flash',
        workerUrl
      });
    }
  }, [apiKey, workerUrl, onConfigChange]);

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

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 w-full rounded-xl shadow-[0_4px_20px_rgba(0,88,190,0.02)]">
      <div className="px-4 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="flex items-center gap-2 text-on-surface select-none">
          <div className="p-2 bg-surface text-primary border border-outline-variant/30 rounded-xl">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight text-on-surface">Cấu hình Gemini API Keys</h2>
            <p className="text-[10px] text-on-surface-variant/70 font-medium">Hỗ trợ nhập nhiều key cách nhau bằng dấu phẩy để tự động xoay vòng</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:justify-end">
          <div className="relative flex-1 max-w-full sm:max-w-xl group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary">
              <KeyRound size={14} />
            </div>
            <input
              type="text"
              placeholder="Nhập danh sách Gemini API Key (cách nhau bằng dấu phẩy)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full h-12 sm:h-10 pl-9 pr-3 bg-white border border-outline-variant/60 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-on-surface placeholder-on-surface-variant/50"
            />
          </div>

          <button
            onClick={handleSaveKey}
            disabled={!apiKey}
            className="w-full sm:w-auto h-12 sm:h-10 px-5 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-primary/10"
            title="Lưu API Key vào trình duyệt"
          >
            <Save size={14} />
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-surface-container-lowest border border-tertiary-container/30 text-tertiary px-4 py-3 rounded-xl shadow-lg shadow-on-surface/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-2 h-2 bg-tertiary rounded-full animate-ping" />
          <span className="text-sm font-semibold">✨ Đã lưu cấu hình API Keys an toàn!</span>
        </div>
      )}
    </div>
  );
}
