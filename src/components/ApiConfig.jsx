import { useState, useEffect } from 'react';
import { KeyRound, Save, Trash2 } from 'lucide-react';

export default function ApiConfig({ onConfigChange }) {
  const [modelName, setModelName] = useState(() => localStorage.getItem('ocr_model') || 'gemini-2.5-flash');
  const [showToast, setShowToast] = useState(false);
  const [licenseKey, setLicenseKey] = useState(() => localStorage.getItem('ocr_license_key') || '');

  // UX & Bảo mật: Kiểm tra trạng thái đã Lưu
  const [isSaved, setIsSaved] = useState(() => {
    const saved = localStorage.getItem('ocr_model') || '';
    return saved !== '';
  });

  // Hộp cấu hình có thể xổ ra hoặc thu lại (Collapsible/Accordion Box)
  const [isExpanded, setIsExpanded] = useState(() => {
    const savedModel = localStorage.getItem('ocr_model') || '';
    return savedModel === ''; // Mặc định hiển thị nếu chưa chọn mô hình, thu gọn nếu đã lưu
  });

  useEffect(() => {
    const savedModel = localStorage.getItem('ocr_model') || 'gemini-2.5-flash';
    const savedLicense = localStorage.getItem('ocr_license_key') || '';
    if (modelName === savedModel && licenseKey === savedLicense && onConfigChange) {
      onConfigChange({
        model: modelName,
        licenseKey
      });
    }
  }, [modelName, licenseKey, onConfigChange]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleModelChange = (val) => {
    setModelName(val);
    setIsSaved(false);
  };

  const handleSaveKey = () => {
    localStorage.setItem('ocr_model', modelName);
    localStorage.setItem('ocr_license_key', licenseKey);
    setIsSaved(true);
    setShowToast(true);
    setIsExpanded(false); // Tự động thu gọn khi bấm lưu
    if (onConfigChange) {
      onConfigChange({
        model: modelName,
        licenseKey
      });
    }
  };

  const handleClearConfig = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa cấu hình Mô hình AI và License Key khỏi trình duyệt này không?")) {
      localStorage.removeItem('ocr_model');
      localStorage.removeItem('ocr_license_key');
      setModelName('gemini-2.5-flash');
      setLicenseKey('');
      setIsSaved(false);
      if (onConfigChange) {
        onConfigChange({
          model: 'gemini-2.5-flash',
          licenseKey: ''
        });
      }
      alert("Đã xóa sạch cấu hình lưu trên trình duyệt.");
    }
  };

  return (
    <div className="bg-surface border border-border w-full rounded-xl shadow-[0_4px_20px_rgba(22,58,112,0.02)] overflow-hidden">
      {/* Header Accordion Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative flex items-center justify-end px-4 py-3 bg-surface/40 border-b border-border/60 cursor-pointer select-none hover:bg-surface transition-colors"
      >
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-2">
          <KeyRound size={16} className="text-primary shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-text-primary whitespace-nowrap">Cấu hình Mô hình AI & Premium</span>
          {isSaved ? (
            <span className="text-[9px] sm:text-[10px] bg-success/10 text-success px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap">Đã cấu hình</span>
          ) : (
            <span className="text-[9px] sm:text-[10px] bg-accent/10 text-accent px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap">Chưa lưu cấu hình</span>
          )}
        </div>

        <button 
          className="text-text-secondary hover:text-primary transition-colors focus:outline-none flex items-center justify-center p-1 rounded-full hover:bg-background"
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
            
            {/* AI Model name field */}
            <div className="md:col-span-6 flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold text-text-secondary">Mô hình AI sử dụng:</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary/60 group-focus-within:text-primary">
                  <span className="material-icons text-[16px]">smart_toy</span>
                </div>
                <input
                  type="text"
                  placeholder="Ví dụ: gemini-2.5-flash"
                  value={modelName}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-surface border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-text-primary placeholder-text-secondary/40"
                />
              </div>
            </div>

            {/* License Key Premium */}
            <div className="md:col-span-6 flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold text-primary flex items-center gap-1">
                <span>👑 Mã kích hoạt Premium:</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-primary/60 group-focus-within:text-primary">
                  <span className="material-icons text-[16px]">workspace_premium</span>
                </div>
                <input
                  type="text"
                  placeholder="Nhập mã Premium để mở khóa Word"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-surface border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-text-primary placeholder-text-secondary/40"
                />
              </div>
            </div>

            {/* Buttons Row */}
            <div className="md:col-span-12 flex flex-wrap gap-2 mt-2">
              <button
                onClick={handleSaveKey}
                disabled={!modelName.trim()}
                className="flex-1 h-10 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-primary/10"
                title="Lưu cấu hình Mô hình và License Key"
              >
                <Save size={12} />
                <span>Lưu cấu hình</span>
              </button>

              <button
                onClick={handleClearConfig}
                className="flex-1 h-10 px-4 btn-premium-danger rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Xóa cấu hình khỏi trình duyệt này"
              >
                <Trash2 size={12} />
                <span>Xóa cấu hình</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-surface border border-success/30 text-success px-4 py-3 rounded-xl shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-2 h-2 bg-success rounded-full animate-ping" />
          <span className="text-sm font-semibold">✨ Đã lưu cấu hình Mô hình AI an sau!</span>
        </div>
      )}
    </div>
  );
}
