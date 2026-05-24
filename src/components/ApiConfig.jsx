import { useState, useEffect } from 'react';
import { KeyRound, Save, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

const DEFAULT_WORKER_URL = 'https://gemini-ocr-backend.ruabien1504.workers.dev';

export default function ApiConfig({ onConfigChange }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ocr_api_key') || '');
  const [modelName, setModelName] = useState(() => localStorage.getItem('ocr_model') || 'gemini-2.5-flash');
  const [workerUrl] = useState(() => localStorage.getItem('ocr_worker_url') || DEFAULT_WORKER_URL);
  const [showToast, setShowToast] = useState(false);

  // States cho tính năng Kiểm tra Key
  const [isValidated, setIsValidated] = useState(() => {
    const savedKey = localStorage.getItem('ocr_api_key') || '';
    const savedModel = localStorage.getItem('ocr_model') || 'gemini-2.5-flash';
    return savedKey !== '' && savedModel !== '';
  });
  const [isChecking, setIsChecking] = useState(false);
  const [validationResults, setValidationResults] = useState([]);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    // Chỉ kích hoạt callback cấu hình khi API Key và Model đã khớp với dữ liệu đã lưu
    const savedKey = localStorage.getItem('ocr_api_key') || '';
    const savedModel = localStorage.getItem('ocr_model') || 'gemini-2.5-flash';
    if (apiKey === savedKey && modelName === savedModel && onConfigChange) {
      onConfigChange({
        apiKey,
        model: modelName,
        workerUrl
      });
    }
  }, [apiKey, modelName, workerUrl, onConfigChange]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleKeyChange = (val) => {
    setApiKey(val);
    const saved = localStorage.getItem('ocr_api_key') || '';
    if (val.trim() === saved.trim() && saved.trim() !== '') {
      setIsValidated(true);
    } else {
      setIsValidated(false);
    }
    setValidationResults([]);
    setValidationMessage("");
  };

  const handleModelChange = (val) => {
    setModelName(val);
    const saved = localStorage.getItem('ocr_model') || 'gemini-2.5-flash';
    if (val.trim() === saved.trim()) {
      // Giữ nguyên trạng thái validate cũ nếu trùng model đã lưu
    } else {
      setIsValidated(false);
      setValidationResults([]);
      setValidationMessage("");
    }
  };

  const validateGeminiKeys = async () => {
    const keys = apiKey.split(',').map(k => k.trim()).filter(Boolean);
    const currentModel = modelName.trim() || 'gemini-2.5-flash';
    if (keys.length === 0) {
      alert("Vui lòng nhập API Key trước khi kiểm tra.");
      return;
    }

    setIsChecking(true);
    setValidationResults([]);
    setValidationMessage("");

    const results = [];
    let validCount = 0;

    for (const key of keys) {
      const masked = key.length > 8 
        ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` 
        : key;

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}?key=${key}`);
        
        if (response.ok) {
          results.push({
            key,
            masked,
            status: 'success',
            message: 'Hoạt động tốt'
          });
          validCount++;
        } else {
          const status = response.status;
          let errorMsg = `Lỗi HTTP ${status}`;
          try {
            const data = await response.json();
            errorMsg = data?.error?.message || errorMsg;
          } catch {}

          if (status === 429) {
            results.push({
              key,
              masked,
              status: 'rate_limit',
              message: 'Bị nghẽn hạn mức 429'
            });
          } else {
            results.push({
              key,
              masked,
              status: 'error',
              message: 'Lỗi (Sai key, không hỗ trợ model này hoặc bị khóa)'
            });
          }
        }
      } catch (err) {
        results.push({
          key,
          masked,
          status: 'error',
          message: `Lỗi kết nối mạng: ${err.message}`
        });
      }
      setValidationResults([...results]);
    }

    setIsChecking(false);
    if (validCount > 0) {
      setIsValidated(true);
      setValidationMessage(`🎉 Đã xác thực thành công ${validCount} key hoạt động tốt. Bạn có thể lưu cấu hình để bắt đầu sử dụng.`);
    } else {
      setIsValidated(false);
      setValidationMessage(`❌ Tất cả các API Key đều bị lỗi hoặc không hỗ trợ mô hình '${currentModel}'. Vui lòng kiểm tra lại.`);
    }
  };

  const handleSaveKey = () => {
    localStorage.setItem('ocr_api_key', apiKey);
    localStorage.setItem('ocr_model', modelName);
    setIsValidated(true);
    setShowToast(true);
    if (onConfigChange) {
      onConfigChange({
        apiKey,
        model: modelName,
        workerUrl
      });
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 w-full rounded-xl shadow-[0_4px_20px_rgba(0,88,190,0.02)] overflow-hidden">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 text-on-surface select-none">
          <div className="p-2 bg-surface text-primary border border-outline-variant/30 rounded-xl">
            <KeyRound size={18} />
          </div>
          <div className="text-left">
            <h2 className="font-bold text-sm tracking-tight text-on-surface">Cấu hình API & Mô hình AI</h2>
            <p className="text-[10px] text-on-surface-variant/70 font-medium">Nhập danh sách API Key và tên mô hình AI Google để xử lý OCR</p>
          </div>
        </div>

        {/* Inputs & Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* API Key list field */}
          <div className="md:col-span-6 flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-on-surface-variant">Danh sách Gemini API Keys:</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary">
                <KeyRound size={14} />
              </div>
              <input
                type="text"
                placeholder="Nhập các key cách nhau bằng dấu phẩy"
                value={apiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                disabled={isChecking}
                className="w-full h-10 pl-9 pr-3 bg-white border border-outline-variant/60 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-on-surface placeholder-on-surface-variant/50 disabled:opacity-50"
              />
            </div>
          </div>

          {/* AI Model name field */}
          <div className="md:col-span-3 flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-on-surface-variant">Mô hình AI sử dụng:</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary">
                <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              </div>
              <input
                type="text"
                placeholder="Ví dụ: gemini-2.5-flash"
                value={modelName}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={isChecking}
                className="w-full h-10 pl-9 pr-3 bg-white border border-outline-variant/60 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-on-surface placeholder-on-surface-variant/50 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="md:col-span-3 flex gap-2">
            <button
              onClick={validateGeminiKeys}
              disabled={isChecking || !apiKey.trim() || !modelName.trim()}
              className="flex-1 h-10 px-3 bg-slate-100 hover:bg-slate-200 text-on-surface border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Kiểm tra tính hợp lệ của các API Key với mô hình đã nhập"
            >
              {isChecking ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              <span>Kiểm tra Key</span>
            </button>

            <button
              onClick={handleSaveKey}
              disabled={!isValidated || isChecking || !apiKey.trim() || !modelName.trim()}
              className="flex-1 h-10 px-3 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-primary/10"
              title="Lưu cấu hình API Key và Mô hình"
            >
              <Save size={14} />
              <span>Lưu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation results view */}
      {validationResults.length > 0 && (
        <div className="px-4 pb-4 pt-3 border-t border-outline-variant/20 bg-slate-50/50 space-y-3 text-left">
          <div className="text-on-surface-variant/70 text-[10px] uppercase font-bold tracking-wider font-sans">Trạng thái xác thực các Key:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {validationResults.map((res, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold ${
                  res.status === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : res.status === 'rate_limit'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {res.status === 'success' && <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />}
                {res.status === 'rate_limit' && <AlertTriangle size={14} className="shrink-0 text-amber-600" />}
                {res.status === 'error' && <XCircle size={14} className="shrink-0 text-rose-600" />}
                
                <span className="font-mono">{res.masked}</span>
                <span className="text-[11px] font-medium text-on-surface">: {res.message}</span>
              </div>
            ))}
          </div>
          {validationMessage && (
            <p className={`text-xs mt-2 font-bold ${isValidated ? 'text-emerald-700' : 'text-rose-700'}`}>
              {validationMessage}
            </p>
          )}
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-surface-container-lowest border border-tertiary-container/30 text-tertiary px-4 py-3 rounded-xl shadow-lg shadow-on-surface/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-2 h-2 bg-tertiary rounded-full animate-ping" />
          <span className="text-sm font-semibold">✨ Đã lưu cấu hình API Keys an toàn!</span>
        </div>
      )}
    </div>
  );
}
