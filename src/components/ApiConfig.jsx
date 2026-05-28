import { useState, useEffect, useRef } from 'react';
import { KeyRound, Save, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react';

const DEFAULT_WORKER_URL = 'https://gemini-ocr-backend.ruabien1504.workers.dev';

export default function ApiConfig({ onConfigChange }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ocr_api_key') || '');
  const [modelName, setModelName] = useState(() => localStorage.getItem('ocr_model') || 'gemini-2.5-flash');
  const [workerUrl] = useState(() => localStorage.getItem('ocr_worker_url') || DEFAULT_WORKER_URL);
  const [showToast, setShowToast] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // States cho tính năng Kiểm tra Key
  const [isValidated, setIsValidated] = useState(() => {
    const savedKey = localStorage.getItem('ocr_api_key') || '';
    const savedModel = localStorage.getItem('ocr_model') || 'gemini-2.5-flash';
    return savedKey !== '' && savedModel !== '';
  });
  const [isChecking, setIsChecking] = useState(false);
  const [validationResults, setValidationResults] = useState([]);
  const [validationMessage, setValidationMessage] = useState("");

  // States cho bộ đếm tự động thu gọn và hiệu ứng mờ dần (UX)
  const [isFadingOut, setIsFadingOut] = useState(false);
  const dismissTimerRef = useRef(null);

  // UX & Bảo mật: Kiểm tra trạng thái đã Lưu
  const [isSaved, setIsSaved] = useState(() => {
    const saved = localStorage.getItem('ocr_api_key') || '';
    return saved !== '';
  });

  // Hộp cấu hình có thể xổ ra hoặc thu lại (Collapsible/Accordion Box)
  const [isExpanded, setIsExpanded] = useState(() => {
    const savedKey = localStorage.getItem('ocr_api_key') || '';
    return savedKey === ''; // Mặc định hiển thị nếu chưa có key, thu gọn nếu đã lưu
  });

  // Dọn dẹp timer khi component bị hủy (unmount) tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
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
    setIsSaved(false); // Đánh dấu là chưa lưu khi người dùng chỉnh sửa
    const saved = localStorage.getItem('ocr_api_key') || '';
    if (val.trim() === saved.trim() && saved.trim() !== '') {
      setIsValidated(true);
    } else {
      setIsValidated(false);
    }

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    setIsFadingOut(false);
    setValidationResults([]);
    setValidationMessage("");
  };

  const handleModelChange = (val) => {
    setModelName(val);
    const saved = localStorage.getItem('ocr_model') || 'gemini-2.5-flash';
    if (val.trim() === saved.trim()) {
      // Giữ nguyên
    } else {
      setIsValidated(false);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      setIsFadingOut(false);
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

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    setIsFadingOut(false);

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
          } catch {
            // ignore
          }

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
              message: 'Lỗi (Sai key, không hỗ trợ mô hình này hoặc bị khóa)'
            });
          }
        }
      } catch (err) {
        let displayError = err.message;
        if (err.message === 'Load failed' || err.name === 'TypeError') {
          displayError = 'Lỗi kết nối mạng (CORS hoặc thiết bị không có internet).';
        }
        results.push({
          key,
          masked,
          status: 'error',
          message: `Lỗi kết nối mạng: ${displayError}`
        });
      }
      setValidationResults([...results]);
    }

    setIsChecking(false);
    if (validCount > 0) {
      setIsValidated(true);
      setValidationMessage(`🎉 Đã xác thực thành công ${validCount} key hoạt động tốt. Bạn có thể lưu cấu hình để bắt đầu sử dụng.`);
      
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        setIsFadingOut(true);
      }, 7000);
    } else {
      setIsValidated(false);
      setValidationMessage(`❌ Tất cả các API Key đều bị lỗi hoặc không hỗ trợ mô hình '${currentModel}'. Vui lòng kiểm tra lại.`);
    }
  };

  const handleSaveKey = () => {
    localStorage.setItem('ocr_api_key', apiKey);
    localStorage.setItem('ocr_model', modelName);
    setIsSaved(true); // Đánh dấu đã lưu thành công
    setIsValidated(true);
    setShowToast(true);
    setIsExpanded(false); // Tự động thu gọn khi bấm lưu
    if (onConfigChange) {
      onConfigChange({
        apiKey,
        model: modelName,
        workerUrl
      });
    }
  };

  const handleClearConfig = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ cấu hình API Key khỏi trình duyệt này không?")) {
      localStorage.removeItem('ocr_api_key');
      localStorage.removeItem('ocr_model');
      setApiKey('');
      setModelName('gemini-2.5-flash');
      setIsValidated(false);
      setIsSaved(false);
      setValidationResults([]);
      setValidationMessage("");
      if (onConfigChange) {
        onConfigChange({
          apiKey: '',
          model: 'gemini-2.5-flash',
          workerUrl: DEFAULT_WORKER_URL
        });
      }
      alert("Đã xóa sạch cấu hình lưu trên trình duyệt.");
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 w-full rounded-xl shadow-[0_4px_20px_rgba(0,88,190,0.02)] overflow-hidden">
      {/* Header Accordion Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative flex items-center justify-end px-4 py-3 bg-surface/40 border-b border-outline-variant/20 cursor-pointer select-none hover:bg-surface transition-colors"
      >
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-2">
          <KeyRound size={16} className="text-primary shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-on-surface whitespace-nowrap">Cấu hình API & Mô hình AI</span>
          {isSaved ? (
            <span className="text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap">Đã cấu hình</span>
          ) : (
            <span className="text-[9px] sm:text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap">Chưa lưu cấu hình</span>
          )}
        </div>

        <button 
          className="text-on-surface-variant hover:text-primary transition-colors focus:outline-none flex items-center justify-center p-1 rounded-full hover:bg-slate-100"
          title={isExpanded ? "Thu gọn" : "Mở rộng"}
        >
          <span className="material-icons text-[18px] transition-transform duration-300 transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            expand_more
          </span>
        </button>
      </div>

      {/* Accordion Content Wrapper */}
      <div 
        className="transition-all duration-400 ease-in-out overflow-hidden"
        style={{ 
          maxHeight: isExpanded ? '1000px' : '0px',
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div className="p-4">
          {/* Inputs & Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* API Key list field */}
            <div className="md:col-span-5 flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold text-on-surface-variant">Danh sách Gemini API Keys:</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary">
                  <KeyRound size={14} />
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="Nhập các key cách nhau bằng dấu phẩy"
                  value={apiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  disabled={isChecking}
                  className="w-full h-10 pl-9 pr-10 bg-white border border-outline-variant/60 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-on-surface placeholder-on-surface-variant/50 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title={showKey ? "Ẩn Key" : "Hiện Key"}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* AI Model name field */}
            <div className="md:col-span-3 flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold text-on-surface-variant">Mô hình AI sử dụng:</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60 group-focus-within:text-primary">
                  <span className="material-icons text-[16px]">smart_toy</span>
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
            <div className="md:col-span-4 flex gap-2">
              <button
                onClick={validateGeminiKeys}
                disabled={isChecking || !apiKey.trim() || !modelName.trim()}
                className="flex-1 h-10 px-2 bg-slate-100 hover:bg-slate-200 text-on-surface border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Kiểm tra tính hợp lệ của các API Key với mô hình đã nhập"
              >
                {isChecking ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ShieldCheck size={12} />
                )}
                <span>Kiểm tra</span>
              </button>

              <button
                onClick={handleSaveKey}
                disabled={!isValidated || isChecking || !apiKey.trim() || !modelName.trim()}
                className="flex-1 h-10 px-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-primary/10"
                title="Lưu cấu hình API Key và Mô hình"
              >
                <Save size={12} />
                <span>Lưu</span>
              </button>

              <button
                onClick={handleClearConfig}
                disabled={isChecking || (!apiKey.trim() && !localStorage.getItem('ocr_api_key'))}
                className="flex-1 h-10 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Xóa cấu hình API Key khỏi trình duyệt này"
              >
                <Trash2 size={12} />
                <span>Xóa</span>
              </button>
            </div>
          </div>

          {/* Warning notice */}
          <div className="mt-3 flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/40 text-left">
            <AlertTriangle size={12} className="shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-normal">
              <strong>Lưu ý bảo mật:</strong> API Key được lưu trực tiếp dưới dạng thuần túy trong bộ nhớ <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[9px]">localStorage</code> của trình duyệt này để tự động nạp cho các phiên làm việc sau. Vui lòng bấm nút <strong>"Xóa"</strong> ở trên trước khi rời khỏi thiết bị công cộng hoặc thiết bị dùng chung.
            </p>
          </div>
        </div>

        {/* Panel kết quả kiểm tra hỗ trợ hiệu ứng thu gọn và mờ dần */}
        {validationResults.length > 0 && (
          <div 
            className={`transition-all duration-500 ease-in-out px-4 border-t border-outline-variant/20 bg-slate-50/50 text-left ${
              isFadingOut 
                ? 'opacity-0 max-h-0 py-0 border-t-0 pointer-events-none' 
                : 'opacity-100 max-h-[600px] py-4'
            }`}
            style={{ overflow: 'hidden' }}
          >
            <div className="text-on-surface-variant/70 text-[10px] uppercase font-bold tracking-wider font-sans mb-3">Trạng thái xác thực các Key:</div>
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
                  
                  <span className="font-sans">Key {index + 1} - </span>
                  <span className="font-mono">{res.masked}</span>
                  <span className="text-[11px] font-medium text-on-surface">: {res.message}</span>
                </div>
              ))}
            </div>
            {validationMessage && (
              <p className={`text-xs mt-2.5 font-bold ${isValidated ? 'text-emerald-700' : 'text-rose-700'}`}>
                {validationMessage}
              </p>
            )}
          </div>
        )}
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
