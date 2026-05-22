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
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200/80 min-h-[400px] shadow-sm p-6">
        <FileText size={48} strokeWidth={1} className="mb-4 opacity-30 text-slate-500" />
        <p className="text-base font-semibold text-slate-700">Chọn một file đã hoàn thành để xem kết quả</p>
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
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden min-h-[500px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border-b border-slate-200/80 gap-3 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <FileText size={16} className="text-slate-700 shrink-0" />
          <h3 className="font-bold text-[15px] text-slate-900 truncate" title={file.originalFile?.name || 'Kết quả OCR'}>
            Kết quả: {file.originalFile?.name || 'Tài liệu'}
          </h3>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end shrink-0">
          <button
            onClick={handleExportTxt}
            disabled={isMultiImage ? !getMergedNormalizedText() : (!localText && file.status !== 'error')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-11 px-4 text-[15px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-transparent"
            title={isMultiImage ? "Xuất file TXT gộp toàn bộ ảnh" : "Xuất file TXT chuẩn hoá 1 dòng"}
          >
            <Download size={14} />
            <span className="truncate">Tải File {isMultiImage && "(Gộp)"}</span>
          </button>
          {!isMultiImage && (
            <button
              onClick={handleCopy}
              disabled={!localText && file.status !== 'error'}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-11 px-4 text-[15px] font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span className="truncate">{copied ? 'Đã copy' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col p-4">
        {file.status === 'error' ? (
          <div className="flex-1 p-4 text-rose-800 bg-rose-50/20 border border-rose-100 rounded-xl overflow-auto font-sans">
            <p className="font-bold mb-1.5 text-sm">Đã xảy ra lỗi:</p>
            <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{file.error}</p>
          </div>
        ) : file.status === 'processing' ? (
          <div className={`flex-1 flex flex-col items-center justify-center bg-slate-50/30 rounded-xl border border-slate-200/80 ${file.retryInfo ? 'text-amber-600' : 'text-slate-800'}`}>
            {file.retryInfo ? (
              <div className="flex flex-col items-center max-w-md text-center px-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 animate-bounce">
                  <AlertCircle size={20} />
                </div>
                <h4 className="font-extrabold text-base mb-1.5 text-slate-800">Google Gemini quá tải</h4>
                <p className="text-sm text-amber-700 mb-3 whitespace-pre-wrap font-mono bg-amber-50 p-2 rounded-lg border border-amber-200 max-h-[120px] overflow-auto">
                  {file.retryInfo.errorMsg}
                </p>
                <div className="px-3.5 py-1.5 bg-amber-100 border border-amber-200 rounded-full text-[12px] font-bold text-amber-700">
                  Thử lại lần {file.retryInfo.attempt}/{file.retryInfo.maxAttempts} sau {file.retryInfo.secondsLeft}s...
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center p-6">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-2 bg-slate-200 rounded w-40 mb-3"></div>
                  <div className="h-2 bg-slate-200 rounded w-24"></div>
                </div>
                <p className="mt-4 text-[15px] font-bold animate-pulse text-[#717171]">AI đang phân tích và trích xuất...</p>
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={localText}
            onChange={handleChange}
            placeholder="Chưa có dữ liệu trích xuất."
            className="flex-1 w-full p-3 bg-white text-slate-800 placeholder-slate-400 outline-none resize-none text-base font-semibold leading-relaxed focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all border border-slate-200 rounded-xl"
          />
        )}
      </div>
    </div>
  );
}
