import { useState, useEffect } from 'react';
import { Copy, Check, FileText, Download, AlertCircle } from 'lucide-react';

export default function ResultViewer({ file, allFiles, onUpdateResult }) {
  const [copied, setCopied] = useState(false);
  const [localText, setLocalText] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalText(file?.result || "");
  }, [file?.id, file?.result]);

  const imageFiles = allFiles ? allFiles.filter(f => !f.isParentPdf && !f.isPdfPage) : [];
  const isMultiImage = imageFiles.length > 1;

  const getCleanLine = (text) => {
    if (!text) return "";
    return text
      .replace(/[*#_-]/g, '') // Loại bỏ markdown *, #, -, _
      .replace(/[\n\r]+/g, ' ') // Thay dấu xuống dòng bằng khoảng trắng
      .replace(/\s+/g, ' ') // Thu gọn nhiều khoảng trắng liên tiếp
      .trim();
  };

  const getMergedNormalizedText = () => {
    // Sắp xếp và nối toàn bộ văn bản của các file ảnh theo đúng thứ tự tên file ảnh đầu vào trong hàng đợi
    const rawMerged = imageFiles
      .map(d => d.result || '')
      .filter(Boolean)
      .join(' ');
    
    // Chuẩn hóa chuỗi về 1 dòng duy nhất theo đúng yêu cầu:
    // Loại bỏ ký tự Markdown *, #, -
    // Thay thế tất cả dấu xuống dòng bằng khoảng trắng
    // Thu gọn nhiều khoảng trắng liên tiếp thành 1 khoảng trắng duy nhất bằng Regex .replace(/\s+/g, ' ')
    // và .trim() khoảng trắng ở đầu/cuối
    return rawMerged
      .replace(/[*#-]/g, '')
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#717171] bg-[#ffffff] rounded-none border border-dashed border-[#0d0129] min-h-[400px] shadow-[1px_1px_3px_0px_rgba(0,0,0,1)] p-6">
        <FileText size={48} strokeWidth={1} className="mb-4 opacity-30 text-[#717171]" />
        <p className="text-sm font-semibold">Chọn một file đã hoàn thành để xem kết quả</p>
      </div>
    );
  }

  const handleCopy = async () => {
    if (isMultiImage) return; // Bỏ qua copy nhanh khi ocr nhiều ảnh hàng loạt
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

  const handleExportTxt = () => {
    if (isMultiImage) {
      const processedText = getMergedNormalizedText();
      if (!processedText) return;
      
      // Lấy tên của file ảnh đầu tiên trong danh sách và thêm hậu tố _gop_all.txt
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
    <div className="flex flex-col h-full bg-[#ffffff] rounded-none shadow-[1px_1px_3px_0px_rgba(0,0,0,1)] border border-[#0d0129] overflow-hidden min-h-[500px]">
      <div className="flex items-center justify-between p-3.5 bg-[#19615c] text-white border-b border-[#0d0129] shrink-0">
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <FileText size={16} className="text-white shrink-0" />
          <h3 className="font-extrabold text-xs text-white truncate" title={file.originalFile?.name || 'Kết quả OCR'}>
            Kết quả: {file.originalFile?.name || 'Tài liệu'}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportTxt}
            disabled={isMultiImage ? !getMergedNormalizedText() : (!localText && file.status !== 'error')}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#fae59b] hover:bg-opacity-95 text-[#0d0129] border border-[#0d0129] rounded-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title={isMultiImage ? "Xuất file TXT gộp toàn bộ ảnh" : "Xuất file TXT chuẩn hoá 1 dòng"}
          >
            <Download size={14} />
            Tải File Gộp {isMultiImage && "(Gộp)"}
          </button>
          {!isMultiImage && (
            <button
              onClick={handleCopy}
              disabled={!localText && file.status !== 'error'}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white text-[#0d0129] border border-[#0d0129] rounded-[4px] hover:bg-[#fffcf7] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? 'Đã copy' : 'Copy nhanh'}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col p-4">
        {file.status === 'error' ? (
          <div className="flex-1 p-4 text-rose-800 bg-rose-50/20 border border-[#0d0129] rounded-none overflow-auto font-sans">
            <p className="font-bold mb-1.5 text-xs">Đã xảy ra lỗi:</p>
            <p className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{file.error}</p>
          </div>
        ) : file.status === 'processing' ? (
          <div className={`flex-1 flex flex-col items-center justify-center bg-[#fffcf7]/30 rounded-none border border-[#0d0129] ${file.retryInfo ? 'text-amber-600' : 'text-[#0d0129]'}`}>
            {file.retryInfo ? (
              <div className="flex flex-col items-center max-w-md text-center px-4">
                <div className="w-10 h-10 rounded-none bg-amber-50 border border-[#0d0129] flex items-center justify-center text-amber-600 mb-3 animate-bounce">
                  <AlertCircle size={20} />
                </div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[#0d0129]">Google Gemini quá tải</h4>
                <p className="text-[11px] text-amber-700 mb-3 whitespace-pre-wrap font-mono bg-amber-50 p-2 rounded-none border border-[#0d0129] max-h-[120px] overflow-auto">
                  {file.retryInfo.errorMsg}
                </p>
                <div className="px-3.5 py-1.5 bg-[#fae59b] border border-[#0d0129] rounded-[4px] text-[10px] font-bold text-[#0d0129]">
                  Thử lại lần {file.retryInfo.attempt}/{file.retryInfo.maxAttempts} sau {file.retryInfo.secondsLeft}s...
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center p-6">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-2 bg-slate-200 rounded w-40 mb-3"></div>
                  <div className="h-2 bg-slate-200 rounded w-24"></div>
                </div>
                <p className="mt-4 text-xs font-bold animate-pulse text-[#717171]">AI đang phân tích và trích xuất...</p>
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={localText}
            onChange={handleChange}
            placeholder="Chưa có dữ liệu trích xuất."
            className="flex-1 w-full p-3 bg-white text-[#0d0129] placeholder-[#717171] outline-none resize-none text-xs font-semibold leading-relaxed focus:bg-white focus:ring-1 focus:ring-[#19615c] focus:border-[#19615c] transition-all border border-[#0d0129] rounded-none"
          />
        )}
      </div>
    </div>
  );
}
