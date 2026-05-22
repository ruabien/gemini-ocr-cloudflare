import { useState, useEffect } from 'react';
import { Copy, Check, FileText, Download, AlertCircle, Loader2 } from 'lucide-react';

export default function ResultViewer({ file, allFiles, onUpdateResult }) {
  const [copied, setCopied] = useState(false);
  const [localText, setLocalText] = useState("");

  useEffect(() => {
    setLocalText(file?.result || "");
  }, [file?.id, file?.result]);

  const imageFiles = allFiles ? allFiles.filter(f => !f.isParentPdf && !f.isPdfPage) : [];
  const isMultiImage = imageFiles.length > 1;

  const getCleanLine = (text) => {
    if (!text) return "";
    return text
      .replace(/[*#_-]/g, '') // Remove markdown
      .replace(/[\n\r]+/g, ' ') // Flat to single line
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getMergedNormalizedText = () => {
    const rawMerged = imageFiles
      .map(d => d.result || '')
      .filter(Boolean)
      .join(' ');
    
    return rawMerged
      .replace(/[*#-]/g, '')
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-surface-container-lowest rounded-xl border-2 border-dashed border-primary/20 min-h-[400px] shadow-[0_4px_20px_rgba(0,88,190,0.04)] p-6 font-sans select-none">
        <FileText size={48} strokeWidth={1} className="mb-4 text-primary opacity-40 animate-pulse" />
        <p className="text-base font-bold text-on-surface-variant">Chọn một file đã hoàn thành để xem kết quả</p>
      </div>
    );
  }

  const handleCopy = async () => {
    if (isMultiImage) return;
    if (!localText) return;
    try {
      await navigator.clipboard.writeText(localText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
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

  const handleExportTxt = () => {
    if (isMultiImage) {
      const processedText = getMergedNormalizedText();
      if (!processedText) return;
      
      const firstImageFile = imageFiles[0];
      let fileName = "gop_all.txt";
      if (firstImageFile) {
        const originalName = firstImageFile.originalFile?.name || firstImageFile.name || 'anh';
        const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
        fileName = `${baseName}_gop_all.txt`;
      }
      
      const blob = new Blob([processedText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      if (!localText) return;
      
      let processedText = getCleanLine(localText);
      const originalName = file.originalFile?.name || 'tailieu_ocr.txt';
      const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
      const fileName = `${baseName}.txt`;
      
      const blob = new Blob([processedText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleChange = (e) => {
    setLocalText(e.target.value);
    if (onUpdateResult) {
      onUpdateResult(file.id, e.target.value);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,88,190,0.04)] border border-outline-variant/30 overflow-hidden min-h-[450px] font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <FileText size={18} className="text-primary shrink-0" />
          <h3 className="font-display font-bold text-[16px] text-on-surface truncate" title={file.originalFile?.name || 'Kết quả OCR'}>
            Kết quả: {file.originalFile?.name || 'Tài liệu'}
          </h3>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end shrink-0">
          <button
            onClick={handleExportTxt}
            disabled={isMultiImage ? !getMergedNormalizedText() : (!localText && file.status !== 'error')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-12 px-5 text-base font-bold bg-primary hover:bg-primary-container text-on-primary rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-transparent"
            title={isMultiImage ? "Xuất file TXT gộp toàn bộ ảnh" : "Xuất file TXT chuẩn hoá 1 dòng"}
          >
            <Download size={16} />
            <span className="truncate">Tải File {isMultiImage && "(Gộp)"}</span>
          </button>
          {!isMultiImage && (
            <button
              onClick={handleCopy}
              disabled={!localText && file.status !== 'error'}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-12 px-5 text-base font-bold bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              <span className="truncate">{copied ? 'Đã copy' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5">
        {file.status === 'error' ? (
          <div className="flex-1 p-4 text-rose-800 bg-rose-50/20 border border-rose-100 rounded-xl overflow-auto font-sans">
            <p className="font-bold mb-1.5 text-base flex items-center gap-1.5">
              <AlertCircle size={18} className="text-rose-600" />
              Đã xảy ra lỗi khi OCR:
            </p>
            <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{file.error}</p>
          </div>
        ) : file.status === 'processing' ? (
          <div className={`flex-1 flex flex-col items-center justify-center bg-surface-bright/50 rounded-xl border border-outline-variant/30 p-6 ${file.retryInfo ? 'text-amber-600' : 'text-slate-800'}`}>
            {file.retryInfo ? (
              <div className="flex flex-col items-center max-w-md text-center px-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 animate-bounce">
                  <AlertCircle size={24} />
                </div>
                <h4 className="font-display font-extrabold text-base mb-1.5 text-on-surface">Google Gemini quá tải</h4>
                <p className="text-sm text-amber-700 mb-4 whitespace-pre-wrap font-mono bg-amber-50/80 p-3 rounded-lg border border-amber-200 max-h-[120px] overflow-auto">
                  {file.retryInfo.errorMsg}
                </p>
                <div className="px-4 py-2 bg-amber-100 border border-amber-200 rounded-full text-xs font-bold text-amber-700">
                  Thử lại lần {file.retryInfo.attempt}/{file.retryInfo.maxAttempts} sau {file.retryInfo.secondsLeft}s...
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center p-6 select-none">
                <Loader2 size={32} className="animate-spin text-primary mb-3" />
                <p className="font-display text-[16px] md:text-[17px] font-bold text-on-surface">AI đang phân tích và trích xuất...</p>
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={localText}
            onChange={handleChange}
            placeholder="Chưa có dữ liệu trích xuất."
            className="flex-1 w-full p-4 bg-surface-container-lowest text-on-surface placeholder-slate-400 outline-none resize-none text-base md:text-[17px] font-medium leading-relaxed focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all border border-outline-variant/30 rounded-xl"
          />
        )}
      </div>
    </div>
  );
}
