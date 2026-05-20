import { useState, useEffect } from 'react';
import { Copy, Check, FileText, Download, AlertCircle } from 'lucide-react';

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
      .replace(/[*#\-_]/g, '') // Loại bỏ markdown *, #, -, _
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
      .replace(/[*#\-]/g, '')
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 min-h-[400px]">
        <FileText size={48} strokeWidth={1} className="mb-4 opacity-50" />
        <p>Chọn một file đã hoàn thành để xem kết quả</p>
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
      const textArea = document.createElement("textarea");
      textArea.value = localText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("Copy");
      textArea.remove();
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
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <FileText size={16} className="text-blue-500 shrink-0" />
          <h3 className="font-medium text-sm text-gray-700 truncate" title={file.originalFile?.name || 'Kết quả OCR'}>
            Kết quả: {file.originalFile?.name || 'Tài liệu'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTxt}
            disabled={isMultiImage ? !getMergedNormalizedText() : (!localText && file.status !== 'error')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer animate-fade-in"
            title={isMultiImage ? "Xuất file TXT gộp toàn bộ ảnh" : "Xuất file TXT chuẩn hoá 1 dòng"}
          >
            <Download size={14} />
            Xuất file TXT {isMultiImage && "(Gộp)"}
          </button>
          {!isMultiImage && (
            <button
              onClick={handleCopy}
              disabled={!localText && file.status !== 'error'}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied ? 'Đã copy' : 'Copy nhanh'}
            </button>
          )}
        </div>
      </div>
      
      {file.status === 'error' ? (
        <div className="flex-1 p-6 text-red-600 bg-red-50/30 overflow-auto">
          <p className="font-bold mb-2">Đã xảy ra lỗi:</p>
          <p className="text-sm whitespace-pre-wrap font-mono">{file.error}</p>
        </div>
      ) : file.status === 'processing' ? (
        <div className={`flex-1 flex flex-col items-center justify-center bg-blue-50/10 ${file.retryInfo ? 'text-amber-600' : 'text-blue-500'}`}>
          {file.retryInfo ? (
            <div className="flex flex-col items-center max-w-md text-center px-6">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mb-4 animate-bounce">
                <AlertCircle size={24} />
              </div>
              <h4 className="font-bold text-base mb-2">Google Gemini quá tải</h4>
              <p className="text-xs text-amber-500 mb-4 whitespace-pre-wrap font-mono bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 max-h-[150px] overflow-auto">
                {file.retryInfo.errorMsg}
              </p>
              <div className="px-4 py-2 bg-amber-100/50 border border-amber-200 rounded-full text-xs font-semibold">
                Thử lại lần {file.retryInfo.attempt}/{file.retryInfo.maxAttempts} sau {file.retryInfo.secondsLeft}s...
              </div>
            </div>
          ) : (
            <>
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-2 bg-blue-200 rounded w-48 mb-4"></div>
                <div className="h-2 bg-blue-200 rounded w-32"></div>
              </div>
              <p className="mt-4 text-sm font-medium animate-pulse">AI đang phân tích và trích xuất...</p>
            </>
          )}
        </div>
      ) : (
        <textarea
          value={localText}
          onChange={handleChange}
          placeholder="Chưa có dữ liệu trích xuất."
          className="flex-1 w-full p-4 resize-none outline-none text-gray-750 text-sm leading-relaxed"
        />
      )}
    </div>
  );
}
