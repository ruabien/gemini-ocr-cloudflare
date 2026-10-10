/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  Copy,
  Check
} from "lucide-react";
import { OcrDocument } from "../types";
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
  setActiveTab: (tab: string) => void;
}
export default function OcrEditor({
  document,
  onBack,
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
  const [isEncryptActive, setIsEncryptActive] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

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
}, [document?.name, document?.content]);

  // Copy All (Free for everyone)
  const handleCopyAll = async () => {
    const text = editorText || "";
    if (!text.trim()) {
      alert("Không có nội dung để sao chép.");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = window.document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        window.document.body.prepend(textArea);
        textArea.select();
        try {
          window.document.execCommand("copy");
        } catch (error) {
          console.error("execCommand fallback failed", error);
        } finally {
          textArea.remove();
        }
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
      alert("Có lỗi xảy ra khi sao chép.");
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
      className="space-y-6 w-full overflow-x-hidden"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-600 transition-colors cursor-pointer flex-shrink-0"
            title="Quay lại scanner"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center truncate">
              <FileText className="h-4.5 w-4.5 text-red-600 mr-2 flex-shrink-0" />
              <span className="truncate">Workspace: {document.name}</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-medium truncate">
              Định dạng: <span className="text-slate-700 font-bold">{fileType}</span>{" "}
              • {resolution} • Người tải: {uploader}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full lg:w-auto flex flex-wrap items-center gap-2 mt-2 lg:mt-0">
          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={handleCopyAll}
              className="flex-1 sm:flex-none sm:w-[115px] px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm min-h-[40px] sm:min-h-0 transition-all bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent"
            >
              {isCopied ? <Check className="h-4 w-4 flex-shrink-0" /> : <Copy className="h-4 w-4 flex-shrink-0" />}
              <span className="truncate">{isCopied ? "Đã copy" : "Copy"}</span>
            </button>
          </div>

          <div className="hidden sm:block w-px h-5 bg-slate-300 mx-1"></div>

          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={handleExportTxt}
              className="flex-1 sm:flex-none sm:w-[115px] bg-slate-900 hover:bg-slate-800 border border-transparent text-white px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm min-h-[40px] sm:min-h-0"
              title="Xuất văn bản thô (.TXT)"
            >
              <Download className="h-4 w-4 text-slate-350 flex-shrink-0" />
              <span className="truncate">Xuất Text</span>
            </button>

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
        {/* Left column: preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Tài liệu gốc
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
              Độ chính xác OCR
            </h4>
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-150">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Độ chính xác bóc tách
                </p>
                <p
                  className={
                    accuracy === null || accuracy === undefined
                      ? "text-base font-mono font-black text-slate-500 mt-0.5"
                      : "text-xl font-mono font-black text-emerald-600 mt-0.5"
                  }
                >
                  {accuracy === null || accuracy === undefined
                    ? "Chưa đo được"
                    : `${accuracy}%`}
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
            <div className="bg-slate-50 p-3 sm:px-4 border-b border-slate-200 flex items-center">
              <div className="flex items-center gap-2.5">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wider">
                  KẾT QUẢ OCR
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 sm:py-1 rounded font-mono border border-slate-300 w-fit">
                  Times New Roman • 14pt (Nghị định 30)
                </span>
              </div>
            </div>

            {/* Editable area */}
            <div className="p-4 sm:p-8 bg-white focus:outline-none">
              {!editorText ? (
                <div className="text-slate-400 italic mb-2">
                  Chưa có nội dung OCR để hiển thị.
                </div>
              ) : null}
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                className="legal-editor w-full min-h-[440px] max-h-[500px] overflow-y-auto resize-none bg-white focus:outline-none leading-[1.5] text-justify text-[13pt] sm:text-[14pt] text-black"
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  lineHeight: '1.5',
                  color: '#000000'
                }}
              />
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs flex items-center justify-between text-slate-500 font-medium">
              <span className="flex items-center space-x-1.5 text-emerald-600 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Đã sẵn sàng xuất bản</span>
              </span>
              <span className="font-mono">
                Số ký tự: {editorText.length}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}