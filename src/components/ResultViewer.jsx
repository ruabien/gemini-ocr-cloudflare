/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Copy, Check, FileText, Download, AlertCircle } from 'lucide-react';
import { normalizeOcrText, cleanTextNewlines } from '../utils/textNormalizer';

export default function ResultViewer({ file, allFiles, onUpdateResult, onReset }) {
  const [copied, setCopied] = useState(false);
  const [localText, setLocalText] = useState("");

  const imageFiles = allFiles ? allFiles.filter(f => !f.isParentPdf && !f.isPdfPage) : [];
  const isMultiImage = imageFiles.length > 1;

  const parentPdf = file?.isParentPdf ? file : (allFiles && file?.parentPdfId ? allFiles.find(f => f.id === file.parentPdfId) : null);
  const pdfPages = parentPdf ? allFiles.filter(f => f.isPdfPage && f.parentPdfId === parentPdf.id) : [];
  const hasPdfResult = pdfPages.some(p => p.result && p.result.trim());

  const getMergedNormalizedText = () => {
    const merged = imageFiles
      .map(d => {
        if (d.status === 'error') {
          return `--- [CẢNH BÁO: File ${d.name} bị lỗi OCR, không có dữ liệu văn bản] ---`;
        }
        return (d.result || '').trim();
      })
      .filter(Boolean)
      .join('\n\n');
    return normalizeOcrText(merged);
  };

  const getPdfMergedNormalizedText = () => {
    if (!parentPdf) return "";
    const sortedPages = [...pdfPages].sort((a, b) => a.pageIndex - b.pageIndex);
    const merged = sortedPages
      .map(p => {
        if (p.status === 'error') {
          return `--- [CẢNH BÁO: File ${p.name} bị lỗi OCR, không có dữ liệu văn bản] ---`;
        }
        return (p.result || '').trim();
      })
      .filter(Boolean)
      .join('\n\n');
    return normalizeOcrText(merged);
  };

  useEffect(() => {
    if (file?.isParentPdf) {
      const merged = getPdfMergedNormalizedText();
      setLocalText(merged);
    } else {
      setLocalText(file?.result || "");
    }
  }, [file?.id, file?.result, allFiles, file?.isParentPdf]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant bg-surface rounded-xl border border-dashed border-outline-variant/60 min-h-[400px]">
        <FileText size={48} strokeWidth={1} className="mb-4 opacity-40 text-on-surface-variant" />
        <p className="text-on-surface-variant text-sm font-medium">Chọn một file đã hoàn thành để xem kết quả</p>
      </div>
    );
  }

  const handleCopy = async () => {
    if (isMultiImage || file.isParentPdf) return;
    if (!localText) return;
    const cleanText = normalizeOcrText(localText);
    try {
      await navigator.clipboard.writeText(cleanText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // Fallback
      const textSub = document.createElement("textarea");
      textSub.value = cleanText;
      document.body.appendChild(textSub);
      textSub.select();
      document.execCommand("Copy");
      textSub.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadTxtFile = (text, fileName) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportTxt = () => {
    if (parentPdf) {
      const processedText = getPdfMergedNormalizedText();
      if (!processedText) return;
      
      const originalName = parentPdf.originalFile?.name || parentPdf.name || 'tailieu_ocr.pdf';
      const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
      const fileName = `${baseName}_gop.txt`;
      
      const cleanedText = cleanTextNewlines(processedText);
      downloadTxtFile(cleanedText, fileName);
    } else if (isMultiImage) {
      const processedText = getMergedNormalizedText();
      if (!processedText) return;
      
      const firstImageFile = imageFiles[0];
      let fileName = "gop_all.txt";
      if (firstImageFile) {
        const originalName = firstImageFile.originalFile?.name || firstImageFile.name || 'anh';
        const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
        fileName = `${baseName}_gop_all.txt`;
      }
      
      const cleanedText = cleanTextNewlines(processedText);
      downloadTxtFile(cleanedText, fileName);
    } else {
      if (!localText) return;
      
      let processedText = normalizeOcrText(localText);
      const originalName = file.originalFile?.name || 'tailieu_ocr.txt';
      const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
      const fileName = `${baseName}.txt`;
      
      const cleanedText = cleanTextNewlines(processedText);
      downloadTxtFile(cleanedText, fileName);
    }
  };

  const handleChange = (e) => {
    if (file.isParentPdf) return;
    setLocalText(e.target.value);
    if (onUpdateResult) {
      onUpdateResult(file.id, e.target.value);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3.5 border-b border-slate-200/80 bg-slate-50/75 gap-3">
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <FileText size={16} className="text-primary shrink-0 animate-pulse" />
          <h3 className="font-bold text-xs sm:text-sm text-slate-800 truncate" title={file.originalFile?.name || 'Kết quả OCR'}>
            {file.originalFile?.name || file.name || 'Tài liệu'}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onReset && (
            <button
              onClick={onReset}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
              title="Làm mới toàn bộ hàng đợi và kết quả"
            >
              <span className="material-icons text-[14px] font-bold">refresh</span>
              <span>Làm mới</span>
            </button>
          )}
          <button
            onClick={handleExportTxt}
            disabled={
              parentPdf
                ? !hasPdfResult
                : (isMultiImage ? !getMergedNormalizedText() : (!localText && file.status !== 'error'))
            }
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold btn-premium-primary text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer animate-fade-in"
            title={
              parentPdf
                ? "Xuất file TXT gộp các trang đã hoàn thành"
                : (isMultiImage ? "Xuất file TXT gộp toàn bộ ảnh" : "Xuất file TXT chuẩn hoá 1 dòng")
            }
          >
            <Download size={14} />
            <span>Xuất file {(isMultiImage || parentPdf) && "(Gộp)"}</span>
          </button>
          {!isMultiImage && !file.isParentPdf && (
            <button
              onClick={handleCopy}
              disabled={!localText && file.status !== 'error'}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-xl"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Đã copy' : 'Copy nhanh'}</span>
            </button>
          )}
        </div>
      </div>
      
      {file.status === 'error' ? (
        <div className="flex-1 p-6 text-red-800 bg-red-50/50 border-t border-slate-100 overflow-auto font-sans">
          <p className="font-bold mb-2">Đã xảy ra lỗi:</p>
          <p className="text-xs sm:text-sm whitespace-pre-wrap font-mono bg-red-100/30 p-4 rounded-xl border border-red-200/50">{file.error}</p>
        </div>
      ) : file.status === 'processing' ? (
        <div className={`flex-1 flex flex-col items-center justify-center bg-white ${file.retryInfo ? 'text-amber-600' : 'text-primary'}`}>
          {file.retryInfo ? (
            <div className="flex flex-col items-center max-w-md text-center px-6">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 animate-bounce">
                <AlertCircle size={24} />
              </div>
              <h4 className="font-bold text-base mb-2 text-slate-800">
                {file.retryInfo.customMessage ? "Hệ thống đang chuyển Key" : "Google Gemini gặp lỗi"}
              </h4>
              <p className="text-xs text-slate-500 mb-4 whitespace-pre-wrap font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-h-[150px] overflow-auto">
                {file.retryInfo.errorMsg}
              </p>
              <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800">
                {file.retryInfo.customMessage || `Thử lại sau ${file.retryInfo.secondsLeft}s...`}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-2 bg-slate-200 rounded w-48 mb-4"></div>
                <div className="h-2 bg-slate-200 rounded w-32"></div>
              </div>
              <p className="mt-4 text-xs font-bold animate-pulse text-slate-400">Đang xử lý tài liệu tổng thể... (Vui lòng đợi trong giây lát)</p>
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={localText}
          onChange={handleChange}
          readOnly={file.isParentPdf}
          placeholder={file.isParentPdf ? "Chưa có trang nào hoàn thành OCR để hiển thị văn bản gộp." : "Chưa có dữ liệu trích xuất."}
          className={`flex-1 w-full p-5 bg-white text-slate-800 placeholder-slate-400 outline-none resize-none text-sm leading-relaxed focus:ring-1 focus:ring-primary focus:border-primary transition-all border-0 ${file.isParentPdf ? 'bg-slate-50/50 cursor-not-allowed text-slate-500 font-medium' : 'font-mono'}`}
        />
      )}
    </div>
  );
}
