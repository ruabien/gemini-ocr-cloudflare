import { useState, useEffect } from 'react';
import { Copy, Check, FileText, Download, AlertCircle } from 'lucide-react';

export default function ResultViewer({ file, allFiles, onUpdateResult, onReset }) {
  const [copied, setCopied] = useState(false);
  const [localText, setLocalText] = useState("");

  const imageFiles = allFiles ? allFiles.filter(f => !f.isParentPdf && !f.isPdfPage) : [];
  const isMultiImage = imageFiles.length > 1;

  const parentPdf = file?.isParentPdf ? file : (allFiles && file?.parentPdfId ? allFiles.find(f => f.id === file.parentPdfId) : null);
  const pdfPages = parentPdf ? allFiles.filter(f => f.isPdfPage && f.parentPdfId === parentPdf.id) : [];
  const hasPdfResult = pdfPages.some(p => p.result && p.result.trim());

  const getCleanLine = (text) => {
    if (!text) return "";
    return text
      .replace(/[*#_-]/g, '') // Loại bỏ markdown *, #, -, _
      .replace(/[\n\r]+/g, ' ') // Thay dấu xuống dòng bằng khoảng trắng
      .replace(/\s+/g, ' ') // Thu gọn nhiều khoảng trắng liên tiếp
      .trim();
  };

  const getMergedNormalizedText = () => {
    const rawMerged = imageFiles
      .map(d => d.result || '')
      .filter(Boolean)
      .join(' ');
    
    return rawMerged
      .replace(/[*#_-]/g, '')
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getPdfMergedNormalizedText = () => {
    if (!parentPdf) return "";
    const sortedPages = [...pdfPages].sort((a, b) => a.pageIndex - b.pageIndex);
    const rawMerged = sortedPages
      .map(p => p.result || '')
      .filter(Boolean)
      .join(' ');
      
    return rawMerged
      .replace(/[*#_-]/g, '')
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  useEffect(() => {
    if (file?.isParentPdf) {
      const merged = getPdfMergedNormalizedText();
      setLocalText(merged);
    } else {
      setLocalText(file?.result || "");
    }
  }, [file?.id, file?.result, allFiles, file?.isParentPdf]);

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
    try {
      await navigator.clipboard.writeText(localText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // Fallback
      const textSub = document.createElement("textarea");
      textSub.value = localText;
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
      
      downloadTxtFile(processedText, fileName);
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
      
      downloadTxtFile(processedText, fileName);
    } else {
      if (!localText) return;
      
      let processedText = getCleanLine(localText);
      const originalName = file.originalFile?.name || 'tailieu_ocr.txt';
      const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
      const fileName = `${baseName}.txt`;
      
      downloadTxtFile(processedText, fileName);
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
    <div className="flex flex-col h-full bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden min-h-[500px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-outline-variant/30 bg-surface/50 gap-3">
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <FileText size={16} className="text-primary shrink-0" />
          <h3 className="font-semibold text-sm text-on-surface truncate" title={file.originalFile?.name || 'Kết quả OCR'}>
            Kết quả: {file.originalFile?.name || file.name || 'Tài liệu'}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onReset && (
            <button
              onClick={onReset}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-12 sm:h-10 px-3 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-[#0b1c30] border border-slate-200 rounded-xl transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
              title="Làm mới toàn bộ hàng đợi và kết quả"
            >
              <span className="material-symbols-outlined text-[14px] font-bold">refresh</span>
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
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-12 sm:h-10 px-3 text-xs font-semibold bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer animate-fade-in shadow-sm shadow-primary/10"
            title={
              parentPdf
                ? "Xuất file TXT gộp các trang đã hoàn thành"
                : (isMultiImage ? "Xuất file TXT gộp toàn bộ ảnh" : "Xuất file TXT chuẩn hoá 1 dòng")
            }
          >
            <Download size={14} />
            Xuất file {(isMultiImage || parentPdf) && "(Gộp)"}
          </button>
          {!isMultiImage && !file.isParentPdf && (
            <button
              onClick={handleCopy}
              disabled={!localText && file.status !== 'error'}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-12 sm:h-10 px-3 text-xs font-medium bg-surface-container-lowest border border-outline-variant/60 text-on-surface hover:bg-surface hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-xl"
            >
              {copied ? <Check size={14} className="text-tertiary" /> : <Copy size={14} />}
              {copied ? 'Đã copy' : 'Copy nhanh'}
            </button>
          )}
        </div>
      </div>
      
      {file.status === 'error' ? (
        <div className="flex-1 p-6 text-on-error-container bg-error-container/30 border border-error-container overflow-auto font-sans">
          <p className="font-bold mb-2">Đã xảy ra lỗi:</p>
          <p className="text-sm whitespace-pre-wrap font-mono">{file.error}</p>
        </div>
      ) : file.status === 'processing' ? (
        <div className={`flex-1 flex flex-col items-center justify-center bg-surface ${file.retryInfo ? 'text-secondary' : 'text-primary'}`}>
          {file.retryInfo ? (
            <div className="flex flex-col items-center max-w-md text-center px-6">
              <div className="w-12 h-12 rounded-full bg-secondary-fixed/10 border border-secondary-fixed-dim/30 flex items-center justify-center text-secondary mb-4 animate-bounce">
                <AlertCircle size={24} />
              </div>
              <h4 className="font-bold text-base mb-2 text-on-surface">
                {file.retryInfo.customMessage ? "Hệ thống đang chuyển Key" : "Google Gemini gặp lỗi"}
              </h4>
              <p className="text-xs text-secondary-fixed-variant mb-4 whitespace-pre-wrap font-mono bg-secondary-fixed/5 p-2.5 rounded-lg border border-secondary-fixed-dim/20 max-h-[150px] overflow-auto">
                {file.retryInfo.errorMsg}
              </p>
              <div className="px-4 py-2 bg-secondary-fixed/20 border border-secondary-fixed-dim/30 rounded-full text-xs font-semibold text-secondary-fixed-variant">
                {file.retryInfo.customMessage || `Thử lại sau ${file.retryInfo.secondsLeft}s...`}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-2 bg-outline-variant/30 rounded w-48 mb-4"></div>
                <div className="h-2 bg-outline-variant/30 rounded w-32"></div>
              </div>
              <p className="mt-4 text-sm font-medium animate-pulse text-on-surface-variant/70">Đang xử lý tài liệu tổng thể... (Vui lòng đợi trong giây lát)</p>
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={localText}
          onChange={handleChange}
          readOnly={file.isParentPdf}
          placeholder={file.isParentPdf ? "Chưa có trang nào hoàn thành OCR để hiển thị văn bản gộp." : "Chưa có dữ liệu trích xuất."}
          className={`flex-1 w-full p-4 bg-surface-container-lowest text-on-surface placeholder-on-surface-variant/40 outline-none resize-none text-body-md leading-relaxed focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary transition-all border-t border-outline-variant/10 ${file.isParentPdf ? 'bg-slate-50 cursor-not-allowed' : ''}`}
        />
      )}
    </div>
  );
}
