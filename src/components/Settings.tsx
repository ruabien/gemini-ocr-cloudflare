/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Settings, Key, ShieldCheck, Check, Award, Zap, AlertCircle, Trash2, User, Calendar, LogOut, Sparkles
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getUserStorageItem, setUserStorageItem, removeUserStorageItem } from "../utils/userStorage";
import { autoResolveModel, MODEL_MODES, validateGeminiModel, migrateOldStorage, checkAndSaveKeyMetadata, resetModelResolverState } from "../utils/geminiModelResolver";

interface SettingsProps {
  userGeminiKey: string;
  setUserGeminiKey: (key: string) => void;
  membershipRole: "Free" | "Pro";
  setMembershipRole: (role: "Free" | "Pro") => void;
  setActiveTab: (tab: string) => void;
}

export default function SettingsComponent({
  userGeminiKey,
  setUserGeminiKey,
  membershipRole,
  setMembershipRole,
  setActiveTab
}: SettingsProps) {
  const { user, isPro, planType, expiredAt, logout, loginWithGoogle, loading } = useAuth();
  
  const [keysList, setKeysList] = useState<string[]>(() => {
    try {
      const stored = getUserStorageItem(user?.uid, 'gemini_keys');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return userGeminiKey ? [userGeminiKey] : [];
  });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [geminiModelMode, setGeminiModelMode] = useState<string>(() => {
    return getUserStorageItem(user?.uid, 'gemini_model_mode') || MODEL_MODES.AUTO;
  });
   const [geminiModel, setGeminiModel] = useState<string>(() => {
     return getUserStorageItem(user?.uid, 'ocr_model') || "gemini-2.5-flash";
   });

   // Migrate any legacy storage keys and sync state
   React.useEffect(() => {
     if (!user?.uid) return;
     migrateOldStorage(user.uid);
     const mode = getUserStorageItem(user.uid, 'gemini_model_mode') || MODEL_MODES.AUTO;
     const manual = getUserStorageItem(user.uid, 'ocr_model') || "gemini-2.5-flash";
     setGeminiModelMode(mode);
     setGeminiModel(manual);
   }, [user?.uid]);
  
  const [modelStatusMsg, setModelStatusMsg] = useState<{ type: 'info' | 'success' | 'error', text: string } | null>(null);
  const [resolvedModelDisplay, setResolvedModelDisplay] = useState<string>(() => {
    return getUserStorageItem(user?.uid, 'gemini_resolved_model') || '';
  });

  const [metadataTrigger, setMetadataTrigger] = useState(0);
  const [checkingKeys, setCheckingKeys] = useState<Record<string, boolean>>({});

  const getKeyMetadata = React.useCallback((key: string) => {
    const metaStr = getUserStorageItem(user?.uid, `gemini_key_metadata_${key}`);
    if (!metaStr) return null;
    try {
      const parsed = JSON.parse(metaStr);
      let migrated = false;
      if (parsed && Array.isArray(parsed.availableModels) && parsed.availableModels.length > 0 && typeof parsed.availableModels[0] === 'string') {
        parsed.availableModels = parsed.availableModels.map((m: string) => ({
          name: m,
          supportsGenerateContent: true
        }));
        migrated = true;
      }
      if (migrated) {
        setUserStorageItem(user?.uid, `gemini_key_metadata_${key}`, JSON.stringify(parsed));
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }, [user?.uid, metadataTrigger]);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    const dateObj = new Date(timestamp);
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    const ss = String(dateObj.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  };

  const cachedModelsList = React.useMemo<string[] | null>(() => {
    const cachedObj = getUserStorageItem(user?.uid, 'gemini_model_cache');
    if (cachedObj) {
      try {
        const cache = JSON.parse(cachedObj);
        if (Array.isArray(cache.availableModels)) {
          return cache.availableModels;
        }
      } catch (e) {}
    }
    return null;
  }, [user?.uid, modelStatusMsg]);

  const visibleManualModels = React.useMemo(() => {
    if (!cachedModelsList) return [];
    return [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Khuyến nghị)" },
      { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash (Thử nghiệm)" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Cũ)" }
    ].filter(m => cachedModelsList.some(c => c === m.value || c === `models/${m.value}`));
  }, [cachedModelsList]);

  // Whenever user or key changes in auto mode, check cache/resolve
  React.useEffect(() => {
    if (geminiModelMode === MODEL_MODES.AUTO && keysList.length > 0) {
      const activeKey = keysList[0];
      const cached = getUserStorageItem(user?.uid, 'gemini_resolved_model');
      if (cached) {
        setResolvedModelDisplay(cached);
        setModelStatusMsg({ type: 'success', text: `Đang sử dụng ${cached}` });
      } else {
        setModelStatusMsg({ type: 'info', text: "Model sẽ được xác định khi kiểm tra API Key." });
      }
    }
  }, [geminiModelMode, keysList, user?.uid]);

  // Show warning if selected manual model is no longer available
  React.useEffect(() => {
    if (geminiModelMode === MODEL_MODES.MANUAL) {
      const manualAvailable = visibleManualModels.some(m => m.value === geminiModel);
      if (!manualAvailable || visibleManualModels.length === 0) {
        setModelStatusMsg({ type: 'error', text: 'Model đang chọn không còn được API key này hỗ trợ.' });
      } else {
        setModelStatusMsg({ type: 'success', text: `Mô hình ${geminiModel} hợp lệ và sẵn sàng.` });
      }
    }
  }, [geminiModelMode, visibleManualModels, geminiModel, user?.uid]);

  const verifyAndResolveModel = async (keys: string[], mode: string, manualModel?: string) => {
    if (keys.length === 0) return;
    const activeKey = keys[0];
    
    if (mode === MODEL_MODES.AUTO) {
      setModelStatusMsg({ type: 'info', text: "Đang kiểm tra model khả dụng…" });
      try {
        const resolved = await autoResolveModel(user?.uid, activeKey, true); // force re-check
        setResolvedModelDisplay(resolved);
        setModelStatusMsg({ type: 'success', text: `API Key hợp lệ — sử dụng ${resolved}` });
      } catch (error: any) {
        let errText = "Không thể kiểm tra model.";
        if (error.message === "INVALID_KEY") errText = "Gemini API Key không hợp lệ.";
        else if (error.message === "RATE_LIMIT") errText = "Gemini API Key hiện đã đạt giới hạn sử dụng. Vui lòng thử lại sau.";
        else if (error.message === "NETWORK") errText = "Không thể kiểm tra danh sách model. Vui lòng kiểm tra kết nối mạng.";
        else if (error.message === "NO_COMPATIBLE_MODEL") errText = "Không tìm thấy model Gemini phù hợp với API Key này.";
        setModelStatusMsg({ type: 'error', text: errText });
      }
    } else if (mode === MODEL_MODES.MANUAL && manualModel) {
      setModelStatusMsg({ type: 'info', text: "Đang kiểm tra model khả dụng…" });
      try {
        const isValid = await validateGeminiModel(activeKey, manualModel);
        if (!isValid) {
          setModelStatusMsg({ type: 'error', text: "Mô hình này không khả dụng với Gemini API Key hiện tại. Vui lòng chọn model khác hoặc chuyển sang chế độ Tự động." });
        } else {
          setModelStatusMsg({ type: 'success', text: `Mô hình ${manualModel} hợp lệ và sẵn sàng.` });
        }
      } catch (error) {
        // Fallback error msg
        setModelStatusMsg({ type: 'error', text: "Không thể xác minh mô hình với API Key này." });
      }
    }
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === MODEL_MODES.AUTO) {
      setGeminiModelMode(MODEL_MODES.AUTO);
      setUserStorageItem(user?.uid, 'gemini_model_mode', MODEL_MODES.AUTO);
      await verifyAndResolveModel(keysList, MODEL_MODES.AUTO);
    } else {
      setGeminiModelMode(MODEL_MODES.MANUAL);
      setGeminiModel(val);
      setUserStorageItem(user?.uid, 'gemini_model_mode', MODEL_MODES.MANUAL);
      setUserStorageItem(user?.uid, 'ocr_model', val);
      await verifyAndResolveModel(keysList, MODEL_MODES.MANUAL, val);
    }
  };

  // Lưu khoá API
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputKeys = apiKeyInput
      .split(/[\n,]+/)
      .map(k => k.trim())
      .filter(Boolean);

    if (inputKeys.length === 0) return;

    // Check and save metadata for each inputted key
    for (const key of inputKeys) {
      try {
        await checkAndSaveKeyMetadata(key, user?.uid);
      } catch (err) {
        console.error("Failed to check metadata for key", err);
      }
    }

    const newKeys = inputKeys.filter(k => !keysList.includes(k));

    if (newKeys.length > 0) {
      const updatedKeys = [...keysList, ...newKeys];
      setKeysList(updatedKeys);
      setUserStorageItem(user?.uid, 'gemini_keys', JSON.stringify(updatedKeys));
      setUserGeminiKey(updatedKeys[0] || '');
      setApiKeyInput("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);

      // Verify model with the new key
      await verifyAndResolveModel(updatedKeys, geminiModelMode, geminiModel);
    } else {
      setApiKeyInput("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      await verifyAndResolveModel(keysList, geminiModelMode, geminiModel);
    }
  };

  const handleDeleteKey = (index: number) => {
    const updatedKeys = keysList.filter((_, i) => i !== index);
    setKeysList(updatedKeys);
    setUserStorageItem(user?.uid, 'gemini_keys', JSON.stringify(updatedKeys));
    setUserGeminiKey(updatedKeys[0] || '');

    // If all keys removed, reset resolver state and UI indicators
    if (updatedKeys.length === 0) {
      // Clear resolver cache, selected model, and force auto mode
      resetModelResolverState(user?.uid);
      setResolvedModelDisplay('');
      setModelStatusMsg(null);
      setGeminiModelMode(MODEL_MODES.AUTO);
    }
  };

  return (
    <div id="settings-view" className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
          <Settings className="h-6 w-6 text-slate-700" />
          <span>Cài đặt hệ thống</span>
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Gemini API Key được lưu trên trình duyệt của bạn và dùng trực tiếp để OCR, không gửi qua máy chủ LexOCR.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* PANEL TRÁI: CẤU HÌNH API KEY - 7 CỘT */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Key className="h-5 w-5 text-red-650 text-red-600" />
              <span>Cấu hình Gemini API Key cá nhân</span>
            </h3>

            {/* A. Thêm Gemini API Key */}
            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-650 text-slate-600 uppercase mb-1.5 tracking-wide">
                  Nhập thêm Gemini API Keys mới
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <textarea
                    rows={3}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Dán một hoặc nhiều Gemini API Key vào đây.&#10;Mỗi key trên một dòng hoặc phân tách bằng dấu phẩy."
                    className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-lg py-2.5 pl-3.5 pr-3.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all resize-y"
                  />
                </div>
              </div>

              {/* Trạng thái lưu trữ của Token */}
              <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Lưu an toàn ở LocalStorage, không truyền qua cookies bên thứ ba.</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                {/* B. Trạng thái và danh sách key */}
                {keysList.length > 0 ? (
                  <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-1.5 rounded-md font-semibold flex items-center space-x-1">
                    <span>🟢</span>
                    <span>Đã sẵn sàng sử dụng</span>
                  </span>
                ) : (
                  <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-600 px-3 py-1.5 rounded-md font-semibold flex items-center space-x-1">
                    <span>🟠</span>
                    <span>Chưa cấu hình Gemini API Key</span>
                  </span>
                )}

                <button
                  type="submit"
                  disabled={!apiKeyInput.trim()}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all transform flex items-center space-x-1.5 cursor-pointer shadow-sm border ${
                    saveSuccess 
                      ? "bg-emerald-600 text-white border-emerald-500 scale-95" 
                      : "bg-slate-900 border-slate-850 hover:bg-slate-800 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="h-4 w-4 animate-scale" />
                      <span>Đã thêm khóa thành công!</span>
                    </>
                  ) : (
                    <span>Thêm và lưu Key</span>
                  )}
                </button>
              </div>
            </form>

            {/* DANH SÁCH KEY ĐÃ LƯU */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-650 text-slate-600 uppercase tracking-wide">
                Danh sách Keys hiện có ({keysList.length})
              </label>
              {keysList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có API Key nào được nhập.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {keysList.map((key, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-slate-400 font-bold text-[10px]">Gemini Key #{index + 1}</span>
                        <code className="font-mono text-slate-700 font-semibold bg-white px-1.5 py-0.5 border border-slate-150 rounded">
                          {key.length > 12 ? `${key.substring(0, 8)}...${key.slice(-4)}` : key}
                        </code>
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded text-[9px] font-bold">
                            Chính
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(index)}
                        className="p-1 text-slate-450 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Xóa khóa này"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* C. Cấu hình model */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-650 text-slate-600 uppercase tracking-wide">
                Gemini Model
              </label>
              <select 
                value={geminiModelMode === MODEL_MODES.AUTO ? "auto" : geminiModel}
                onChange={handleModelChange}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value="auto">Tự động chọn model phù hợp (Khuyến nghị)</option>
                {visibleManualModels.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              
              {modelStatusMsg?.type === 'error' && (
                <div className="mt-2 text-[11px] font-medium p-2 rounded-lg border bg-red-50 text-red-600 border-red-200">
                  {modelStatusMsg.text}
                  {geminiModelMode === MODEL_MODES.MANUAL && (
                    <button 
                      onClick={() => handleModelChange({ target: { value: MODEL_MODES.AUTO } } as any)}
                      className="ml-2 underline font-bold"
                    >
                      Chuyển sang Tự động
                    </button>
                  )}
                </div>
              )}
              {modelStatusMsg?.type === 'info' && modelStatusMsg.text === "Đang kiểm tra model khả dụng…" && (
                <div className="mt-2 text-[11px] font-medium p-2 rounded-lg border bg-blue-50 text-blue-600 border-blue-200">
                  {modelStatusMsg.text}
                </div>
              )}
              {modelStatusMsg?.type !== 'error' && modelStatusMsg?.text !== "Đang kiểm tra model khả dụng…" && (
                <div className={`mt-2 p-3 rounded-lg border ${
                  (geminiModelMode === MODEL_MODES.AUTO && resolvedModelDisplay) 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : (!geminiModelMode || (geminiModelMode === MODEL_MODES.MANUAL && !geminiModel))
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
              {keysList.length === 0 ? (
                <>
                  <div className="text-[12px] font-bold text-slate-700 mb-1">
                    Chưa có API Key
                  </div>
                  <div className="text-[10px] text-slate-500 leading-snug">
                    Vui lòng cấu hình API Key để hệ thống có thể xác định model.
                  </div>
                </>
              ) : geminiModelMode === MODEL_MODES.AUTO ? (
                resolvedModelDisplay ? (
                  <>
                    <div className="text-[12px] font-bold text-emerald-700 flex items-center mb-1">
                      <span className="mr-1.5">🟢</span> Model đang sử dụng
                    </div>
                    <div className="text-[14px] font-black text-emerald-800 mb-1">
                      {resolvedModelDisplay.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </div>
                    <div className="text-[10px] text-emerald-600 leading-snug">
                      Model này được LexOCR tự động lựa chọn dựa trên API Key của bạn.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[12px] font-bold text-blue-700 mb-1">
                      Model sẽ tự động được xác định khi bạn sử dụng API Key lần đầu.
                    </div>
                    <div className="text-[10px] text-blue-600 leading-snug">
                      Sau khi xác định, LexOCR sẽ ghi nhớ model phù hợp cho API Key này và tự động sử dụng trong các lần OCR tiếp theo.
                    </div>
                  </>
                )
              ) : geminiModelMode === MODEL_MODES.MANUAL && geminiModel ? (
                    <>
                      <div className="text-[12px] font-bold text-blue-700 mb-1">
                        Bạn đang sử dụng model do mình lựa chọn.
                      </div>
                      <div className="text-[14px] font-black text-blue-800 mb-1">
                        {geminiModel.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </div>
                      {geminiModel === "gemini-3.5-flash" && (
                        <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded leading-normal">
                          ⚠️ Model này chưa được LexOCR xác nhận ổn định cho OCR tài liệu dài.
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-[12px] font-bold text-slate-700 mb-1">
                        Chưa xác định được model Gemini.
                      </div>
                      <div className="text-[10px] text-slate-500 leading-snug">
                        Hệ thống sẽ tự động xác định khi bạn bắt đầu OCR.
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Khối hướng dẫn / lưu ý */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-750 text-slate-800 flex items-center space-x-1.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>Lưu ý khi sử dụng:</span>
              </h4>
              <ul className="list-disc pl-5 text-[10.5px] text-slate-500 space-y-1.5 leading-relaxed">
                <li>Key được dùng trực tiếp để OCR và trích xuất dữ liệu.</li>
                <li>Bạn có thể tạo Gemini API Key miễn phí tại Google AI Studio.</li>
                <li>Nếu chưa có key, hệ thống chỉ khả dụng với các tính năng dự phòng hiện có.</li>
              </ul>
            </div>

            {/* Liên kết hướng dẫn */}
            <div className="flex justify-center pt-4 pb-2">
              <a 
                href="/knowledge/huong-dan-tao-gemini-api-key"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/knowledge/huong-dan-tao-gemini-api-key');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="inline-flex items-center text-[13px] text-blue-600 hover:text-blue-700 hover:underline font-semibold transition-colors"
              >
                📖 Xem hướng dẫn tạo Gemini API Key
              </a>
            </div>
          </div>
        </div>

        {/* PANEL PHẢI: QUẢN LÝ GÓI THÀNH VIÊN - 5 CỘT */}
        <div className="md:col-span-5 space-y-6">
          {/* CARD TÀI KHOẢN */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <User className="h-5 w-5 text-slate-700" />
              <span>TÀI KHOẢN</span>
            </h3>

            {user ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Avatar" 
                      className="h-14 w-14 rounded-full border border-slate-200 object-cover shadow-sm" 
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-yellow-400">
                      {(user.displayName || user.email || "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h4 className="font-extrabold text-base text-slate-900 truncate">
                      {user.displayName || user.email?.split("@")[0] || "User"}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="pt-1 space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50 border-dashed text-xs">
                    <span className="text-slate-600 font-medium">Gói hiện tại</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-black ${
                      isPro 
                        ? "bg-amber-50 text-amber-700 border border-amber-200" 
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {isPro ? (planType === "year" ? "PRO Năm" : "PRO Tháng") : "FREE"}
                    </span>
                  </div>

                  {isPro && expiredAt && (
                    <>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50 border-dashed text-xs">
                        <span className="text-slate-600 font-medium flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                          Ngày hết hạn
                        </span>
                        <span className="font-bold text-slate-900">
                          {(() => {
                            const dateObj = new Date(expiredAt);
                            const dd = String(dateObj.getDate()).padStart(2, '0');
                            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const yyyy = dateObj.getFullYear();
                            return `${dd}/${mm}/${yyyy}`;
                          })()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50 border-dashed text-xs">
                        <span className="text-slate-600 font-medium">Thời gian còn lại</span>
                        <span className={`font-bold ${
                          (() => {
                            const diff = Math.ceil((expiredAt - Date.now()) / (1000 * 60 * 60 * 24));
                            return diff <= 7 ? 'text-rose-600' : 'text-emerald-600';
                          })()
                        }`}>
                          {(() => {
                            const diff = Math.ceil((expiredAt - Date.now()) / (1000 * 60 * 60 * 24));
                            return diff > 0 ? `${diff} ngày` : 'Hết hạn';
                          })()}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab("upgrade")}
                  className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                  <span>Quản lý gói thành viên</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-800">Bạn chưa đăng nhập.</p>
                
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-medium">Đăng nhập để:</p>
                  <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                    <li className="flex items-center space-x-1.5">
                      <span className="text-emerald-500">✓</span>
                      <span>Lưu Gemini API Key</span>
                    </li>
                    <li className="flex items-center space-x-1.5">
                      <span className="text-emerald-500">✓</span>
                      <span>Đồng bộ gói thành viên</span>
                    </li>
                    <li className="flex items-center space-x-1.5">
                      <span className="text-emerald-500">✓</span>
                      <span>Quản lý giấy phép sử dụng</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={loginWithGoogle}
                  disabled={loading}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-200 flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.6-4.53-5.67-4.53z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>{loading ? "Đang xử lý..." : "Đăng nhập Google"}</span>
                </button>
              </div>
            )}
          </div>

          {/* CARD QUYỀN LỢI */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Award className="h-5 w-5 text-amber-500" />
              <span>{user && isPro ? "Quyền lợi gói hiện tại" : "So sánh quyền lợi nghiệp vụ"}</span>
            </h3>

            {/* LỰA CHỌN CẤP ĐỘ (TEST) */}
            {!user ? (
              <div className="space-y-3.5 pt-1 text-xs">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Bóc tách tài liệu không giới hạn trang</span>
                    <div className="flex space-x-4">
                      <span className="text-slate-400 font-mono">15 trang</span>
                      <span className="text-amber-600 font-bold font-mono">Vô hạn</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Xuất kết xuất thô (.TXT)</span>
                    <div className="flex space-x-4">
                      <span className="text-emerald-600 font-bold">Free</span>
                      <span className="text-emerald-600 font-bold">Pro</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Xuất Word DOCX lề chuẩn Nghị định 30</span>
                    <div className="flex space-x-4">
                      <span className="text-rose-500 font-medium">Khóa</span>
                      <span className="text-amber-600 font-bold">Pro</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Trích xuất bảng Excel theo mẫu trường tùy chỉnh</span>
                    <div className="flex space-x-4">
                      <span className="text-rose-500 font-medium">Khóa</span>
                      <span className="text-amber-600 font-bold">Pro</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : isPro ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700">✓ Gói hiện tại</span>
                  <span className="px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-black bg-amber-50 text-amber-700 border border-amber-200">
                    {planType === "year" ? "PRO Năm" : "PRO Tháng"}
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 pt-2">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>OCR không giới hạn</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Xuất TXT</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Xuất Word chuẩn Nghị định 30</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Trích xuất Excel theo biểu mẫu</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3.5 pt-1 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 mb-2">
                  <span className="text-xs font-bold text-slate-700">✓ Gói hiện tại</span>
                  <span className="px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-black bg-slate-100 text-slate-600 border border-slate-200">
                    FREE
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Bóc tách tài liệu không giới hạn trang</span>
                    <div className="flex space-x-4">
                      <span className="text-slate-400 font-mono">15 trang</span>
                      <span className="text-amber-600 font-bold font-mono">Vô hạn</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Xuất kết xuất thô (.TXT)</span>
                    <div className="flex space-x-4">
                      <span className="text-emerald-600 font-bold">Free</span>
                      <span className="text-emerald-600 font-bold">Pro</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Xuất Word DOCX lề chuẩn Nghị định 30</span>
                    <div className="flex space-x-4">
                      <span className="text-rose-500 font-medium">Khóa</span>
                      <span className="text-amber-600 font-bold">Pro</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Trích xuất bảng Excel theo mẫu trường tùy chỉnh</span>
                    <div className="flex space-x-4">
                      <span className="text-rose-500 font-medium">Khóa</span>
                      <span className="text-amber-600 font-bold">Pro</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CTA để chuyển về Scanner trải nghiệm */}
            <button
              onClick={() => setActiveTab("scanner")}
              className="w-full bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>Quay lại bóc tách tài liệu</span>
            </button>
          </div>

          {/* NÚT ĐĂNG XUẤT */}
          {user && (
            <div className="pt-1">
              <button
                onClick={async () => {
                  await logout();
                  setActiveTab("landing");
                }}
                className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-colors font-semibold text-xs cursor-pointer animate-fade-in"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}