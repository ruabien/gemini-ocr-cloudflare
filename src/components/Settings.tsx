/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Settings, Key, ShieldCheck, Eye, EyeOff, Check, CreditCard, 
  Sparkles, Award, Zap, AlertCircle, RefreshCw, X, Shield, Cloud, Trash2
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getUserStorageItem, setUserStorageItem } from "../utils/userStorage";

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
  const { user } = useAuth();
  
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
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [geminiModel, setGeminiModel] = useState<string>(() => {
    const stored = getUserStorageItem(user?.uid, 'ocr_model');
    return stored || "gemini-2.5-flash";
  });

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setGeminiModel(model);
    setUserStorageItem(user?.uid, 'ocr_model', model);
  };

  // Lưu khoá API
  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const newKeys = apiKeyInput
      .split(/[\n,]+/)
      .map(k => k.trim())
      .filter(k => k && !keysList.includes(k));
    if (newKeys.length === 0) return;

    const updatedKeys = [...keysList, ...newKeys];
    setKeysList(updatedKeys);
    setUserStorageItem(user?.uid, 'gemini_keys', JSON.stringify(updatedKeys));
    setUserGeminiKey(updatedKeys[0] || '');
    setApiKeyInput("");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDeleteKey = (index: number) => {
    const updatedKeys = keysList.filter((_, i) => i !== index);
    setKeysList(updatedKeys);
    setUserStorageItem(user?.uid, 'gemini_keys', JSON.stringify(updatedKeys));
    setUserGeminiKey(updatedKeys[0] || '');
  };

  return (
    <div id="settings-view" className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
          <Settings className="h-6 w-6 text-slate-700" />
          <span>Cài đặt hệ thống & Gói thành viên</span>
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Quản lý tài khoản, cấu hình Khóa mật Gemini API cá nhân và tùy chọn cấp độ tài khoản nghiệp vụ.
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

            <p className="text-xs text-slate-500 leading-relaxed">
              Theo quy định quốc gia về an toàn thông tin nghiệp vụ tư pháp, Sovereign Lawtech hỗ trợ bóc tách tài liệu thông qua API cá nhân của người dùng nhằm đảm bảo tính độc lập tối đa và bảo vệ tuyệt đối bí mật công vụ.
            </p>

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
                    placeholder="Nhập các Gemini API Key, cách nhau bằng dấu phẩy hoặc dòng mới"
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
                {keysList.length > 0 ? (
                  <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-600 px-2.5 py-1 rounded-md font-bold font-mono tracking-wider flex items-center space-x-1">
                    <Check className="h-3.5 w-3.5" />
                    <span>ĐÃ NẠP {keysList.length} KEYS</span>
                  </span>
                ) : (
                  <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-600 px-2.5 py-1 rounded-md font-bold font-mono tracking-wider flex items-center space-x-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>CHƯA CÓ KEY</span>
                  </span>
                )}

                <button
                  type="submit"
                  disabled={!apiKeyInput.trim()}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all transform flex items-center space-x-1.5 cursor-pointer shadow-sm border ${
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
                        <span className="font-mono text-slate-400 font-bold text-[10px]">#{index + 1}</span>
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
                        className="p-1 text-slate-450 hover:text-red-650 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                        title="Xóa khóa này"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CẤU HÌNH MODEL GEMINI */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-650 text-slate-600 uppercase tracking-wide">
                Gemini Model
              </label>
              <select
                value={geminiModel}
                onChange={handleModelChange}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-lg py-2.5 pl-3.5 pr-3.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all cursor-pointer"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Mặc định)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Mới nhất)</option>
              </select>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-slate-750 text-slate-800 flex items-center space-x-1.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>Lưu ý khi sử dụng:</span>
              </h4>
              <ul className="list-disc pl-4 text-[10.5px] text-slate-500 space-y-1.5 leading-relaxed">
                <li>Key được sử dụng trực tiếp để gửi truy vấn OCR/Phân tích tới mô hình <code className="font-mono text-slate-850 bg-slate-200 px-1 py-0.5 rounded">{geminiModel}</code>.</li>
                <li>Bạn có thể lấy Gemini API Key hoàn toàn miễn phí từ <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-red-650 text-red-600 font-bold hover:underline">Google AI Studio</a>.</li>
                <li>Nếu chưa cấu hình Key, hệ thống sẽ chỉ khả dụng cho các tệp hồ sơ mẫu pháp quy có sẵn.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* PANEL PHẢI: QUẢN LÝ GÓI THÀNH VIÊN - 5 CỘT */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Award className="h-5 w-5 text-amber-500" />
              <span>Cấp độ tài khoản</span>
            </h3>

            {/* Trạng thái hiện tại */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800 flex items-center space-x-1.5">
                  <span>Cấp độ hiện tại:</span>
                  {membershipRole === "Pro" ? (
                    <span className="text-amber-600 font-bold">Pro</span>
                  ) : (
                    <span className="text-slate-600 font-bold">Free</span>
                  )}
                </p>
                {membershipRole === "Pro" && (
                  <p className="text-xs text-slate-500 mt-1">Ngày hết hạn: Chưa cấu hình</p>
                )}
              </div>
              <div>
                {membershipRole === "Free" ? (
                  <button 
                    onClick={() => setActiveTab("upgrade")}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm"
                  >
                    Nâng cấp Pro
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveTab("upgrade")}
                    className="w-full sm:w-auto bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                  >
                    Quản lý gói Pro
                  </button>
                )}
              </div>
            </div>

            {/* LỰA CHỌN CẤP ĐỘ (TEST) */}
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Test cấp độ giao diện:</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setMembershipRole("Free")}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    membershipRole === "Free"
                      ? "border-slate-800 bg-slate-50 text-slate-900 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className="text-xs font-bold uppercase">Free</span>
                  {membershipRole === "Free" && <Check className="h-3.5 w-3.5" />}
                </div>

                <div 
                  onClick={() => setMembershipRole("Pro")}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    membershipRole === "Pro"
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className="text-xs font-bold uppercase">Pro</span>
                  {membershipRole === "Pro" && <Check className="h-3.5 w-3.5 text-amber-600" />}
                </div>
              </div>
            </div>

            {/* BẢNG SO SÁNH QUYỀN LỢI */}
            <div className="space-y-3.5 border-t border-slate-100 pt-4 text-xs">
              <p className="font-bold text-slate-700 text-xs uppercase tracking-wider">So sánh quyền lợi nghiệp vụ:</p>
              
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
                    <span className="text-slate-450 text-rose-500 font-medium">Khóa</span>
                    <span className="text-amber-600 font-bold">Pro</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-medium">Trích xuất bảng Excel theo mẫu trường tùy chỉnh</span>
                  <div className="flex space-x-4">
                    <span className="text-slate-450 text-rose-500 font-medium">Khóa</span>
                    <span className="text-amber-600 font-bold">Pro</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA để chuyển về Scanner trải nghiệm */}
            <button
              onClick={() => setActiveTab("ocr")}
              className="w-full bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>Trải nghiệm bóc tách ngay</span>
            </button>
          </div>
        </div>

      </div>


    </div>
  );
}
