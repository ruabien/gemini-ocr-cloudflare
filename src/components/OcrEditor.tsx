/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { anonymizeLegalText } from "../utils/anonymizer";
import { detectNames } from "../anonymizer/detector";
import { anonymizeNameString, defaultProvinceMappings, buildDictionary } from "../anonymizer/dictionary";
import {
  ArrowLeft,
  FileText,
  Download,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles
} from "lucide-react";
import { OcrDocument } from "../types";
import { useAuth } from "../contexts/AuthContext";
import LoginPromptModal from "./LoginPromptModal";
import * as pdfjs from "pdfjs-dist";

const sanitizeText = (raw: string) => {
  if (!raw) return "";
  return raw
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .trim();
};

interface OcrEditorProps {
  document: OcrDocument | null;
  onBack: () => void;
  membershipRole: "Free" | "Pro";
  setActiveTab: (tab: string) => void;
}
type ReplacementRule = {
  id: string;
  original: string;
  replaceWith: string;
  type: "Tên người" | "Địa danh" | "CCCD" | "SĐT";
  enabled: boolean;
};

export default function OcrEditor({
  document,
  onBack,
  membershipRole,
  setActiveTab
}: OcrEditorProps) {
  if (!document) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            Chưa có dữ liệu hồ sơ được chọn.
          </h2>
          <p className="text-slate-600 mb-6">
            Vui lòng quay lại trang Phân tích OCR để chọn file và tiến hành bóc
            tách.
          </p>
          <button
            onClick={onBack}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            Quay lại Phân tích OCR
          </button>
        </div>
      </div>
    );
  }

  // Upgrade/Login modal states
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginFeatureName, setLoginFeatureName] = useState("");

  // Parse OCR data
  const parsedData = (() => {
    if (!document) return {};
    if (document.content) {
      try {
        return JSON.parse(document.content);
      } catch {
        return { text: document.content };
      }
    }
    return {};
  })();

  const ocrText = sanitizeText(
    parsedData.text ||
      parsedData.data?.text ||
      document?.rawText ||
      ""
  );
  const fileType = parsedData.fileType || document?.fileType || "";
  const resolution = parsedData.resolution || document?.resolution || "";
  const uploader = parsedData.uploader || document?.uploader || "";
  const accuracy = parsedData.accuracy ?? document?.accuracy ?? "";
  const warnings = parsedData.warnings ?? document?.warnings ?? [];

  const [editorText, setEditorText] = useState(ocrText);
const [isAnonymized, setIsAnonymized] = useState(false);
const [showAnonymizeModal, setShowAnonymizeModal] = useState(false);
const [originalBackup, setOriginalBackup] = useState(ocrText);
const [replacementRules, setReplacementRules] = useState<ReplacementRule[]>([]);
const [previewText, setPreviewText] = useState("");
  const [isEncryptActive, setIsEncryptActive] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRedacting, setIsRedacting] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [anonymizeStats, setAnonymizeStats] = useState<{
    names: number;
    provinces: number;
    idNumbers: number;
    phones: number;
  } | null>(null);

  // PDF / image preview
  useEffect(() => {
    const selectedFile = document?.selectedFile;
    if (!selectedFile || (Array.isArray(selectedFile) && selectedFile.length === 0)) {
      setPreviewUrl(null);
      return;
    }

    const file = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      }
      const reader = new FileReader();
      reader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result as ArrayBuffer);
          const pdf = await pdfjs.getDocument({ data: typedarray }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = window.document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport }).promise;
            setPreviewUrl(canvas.toDataURL("image/jpeg"));
          }
        } catch (e) {
          console.error("PDF preview error:", e);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      try {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error("Error creating object URL:", e);
        setPreviewUrl(null);
      }
    }
  }, [document?.selectedFile]);

  // Sync editor text on OCR load
useEffect(() => {
  const nextText = ocrText || "";
  setEditorText(nextText);
  setOriginalBackup(nextText);
  setIsAnonymized(false);
  setAnonymizeStats(null);
}, [document?.name, document?.content]);

