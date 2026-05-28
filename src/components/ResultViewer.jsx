/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { Copy, Check, FileText, Download, AlertCircle, ChevronDown, FileCode, File, Trash2, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { normalizeOcrText, cleanTextNewlines } from '../utils/textNormalizer';

export default function ResultViewer({ file, allFiles, onUpdateResult, onReset }) {
  const [copied, setCopied] = useState(false);
  const [localText, setLocalText] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [matchIndices, setMatchIndices] = useState([]);
  const textareaRef = useRef(null);
  const [detectedCaseNum, setDetectedCaseNum] = useState(null);

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

  useEffect(() => {
    if (!searchQuery || !localText) {
      setMatchIndices([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const text = localText.toLowerCase();
    const indices = [];
    let pos = 0;

    while (true) {
      const index = text.indexOf(query, pos);
      if (index === -1) break;
      indices.push({ start: index, end: index + query.length });
      pos = index + query.length;
      if (query.length === 0) break;
    }

    setMatchIndices(indices);
    if (indices.length > 0) {
      setCurrentMatchIndex(0);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [searchQuery, localText]);

  useEffect(() => {
    if (currentMatchIndex >= 0 && matchIndices.length > 0 && textareaRef.current) {
      const match = matchIndices[currentMatchIndex];
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(match.start, match.end);

      // Scroll textarea to matched term
      const textVal = textarea.value;
      const linesBefore = textVal.substring(0, match.start).split('\n').length;
      const lineHeight = 24; // approximate line-height
      textarea.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
    }
  }, [currentMatchIndex, matchIndices]);

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant bg-surface rounded-xl border border-dashed border-outline-variant/60 min-h-[400px]">
        <FileText size={48} strokeWidth={1} className="mb-4 opacity-40 text-on-surface-variant" />
        <p className="text-on-surface-variant text-sm font-medium">Chọn một file đã hoàn thành để xem kết quả</p>
      </div>
    );
  }

  const handleNextMatch = () => {
    if (matchIndices.length === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % matchIndices.length);
  };

  const handlePrevMatch = () => {
    if (matchIndices.length === 0) return;
    setCurrentMatchIndex(prev => (prev - 1 + matchIndices.length) % matchIndices.length);
  };

  const handleClearResult = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa văn bản kết quả hiện tại?")) {
      setLocalText("");
      if (onUpdateResult) {
        onUpdateResult(file.id, "");
      }
    }
  };

  const handleCopy = async () => {
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

  const handleNormalizeLegalText = () => {
    if (!localText) return;
    
    let text = localText;
    // 1. Chuẩn hóa tiêu đề quốc gia
    text = text.replace(/cộng\s*hòa\s*xã\s*hội\s*chủ\s*nghĩa\s*việt\s*nam/gi, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM");
    text = text.replace(/độc\s*lập\s*-\s*tự\s*do\s*-\s*hạnh\s*phúc/gi, "Độc lập - Tự do - Hạnh phúc");
    
    // 2. Sửa lỗi dấu nháy kép, dấu nháy đơn tiếng Việt cong vẹo
    text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    
    // 3. Chuẩn hóa khoảng trắng trước/sau dấu câu
    text = text.replace(/\s+([.,;:!?])/g, '$1'); // Xóa khoảng trắng trước dấu câu
    text = text.replace(/([.,;:!?])(?=[a-zA-Z\d])/g, '$1 '); // Thêm khoảng trắng sau dấu câu nếu thiếu
    
    // 4. Chuẩn hóa khoảng trắng thừa
    text = text.replace(/[ \t]+/g, ' '); // Gộp nhiều dấu cách liên tiếp
    
    // 5. Chuẩn hóa các đề mục viết hoa phổ biến (ví dụ: ĐIỀU, KHOẢN, CHƯƠNG)
    text = text.replace(/\n\s*(điều|khoản|chương)\s+(\d+)/gi, (match, p1, p2) => {
      return `\n${p1.toUpperCase()} ${p2}`;
    });
    
    setLocalText(text);
    if (onUpdateResult) {
      onUpdateResult(file.id, text);
    }
    alert("Đã hoàn tất chuẩn hóa văn bản theo định dạng pháp lý chuẩn.");
  };

  const handleDetectCaseNumber = () => {
    if (!localText) {
      alert("Chưa có văn bản kết quả để nhận diện.");
      return;
    }
    
    // Regex cho các định dạng số bản án, quyết định, văn bản hành chính Việt Nam phổ biến
    const regexList = [
      /(?:số|bản án số|quyết định số)[:\s]*([0-9a-zđ-]+\/[0-9a-zđ/-]+)/i,
      /số[:\s]*([0-9]+(?:\/[a-z0-9đ-]+)+)/i,
      /(?:số|quyết định)[:\s]*([0-9]+\/[a-z0-9đ-]+)/i
    ];
    
    let found = null;
    for (const regex of regexList) {
      const match = localText.match(regex);
      if (match && match[1]) {
        found = match[1].trim();
        break;
      }
    }
    
    if (found) {
      setDetectedCaseNum(found);
    } else {
      alert("Không tìm thấy số văn bản/số bản án nào khớp với cấu trúc pháp lý thông thường.");
    }
  };

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (formatType) => {
    let processedText;
    let baseFileName = "tailieu_ocr";
    
    if (parentPdf) {
      processedText = getPdfMergedNormalizedText();
      const originalName = parentPdf.originalFile?.name || parentPdf.name || 'tailieu_ocr.pdf';
      baseFileName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
    } else if (isMultiImage) {
      processedText = getMergedNormalizedText();
      const firstImageFile = imageFiles[0];
      if (firstImageFile) {
        const originalName = firstImageFile.originalFile?.name || firstImageFile.name || 'anh';
        baseFileName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
      }
    } else {
      processedText = normalizeOcrText(localText);
      const originalName = file.originalFile?.name || 'tailieu_ocr.txt';
      baseFileName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
    }
    
    if (!processedText) return;

    if (formatType === 'txt') {
      const cleanedText = cleanTextNewlines(processedText);
      downloadFile(cleanedText, `${baseFileName}_ocr.txt`, "text/plain;charset=utf-8");
    } else if (formatType === 'md') {
      const cleanedText = cleanTextNewlines(processedText);
      downloadFile(cleanedText, `${baseFileName}_ocr.md`, "text/markdown;charset=utf-8");
    } else if (formatType === 'docx') {
      const cleanedText = cleanTextNewlines(processedText);
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>OCR Export</title>" +
            "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->" +
            "<style>body { font-family: 'Arial', sans-serif; font-size: 12pt; line-height: 1.5; } p { margin: 0 0 10pt 0; }</style>" +
            "</head><body>";
      const footer = "</body></html>";
      const htmlBody = cleanedText
        .split('\n')
        .map(pText => {
          const trimmed = pText.trim();
          if (!trimmed) return "<p>&nbsp;</p>";
          return `<p>${trimmed}</p>`;
        })
        .join('');
      const docHtml = header + htmlBody + footer;
      downloadFile('\ufeff' + docHtml, `${baseFileName}_ocr.docx`, "application/msword;charset=utf-8");
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
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={
                parentPdf
                  ? !hasPdfResult
                  : (isMultiImage ? !getMergedNormalizedText() : (!localText && file.status !== 'error'))
              }
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold btn-premium-primary text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer animate-fade-in"
              title="Tải xuống kết quả dạng TXT, MD hoặc DOCX"
            >
              <Download size={14} />
              <span>Xuất file {(isMultiImage || parentPdf) && "(Gộp)"}</span>
              <ChevronDown size={14} />
            </button>
            
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsExportOpen(false)}></div>
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                  <button 
                    onClick={() => { handleExport('txt'); setIsExportOpen(false); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition-colors"
                  >
                    <FileText size={14} className="text-slate-400" />
                    <span>Tệp Văn bản (.txt)</span>
                  </button>
                  <button 
                    onClick={() => { handleExport('md'); setIsExportOpen(false); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition-colors"
                  >
                    <FileCode size={14} className="text-slate-400" />
                    <span>Tệp Markdown (.md)</span>
                  </button>
                  <button 
                    onClick={() => { handleExport('docx'); setIsExportOpen(false); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition-colors"
                  >
                    <File size={14} className="text-slate-400" />
                    <span>Tài liệu Word (.docx)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        {localText && (
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50 transition-all cursor-pointer rounded-xl shadow-sm"
            title="Sao chép toàn bộ kết quả vào bộ nhớ tạm"
          >
            {copied ? <Check size={14} className="text-emerald-600 shrink-0" /> : <Copy size={14} className="shrink-0" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép văn bản'}</span>
          </button>
        )}
        {!file.isParentPdf && localText && (
          <button
            onClick={handleClearResult}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold bg-rose-50 hover:bg-rose-100 hover:text-rose-800 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Xóa văn bản kết quả hiện tại"
          >
            <Trash2 size={14} className="shrink-0" />
            <span>Xóa kết quả</span>
          </button>
        )}
      </div>
      </div>
      
      {/* Search Bar */}
      {localText && (
        <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-slate-200/80 bg-slate-50/50">
          <div className="relative flex-1 max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm trong kết quả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-white border border-slate-250 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-slate-700"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {matchIndices.length > 0 ? (
              <>
                <span className="text-xs text-slate-500 font-bold mr-1">
                  {currentMatchIndex + 1} / {matchIndices.length} kết quả
                </span>
                <button
                  onClick={handlePrevMatch}
                  className="p-1 rounded bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                  title="Kết quả trước"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={handleNextMatch}
                  className="p-1 rounded bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                  title="Kết quả tiếp theo"
                >
                  <ArrowDown size={14} />
                </button>
              </>
            ) : searchQuery ? (
              <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100">Không tìm thấy</span>
            ) : null}
          </div>
        </div>
      )}

      {/* Judicial Utility Bar */}
      {localText && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-200/60 bg-slate-50/20">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 select-none mr-2">Tiện ích tư pháp:</span>
          
          {!file.isParentPdf && (
            <>
              <button
                onClick={handleDetectCaseNumber}
                className="flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-primary hover:text-primary transition-all rounded-lg cursor-pointer shadow-xs active:scale-95"
                title="Quét tìm Số bản án/Số quyết định trong kết quả"
              >
                <span className="material-icons text-[14px] text-slate-500">gavel</span>
                <span>Nhận diện số văn bản</span>
              </button>
              
              <button
                onClick={handleNormalizeLegalText}
                className="flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-primary hover:text-primary transition-all rounded-lg cursor-pointer shadow-xs active:scale-95"
                title="Chuẩn hóa chính tả Quốc hiệu, tiêu ngữ và khoảng trắng văn bản tố tụng"
              >
                <span className="material-icons text-[14px] text-slate-500">check_circle</span>
                <span>Chuẩn hóa văn bản</span>
              </button>
            </>
          )}
          
          <button
            onClick={() => handleExport('docx')}
            className="flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-primary hover:text-primary transition-all rounded-lg cursor-pointer shadow-xs active:scale-95"
            title="Xuất trực tiếp sang Microsoft Word (.docx)"
          >
            <span className="material-icons text-[14px] text-slate-500">file_download</span>
            <span>Xuất bản DOCX</span>
          </button>
        </div>
      )}
      
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
        <div className="flex-1 flex flex-col min-h-0 relative">
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={handleChange}
            readOnly={file.isParentPdf}
            placeholder={file.isParentPdf ? "Chưa có trang nào hoàn thành OCR để hiển thị văn bản gộp." : "Chưa có dữ liệu trích xuất."}
            className={`flex-1 w-full p-6 bg-slate-50/20 text-slate-800 placeholder-slate-400 outline-none resize-none text-sm leading-relaxed tracking-wide font-mono focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary transition-all border-0 ${file.isParentPdf ? 'bg-slate-50/50 cursor-not-allowed text-slate-500 font-medium' : 'font-medium'}`}
          />
          {localText && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-y-2 text-[11px] font-bold text-slate-500 select-none">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-icons text-[14px] text-slate-400">format_align_left</span>
                  <span>Ký tự: {localText.length.toLocaleString()}</span>
                </div>
                {file.metadata && (
                  <>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons text-[14px] text-slate-400">timer</span>
                      <span>Thời gian: {file.metadata.duration}s</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons text-[14px] text-slate-400">memory</span>
                      <span>Engine: {file.metadata.engine}</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons text-[14px] text-slate-400">settings</span>
                      <span className="truncate max-w-[200px]" title={file.metadata.ocrMode}>Chế độ: {file.metadata.ocrMode}</span>
                    </div>
                  </>
                )}
              </div>
              
              {file.isParentPdf && pdfPages.length > 0 && (
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="material-icons text-[14px]">library_books</span>
                  <span>Đã số hóa: {pdfPages.filter(p => p.status === 'completed').length} / {parentPdf?.totalPages || pdfPages.length} trang</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Case Number Detection Modal */}
      {detectedCaseNum && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-5 mx-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-icons text-primary text-[20px]">gavel</span>
              <h4 className="font-bold text-sm text-slate-800">Nhận diện số văn bản</h4>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Đã phát hiện ký hiệu/số văn bản tố tụng sau trong tài liệu:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center font-mono font-bold text-sm text-primary select-all">
              {detectedCaseNum}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(detectedCaseNum);
                  alert("Đã sao chép số văn bản!");
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Sao chép
              </button>
              <button
                onClick={() => setDetectedCaseNum(null)}
                className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
