import { useState, useEffect } from 'react';
import { Copy, Check, FileText, Download, AlertCircle } from 'lucide-react';

export default function ResultViewer({ file, onUpdateResult }) {
  const [copied, setCopied] = useState(false);
  const [localText, setLocalText] = useState("");

  useEffect(() => {
    setLocalText(file?.result || "");
  }, [file?.id, file?.result]);

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 min-h-[400px]">
        <FileText size={48} strokeWidth={1} className="mb-4 opacity-50" />
        <p>Chọn một file đã hoàn thành để xem kết quả</p>
      </div>
    );
  }

  const handleCopy = async () => {
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
    if (!localText) return;
    
    // Bước 1: Xử lý chuỗi theo yêu cầu
    let processedText = localText
      .replace(/[*#\-_]/g, '') // Loại bỏ markdown *, #, -, _
      .replace(/[\n\r]+/g, ' ') // Thay dấu xuống dòng bằng khoảng trắng
      .replace(/\s+/g, ' ') // Thu gọn nhiều khoảng trắng liên tiếp
      .trim(); // Cắt khoảng trắng thừa 2 đầu
      
    // Bước 2: Tạo tên file chuẩn
    const originalName = file.originalFile?.name || 'tailieu_ocr.txt';
    const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
    const fileName = `${baseName}.txt`;
    
    // Bước 3: Sử dụng Data URI thay vì Blob để né lỗi mất tên file trên một số trình duyệt
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(processedText);
    
    // Bước 4: Tải xuống tự động
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = fileName;
    
    // Bắt buộc phải append vào DOM thì Firefox và một số bản Chrome mới chịu nhận thuộc tính download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
            disabled={!localText && file.status !== 'error'}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Xuất file TXT chuẩn hoá 1 dòng"
          >
            <Download size={14} />
            Xuất file TXT
          </button>
          <button
            onClick={handleCopy}
            disabled={!localText && file.status !== 'error'}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copied ? 'Đã copy' : 'Copy nhanh'}
          </button>
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
          className="flex-1 w-full p-4 resize-none outline-none text-gray-700 text-sm leading-relaxed"
        />
      )}
    </div>
  );
}