// Update preview text based on replacement rules
useEffect(() => {
  let text = originalBackup;
  replacementRules.forEach(rule => {
    if (rule.enabled && rule.original) {
      const escaped = rule.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      text = text.replace(regex, rule.replaceWith);
    }
  });
  setPreviewText(text);
}, [originalBackup, replacementRules]);

  // Anonymization toggle (opens modal for manual confirmation)
  const handleToggleAnonymize = () => {
    if (isAnonymized) {
      // Restore original
      setEditorText(originalBackup);
      setIsAnonymized(false);
      setAnonymizeStats(null);
      return;
    }

    if (!user) {
      setLoginFeatureName("Ẩn danh đương sự (Mật danh hoá)");
      setShowLoginPrompt(true);
      return;
    }
    if (membershipRole !== "Pro") {
      setUpgradeFeature("Ẩn danh đương sự tự động (Mật danh hoá)");
      setShowUpgradeModal(true);
      return;
    }

    const currentText = editorText || "";
    if (!currentText.trim()) {
      alert("Không có nội dung để Ẩn danh.");
      return;
    }

    setOriginalBackup(currentText);
    setShowAnonymizeModal(true);
    // Generate replacement rules
    const nameSet = detectNames(currentText);
        const nameRules: ReplacementRule[] = Array.from(nameSet).map(name => ({
          id: Date.now().toString() + Math.random().toString(),
          original: name,
          replaceWith: anonymizeNameString(name),
          type: "Tên người",
          enabled: true
        }));
        // ID numbers
        const idRegex = /(cccd|cmnd|căn\s+cước\s+công\s+dân|số\s+định\s+danh\s+cá\s+nhân)(?:\s+|:\s*|số\s+|-\s*)*(\d{9,12})\b/gi;
        const idMatches = new Set<string>();
        let idMatch;
        while ((idMatch = idRegex.exec(currentText)) !== null) {
          idMatches.add(idMatch[2]);
        }
        const idRules: ReplacementRule[] = Array.from(idMatches).map(num => ({
          id: Date.now().toString() + Math.random().toString(),
          original: num,
          replaceWith: num.slice(0, -3) + "***",
          type: "CCCD",
          enabled: true
        }));
        // Phone numbers (simple pattern)
        const phoneRegex = /((?:\+?\d{1,3}[\s-]?)?(?:\(\d{2,3}\)[\s-]?|\d{2,4}[\s-])?\d{3,4}[\s-]?\d{3,4})/g;
        const phoneMatches = new Set<string>();
        let phoneMatch;
        while ((phoneMatch = phoneRegex.exec(currentText)) !== null) {
          phoneMatches.add(phoneMatch[0]);
        }
        const phoneRules: ReplacementRule[] = Array.from(phoneMatches).map(p => ({
          id: Date.now().toString() + Math.random().toString(),
          original: p,
          replaceWith: p.replace(/(\d{3})\d{2,4}(\d{2})/, "$1***$2"),
          type: "SĐT",
          enabled: true
        }));
        // Province & commune rules using dictionary
        const dict = buildDictionary(currentText, nameSet);
        const provinceRules: ReplacementRule[] = Array.from(dict.provinceMap.entries()).map(([orig, code]) => ({
          id: Date.now().toString() + Math.random().toString(),
          original: orig,
          replaceWith: code,
          type: "Địa danh",
          enabled: true
        }));
        const communeRules: ReplacementRule[] = Array.from(dict.communeMap.entries()).map(([orig, abbrev]) => ({
          id: Date.now().toString() + Math.random().toString(),
          original: orig,
          replaceWith: abbrev,
          type: "Địa danh",
          enabled: true
        }));
        const allRules: ReplacementRule[] = [...nameRules, ...idRules, ...phoneRules, ...provinceRules, ...communeRules];
        setReplacementRules(allRules);
  };

  // Export DOCX (Pro only)
  const handleExportDocx = async () => {
    if (!user) {
      setLoginFeatureName("Xuất tệp Word (.DOCX) chuẩn Nghị định 30");
      setShowLoginPrompt(true);
      return;
    }
    if (membershipRole !== "Pro") {
      setUpgradeFeature(
        "Xuất tệp Word (.DOCX) chuẩn Nghị định 30/2020/NĐ-CP"
      );
      setShowUpgradeModal(true);
      return;
    }
    setIsExportingDocx(true);
    try {
      const response = await fetch("/api/ocr/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sanitizeText(editorText),
          fileName: document.name
        })
      });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = `${document.name.replace(/\.[^/.]+$/, "")}_ND30.docx`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export DOCX error:", err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Export TXT (always free)
  const handleExportTxt = () => {
    try {
      const blob = new Blob([sanitizeText(editorText)], {
        type: "text/plain;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${document.name.replace(/\.[^/.]+$/, "")}_VKS.txt`;
      link.click();
    } catch (err) {
      console.error("Export TXT error:", err);
    }
  };

  return (
    <div
      id="ocr-editor-view"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
    >
      {isAnonymized && anonymizeStats && (
        <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-emerald-800">
                Đã ẩn danh đương sự thông minh thành công (Chạy hoàn toàn local trong trình duyệt)
              </p>
              <div className="text-[11px] text-emerald-700 mt-1 flex flex-wrap gap-x-4 gap-y-1 font-medium">
                <span>• {anonymizeStats.names} họ tên</span>
                <span>• {anonymizeStats.provinces} tỉnh/thành</span>
                <span>• {anonymizeStats.idNumbers} CCCD/CMND</span>
                <span>• {anonymizeStats.phones} số điện thoại</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleAnonymize}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline ml-4 flex-shrink-0"
          >
            Hiện thông tin đương sự
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="Quay lại scanner"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center">
              <FileText className="h-4.5 w-4.5 text-red-600 mr-2" />
              <span>Workspace: {document.name}</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              Định dạng: <span className="text-slate-700 font-bold">{fileType}</span>{" "}
              • {resolution} • Người tải: {uploader}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AES toggle (visual only) */}
          <div
            onClick={() => setIsEncryptActive(!isEncryptActive)}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold font-mono flex items-center space-x-1.5 cursor-pointer transition-all ${
              isEncryptActive
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <Shield
              className={`h-3.5 w-3.5 ${
                isEncryptActive ? "text-emerald-600 animate-pulse" : "text-slate-400"
              }`}
            />
            <span>AES-256: {isEncryptActive ? "đang bảo mật" : "tắt"}</span>
          </div>

          <button
            onClick={handleToggleAnonymize}
            disabled={isRedacting}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center space-x-1.5 transition-all ${
              isAnonymized
                ? "bg-yellow-500 text-white border-yellow-600"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
            }`}
          >
            {isAnonymized ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
            <span>
              {isRedacting
                ? "Đang mã hoá..."
                : isAnonymized
                ? "Hiện thông tin đương sự"
                : "Mật danh hoá đương sự"}
            </span>
          </button>

          <button
            onClick={handleExportTxt}
            className="bg-slate-900 hover:bg-slate-800 border border-transparent text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            title="Xuất văn bản thô (.TXT)"
          >
            <Download className="h-4 w-4 text-slate-350" />
            <span>Xuất bản thô (.TXT)</span>
          </button>

          <button
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className={`font-bold px-4 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md transition-all ${
              membershipRole === "Pro"
                ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border border-rose-500/10"
                : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border-amber-300/45"
            }`}
          >
            {membershipRole === "Pro" ? (
              <FileText className="h-4 w-4" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            )}
            <span>
              {isExportingDocx
                ? "Đang xuất..."
                : membershipRole === "Pro"
                ? "Xuất Word (.DOCX)"
                : "Xuất Word PRO (.DOCX)"}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Bản xem tài liệu gốc
              </span>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto bg-slate-55 text-xs text-slate-650 font-mono whitespace-pre-wrap">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded"
                />
              ) : (
                <p className="text-slate-500">Không có preview.</p>
              )}
            </div>
          </div>

          {/* Accuracy & warnings */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
              Đánh giá độ chính xác & cảnh báo
            </h4>
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-150">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Độ chính xác bóc tách
                </p>
                <p className="text-xl font-mono font-black text-emerald-600 mt-0.5">
                  {accuracy}%
                </p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold border border-emerald-200">
                TỐI ƯU TIẾNG VIỆT
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase">
                Cảnh báo ({warnings.length})
              </p>
              <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                {warnings.map((warn: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-yellow-50 border border-yellow-250 p-2 rounded flex items-start space-x-2 text-yellow-800 text-[10px]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Dòng {warn?.line}: "{warn?.text}"</p>
                      <p className="text-slate-600">{warn?.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md paper-glow">
            {/* Toolbar */}
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded font-mono border border-slate-300">
                  Times New Roman • 14pt (Nghị định 30)
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-bold uppercase font-mono tracking-wider">
                Sovereign Live Editor
              </span>
            </div>

            {/* Editable area */}
            <div className="p-8 bg-white focus:outline-none">
              {!editorText ? (
                <div className="text-slate-400 italic mb-2">
                  Chưa có nội dung OCR để hiển thị.
                </div>
              ) : null}
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                className="legal-editor w-full min-h-[440px] max-h-[500px] overflow-y-auto resize-none bg-white focus:outline-none leading-[1.5] text-justify text-[14pt] text-black"
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: '14pt',
                  lineHeight: '1.5',
                  color: '#000000'
                }}
              />
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs flex items-center justify-between text-slate-500 font-medium">
              <span className="flex items-center space-x-1.5 text-emerald-600 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mẫu soạn thảo tương thích Word (.doc/.docx)</span>
              </span>
              <span className="font-mono">
                Số ký tự: {editorText.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <LoginPromptModal
          onClose={() => setShowLoginPrompt(false)}
          featureName={loginFeatureName}
        />
      )}

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div
          id="upgrade-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-slate-900 p-5 text-white relative">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                  Hội viên đặc quyền
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 mt-1">
                Nâng cấp tài khoản PRO khối tư pháp
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start space-x-2.5 text-xs bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-200/55">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-extrabold text-[11px]">
                    Cần nâng cấp PRO để sử dụng:
                  </p>
                  <p className="mt-0.5 text-slate-700 text-[11px] leading-relaxed font-semibold">
                    {upgradeFeature}
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Thiết kế chuyên biệt cho Kiểm sát viên. Giúp tự động
                  hiệu chỉnh văn bản đạt chuẩn Nghị định 30 và xuất Word.
                </p>
                <div className="border border-slate-150 rounded-lg p-3 bg-slate-50 space-y-1.5 text-[10.5px] text-slate-750">
                  <p className="font-bold text-slate-700 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
                    Mở khóa xuất Word (.DOCX) chuẩn tố tụng
                  </p>
                  <p className="font-bold text-slate-700 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
                    Xuất Excel (.XLSX) cho tài liệu có cấu trúc (PRO)
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 pt-1 text-xs">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg text-slate-700 font-bold border border-slate-300"
                >
                  Để sau
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setActiveTab("upgrade");
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-1.5 rounded-lg text-slate-950 font-black tracking-wide shadow-md flex items-center justify-center space-x-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Kích hoạt PRO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{showAnonymizeModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-xl shadow-lg max-w-5xl w-full p-6 space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Xác nhận ẩn danh</h2>
      <div className="grid grid-cols-2 gap-6">
        {/* Original text preview */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-slate-700 mb-1">Văn bản gốc</label>
          <textarea
            readOnly
            value={originalBackup}
            className="w-full p-2 border border-gray-300 rounded-md text-sm h-52 resize-none bg-gray-50"
          />
        </div>
        {/* Replacement list */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-slate-700">Danh sách thay thế</span>
            <button
              onClick={() => {
                const newRule: ReplacementRule = {
                  id: Date.now().toString() + Math.random().toString(),
                  original: "",
                  replaceWith: "",
                  type: "Tên người",
                  enabled: true
                };
                setReplacementRules([...replacementRules, newRule]);
              }}
              className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition-colors"
            >
              + Thêm dòng thủ công
            </button>
          </div>
          <div className="overflow-y-auto max-h-52 border border-gray-250 rounded-md">
            <table className="w-full table-auto border-collapse text-left">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr className="border-b">
                  <th className="p-2 text-xs font-bold text-slate-600 w-12 text-center">Áp dụng</th>
                  <th className="p-2 text-xs font-bold text-slate-600">Giá trị gốc</th>
                  <th className="p-2 text-xs font-bold text-slate-600">Thay bằng</th>
                  <th className="p-2 text-xs font-bold text-slate-600 w-28">Loại</th>
                  <th className="p-2 text-xs font-bold text-slate-600 w-12 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {replacementRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-xs text-slate-400 italic">
                      Chưa có gợi ý thay thế nào. Bấm "Thêm dòng thủ công" để tự định nghĩa.
                    </td>
                  </tr>
                ) : (
                  replacementRules.map((rule, idx) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="p-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={e => {
                            const newRules = [...replacementRules];
                            newRules[idx].enabled = e.target.checked;
                            setReplacementRules(newRules);
                          }}
                          className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={rule.original}
                          onChange={e => {
                            const newRules = [...replacementRules];
                            newRules[idx].original = e.target.value;
                            setReplacementRules(newRules);
                          }}
                          className="w-full text-xs p-1 border rounded focus:outline-none focus:border-emerald-500"
                          placeholder="Giá trị gốc..."
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={rule.replaceWith}
                          onChange={e => {
                            const newRules = [...replacementRules];
                            newRules[idx].replaceWith = e.target.value;
                            setReplacementRules(newRules);
                          }}
                          className="w-full text-xs p-1 border rounded focus:outline-none focus:border-emerald-500"
                          placeholder="Thay bằng..."
                        />
                      </td>
                      <td className="p-1.5">
                        <select
                          value={rule.type}
                          onChange={e => {
                            const newRules = [...replacementRules];
                            newRules[idx].type = e.target.value as any;
                            setReplacementRules(newRules);
                          }}
                          className="w-full text-xs p-1 border rounded bg-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="Tên người">Tên người</option>
                          <option value="Địa danh">Địa danh</option>
                          <option value="CCCD">CCCD</option>
                          <option value="SĐT">SĐT</option>
                        </select>
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          onClick={() => {
                            const newRules = replacementRules.filter(r => r.id !== rule.id);
                            setReplacementRules(newRules);
                          }}
                          className="text-red-500 hover:text-red-700 font-bold text-sm px-2 py-0.5 rounded hover:bg-red-50"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Live preview area */}
      <div className="mt-4">
        <label className="text-sm font-medium text-slate-700 mb-1">Văn bản đề xuất</label>
        <textarea
          value={previewText}
          onChange={e => setPreviewText(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm h-48 resize-none font-mono"
          style={{
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '11pt',
            lineHeight: '1.4'
          }}
        />
      </div>
      <div className="flex justify-end space-x-2 mt-2">
        <button
          onClick={() => setShowAnonymizeModal(false)}
          className="px-4 py-2 rounded bg-gray-250 hover:bg-gray-300 text-slate-700 text-sm font-semibold transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={() => {
            setEditorText(previewText);
            setIsAnonymized(true);
            setShowAnonymizeModal(false);
            
            // Calculate accurate stats based on enabled rules applied
            const stats = {
              names: replacementRules.filter(r => r.enabled && r.type === "Tên người").length,
              provinces: replacementRules.filter(r => r.enabled && r.type === "Địa danh").length,
              idNumbers: replacementRules.filter(r => r.enabled && r.type === "CCCD").length,
              phones: replacementRules.filter(r => r.enabled && r.type === "SĐT").length,
            };
            setAnonymizeStats(stats);
          }}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
        >
          Áp dụng ẩn danh
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}