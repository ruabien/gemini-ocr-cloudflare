/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { Copy, Check, FileText, Download, AlertCircle, ChevronDown, FileCode, File, Trash2 } from 'lucide-react';
import { normalizeOcrText, cleanTextNewlines } from '../utils/textNormalizer';
import { exportTxt, exportMarkdown, exportDocx } from '../utils/exportHelper';

export default function ResultViewer({ file, allFiles, onUpdateResult, onReset, ocrOptions, config }) {
  const [copied, setCopied] = useState(false);
  const [localText, setLocalText] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const textareaRef = useRef(null);
  const [detectedCaseNum, setDetectedCaseNum] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [isPremiumPopupOpen, setIsPremiumPopupOpen] = useState(false);

  const handlePremiumWordExport = async () => {
    const premiumKey = config?.licenseKey || localStorage.getItem('ocr_license_key') || '';
    if (!premiumKey.trim()) {
      setIsPremiumPopupOpen(true);
      return;
    }
    await handleExport('docx');
  };

  const imageFiles = allFiles ? allFiles.filter(f => !f.isParentPdf && !f.isPdfPage) : [];
  const isMultiImage = imageFiles.length > 1;

  const parentPdf = file?.isParentPdf ? file : (allFiles && file?.parentPdfId ? allFiles.find(f => f.id === file.parentPdfId) : null);
  const pdfPages = parentPdf ? allFiles.filter(f => f.isPdfPage && f.parentPdfId === parentPdf.id) : [];

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

  const getProcessedText = () => {
    if (parentPdf) {
      return getPdfMergedNormalizedText();
    } else if (isMultiImage) {
      return getMergedNormalizedText();
    } else {
      return normalizeOcrText(localText);
    }
  };

  const processedTextStr = getProcessedText();
  const isOcrEmpty = !processedTextStr || !processedTextStr.trim();

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

  const handleExport = async (formatType) => {
    let processedText;
    let baseFileName = "tailieu_ocr";
    let pagesData;
    
    if (parentPdf) {
      processedText = getPdfMergedNormalizedText();
      const originalName = parentPdf.originalFile?.name || parentPdf.name || 'tailieu_ocr.pdf';
      baseFileName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
      
      const sortedPages = [...pdfPages].sort((a, b) => a.pageIndex - b.pageIndex);
      pagesData = sortedPages.map(p => ({
        text: p.result || '',
        imageFile: p.originalFile
      }));
    } else if (isMultiImage) {
      processedText = getMergedNormalizedText();
      const firstImageFile = imageFiles[0];
      if (firstImageFile) {
        const originalName = firstImageFile.originalFile?.name || firstImageFile.name || 'anh';
        baseFileName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
      }
      pagesData = imageFiles.map(d => ({
        text: d.result || '',
        imageFile: d.originalFile
      }));
    } else {
      processedText = normalizeOcrText(localText);
      const originalName = file.originalFile?.name || 'tailieu_ocr.txt';
      baseFileName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
      
      pagesData = [{
        text: processedText,
        imageFile: file.originalFile
      }];
    }
    
    if (!processedText || !processedText.trim()) {
      alert("Không có nội dung để xuất file.");
      return;
    }

    const cleanedText = cleanTextNewlines(processedText);

    try {
      if (formatType === 'txt') {
        exportTxt(cleanedText, `${baseFileName}_ocr.txt`);
      } else if (formatType === 'md') {
        exportMarkdown(cleanedText, `${baseFileName}_ocr.md`);
      } else if (formatType === 'docx') {
        await exportDocx(pagesData, `${baseFileName}_ocr.docx`, ocrOptions || {});
      }
    } catch (error) {
      console.error("Lỗi xuất file:", error);
      if (formatType === 'docx') {
        setExportError({
          message: "Không thể xuất file Word (.docx) đúng chuẩn do lỗi hệ thống.",
          detail: error.message || String(error),
          textToFallback: cleanedText,
          fallbackFilename: `${baseFileName}_ocr.txt`
        });
      } else {
        alert(`Lỗi xuất file: ${error.message}`);
      }
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
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border shadow-sm overflow-hidden min-h-[500px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3.5 border-b border-border bg-background/75 gap-3">
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <FileText size={16} className="text-primary shrink-0" />
          <h3 className="font-bold text-xs sm:text-sm text-text-primary truncate" title={file.originalFile?.name || 'Kết quả OCR'}>
            {file.originalFile?.name || file.name || 'Tài liệu'}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onReset && (
            <button
              onClick={onReset}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold bg-surface hover:bg-background text-text-primary border border-border rounded-xl transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
              title="Làm mới toàn bộ hàng đợi và kết quả"
            >
              <span className="material-icons text-[14px] font-bold">refresh</span>
              <span>Làm mới</span>
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={isOcrEmpty}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold btn-premium-primary text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer animate-fade-in"
              title={isOcrEmpty ? "Không có dữ liệu văn bản để xuất" : "Tải xuống kết quả dạng TXT, MD hoặc DOCX"}
            >
              <Download size={14} />
              <span>Xuất file {(isMultiImage || parentPdf) && "(Gộp)"}</span>
              <ChevronDown size={14} />
            </button>
            
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsExportOpen(false)}></div>
                <div className="absolute right-0 mt-1.5 w-48 bg-surface border border-border rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                  <button 
                    onClick={() => { handleExport('txt'); setIsExportOpen(false); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-background flex items-center gap-2 text-text-primary transition-colors"
                  >
                    <FileText size={14} className="text-text-secondary/60" />
                    <span>Tệp Văn bản (.txt)</span>
                  </button>
                  <button 
                    onClick={() => { handleExport('md'); setIsExportOpen(false); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-background flex items-center gap-2 text-text-primary transition-colors"
                  >
                    <FileCode size={14} className="text-text-secondary/60" />
                    <span>Tệp Markdown (.md)</span>
                  </button>
                  <button 
                    onClick={() => { handleExport('docx'); setIsExportOpen(false); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-background flex items-center gap-2 text-text-primary transition-colors"
                  >
                    <File size={14} className="text-text-secondary/60" />
                    <span>Tài liệu Word (.docx)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        {localText && (
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold bg-surface border border-border text-text-primary hover:border-primary hover:text-primary hover:bg-background transition-all cursor-pointer rounded-xl shadow-sm"
            title="Sao chép toàn bộ kết quả vào bộ nhớ tạm"
          >
            {copied ? <Check size={14} className="text-success shrink-0" /> : <Copy size={14} className="shrink-0" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép văn bản'}</span>
          </button>
        )}
        {!file.isParentPdf && localText && (
          <button
            onClick={handleClearResult}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold btn-premium-danger rounded-xl transition-all cursor-pointer shadow-sm"
            title="Xóa văn bản kết quả hiện tại"
          >
            <Trash2 size={14} className="shrink-0" />
            <span>Xóa kết quả</span>
          </button>
        )}
      </div>
      </div>
      {/* Judicial Utility Bar */}
      {localText && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-background/20">
          <span className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-wider shrink-0 select-none mr-2">Tiện ích tư pháp:</span>
          
          {!file.isParentPdf && (
            <>
              <button
                onClick={handleDetectCaseNumber}
                className="flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-bold bg-surface border border-border hover:bg-background text-text-primary hover:border-primary hover:text-primary transition-all rounded-lg cursor-pointer shadow-xs active:scale-95"
                title="Quét tìm Số bản án/Số quyết định trong kết quả"
              >
                <span className="material-icons text-[14px] text-text-secondary/70">gavel</span>
                <span>Nhận diện số văn bản</span>
              </button>
              
              <button
                onClick={handleNormalizeLegalText}
                className="flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-bold bg-surface border border-border hover:bg-background text-text-primary hover:border-primary hover:text-primary transition-all rounded-lg cursor-pointer shadow-xs active:scale-95"
                title="Chuẩn hóa chính tả Quốc hiệu, tiêu ngữ và khoảng trắng văn bản tố tụng"
              >
                <span className="material-icons text-[14px] text-text-secondary/70">check_circle</span>
                <span>Chuẩn hóa văn bản</span>
              </button>
            </>
          )}
          
          <button
            onClick={handlePremiumWordExport}
            disabled={isOcrEmpty}
            className="flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-bold bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white text-primary transition-all rounded-lg cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            title={isOcrEmpty ? "Không có dữ liệu văn bản để xuất" : "Xuất Word chuyên nghiệp chuẩn Nghị định 30 (Premium)"}
          >
            <span className="material-icons text-[14px]">workspace_premium</span>
            <span>👑 Xuất Word Chuẩn Nghị Định 30</span>
          </button>
        </div>
      )}
      
      {file.status === 'error' ? (
        <div className="flex-1 p-6 text-accent bg-accent/5 border-t border-border overflow-auto font-sans">
          <p className="font-bold mb-2">Đã xảy ra lỗi:</p>
          <p className="text-xs sm:text-sm whitespace-pre-wrap font-mono bg-accent/10 p-4 rounded-xl border border-accent/20">{file.error}</p>
        </div>
      ) : file.status === 'processing' ? (
        <div className={`flex-1 flex flex-col items-center justify-center bg-surface ${file.retryInfo ? 'text-accent' : 'text-primary'}`}>
          {file.retryInfo ? (
            <div className="flex flex-col items-center max-w-md text-center px-6">
              <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 animate-bounce">
                <AlertCircle size={24} />
              </div>
              <h4 className="font-bold text-base mb-2 text-text-primary">
                {file.retryInfo.customMessage ? "Hệ thống đang chuyển Key" : "Google Gemini gặp lỗi"}
              </h4>
              <p className="text-xs text-text-secondary mb-4 whitespace-pre-wrap font-mono bg-background p-2.5 rounded-lg border border-border max-h-[150px] overflow-auto">
                {file.retryInfo.errorMsg}
              </p>
              <div className="px-4 py-2 bg-accent/10 border border-accent/20 rounded-full text-xs font-semibold text-accent">
                {file.retryInfo.customMessage || `Thử lại sau ${file.retryInfo.secondsLeft}s...`}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-2 bg-border rounded w-48 mb-4"></div>
                <div className="h-2 bg-border rounded w-32"></div>
              </div>
              <p className="mt-4 text-xs font-bold animate-pulse text-text-secondary/50">Đang xử lý tài liệu tổng thể... (Vui lòng đợi trong giây lát)</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 relative">
          {(!file.isParentPdf && file.metadata?.status === 'fallback') ? (
            <div className="px-3 sm:px-4 py-2 bg-amber-500/10 text-amber-800 text-[10px] sm:text-[11px] font-bold border-b border-border flex items-center gap-2 text-left">
              <span className="material-icons text-[14px] text-amber-700">cloud</span>
              <span>Trang {file.pageIndex !== undefined ? file.pageIndex + 1 : 1} được xử lý bằng OCR.space.</span>
            </div>
          ) : (file.isParentPdf && pdfPages.some(p => p.metadata?.status === 'fallback')) ? (
            <div className="px-3 sm:px-4 py-2 bg-amber-500/10 text-amber-800 text-[10px] sm:text-[11px] font-bold border-b border-border flex items-center gap-2 text-left">
              <span className="material-icons text-[14px] text-amber-700">cloud</span>
              <span>Trang {pdfPages.filter(p => p.metadata?.status === 'fallback').map(p => p.pageIndex + 1).join(', ')} được xử lý bằng OCR.space.</span>
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={handleChange}
            readOnly={file.isParentPdf}
            placeholder={file.isParentPdf ? "Chưa có trang nào hoàn thành OCR để hiển thị văn bản gộp." : "Chưa có dữ liệu trích xuất."}
            className={`flex-1 w-full p-6 bg-background/20 text-text-primary placeholder-text-secondary/50 outline-none resize-none text-sm leading-relaxed tracking-wide font-mono focus:bg-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all border-0 ${file.isParentPdf ? 'bg-background/50 cursor-not-allowed text-text-secondary font-medium' : 'font-medium'}`}
          />
          {localText && (
            <div className="px-4 py-2 bg-background border-t border-border flex flex-wrap items-center justify-between gap-y-2 text-[11px] font-bold text-text-secondary select-none">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-icons text-[14px] text-text-secondary/60">format_align_left</span>
                  <span>Ký tự: {localText.length.toLocaleString()}</span>
                </div>
                {file.metadata && (
                  <>
                    <span className="text-border">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons text-[14px] text-text-secondary/60">timer</span>
                      <span>Thời gian: {file.metadata.duration}s</span>
                    </div>
                    <span className="text-border">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons text-[14px] text-text-secondary/60">memory</span>
                      <span>Engine: {
                        file.metadata.engine === 'ocr-space' 
                          ? 'OCR.space' 
                          : file.metadata.engine === 'gemini-retry'
                          ? 'Gemini (Thử lại)'
                          : file.metadata.engine
                      }</span>
                    </div>
                    <span className="text-border">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons text-[14px] text-text-secondary/60">settings</span>
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-text-primary/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-surface rounded-xl shadow-2xl border border-border p-5 mx-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-icons text-primary text-[20px]">gavel</span>
              <h4 className="font-bold text-sm text-text-primary">Nhận diện số văn bản</h4>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Đã phát hiện ký hiệu/số văn bản tố tụng sau trong tài liệu:
            </p>
            <div className="bg-background border border-border rounded-lg p-3 text-center font-mono font-bold text-sm text-primary select-all">
              {detectedCaseNum}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(detectedCaseNum);
                  alert("Đã sao chép số văn bản!");
                }}
                className="px-3.5 py-2 bg-background hover:bg-border text-text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
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
      
      {/* DOCX Export Error Modal */}
      {exportError && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-text-primary/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-surface rounded-xl shadow-2xl border border-border p-5 mx-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-3 text-accent">
              <span className="material-icons text-[20px]">warning</span>
              <h4 className="font-bold text-sm text-text-primary">Lỗi Xuất File DOCX</h4>
            </div>
            <p className="text-xs text-text-secondary mb-2 font-medium">
              {exportError.message}
            </p>
            <div className="text-[10px] text-accent/80 font-mono bg-accent/5 p-2.5 rounded-lg border border-accent/10 max-h-[100px] overflow-auto select-text mb-4">
              Chi tiết: {exportError.detail}
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Bạn có thể tải file dạng văn bản thuần (.txt) thay thế bên dưới để tránh gián đoạn công việc:
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  try {
                    exportTxt(exportError.textToFallback, exportError.fallbackFilename);
                  } catch (txtErr) {
                    alert("Không thể tải file văn bản thay thế: " + txtErr.message);
                  }
                  setExportError(null);
                }}
                className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>Tải TXT Thay Thế</span>
              </button>
              <button
                onClick={() => setExportError(null)}
                className="px-3.5 py-2 bg-background hover:bg-border text-text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Payment Popup */}
      {isPremiumPopupOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-surface rounded-3xl shadow-2xl border border-border/80 p-6 mx-4 text-left animate-in zoom-in-95 duration-300 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-icons text-[24px]">workspace_premium</span>
                <h4 className="font-sans font-bold text-base sm:text-lg text-text-primary">Kích Hoạt Gói Premium</h4>
              </div>
              <button 
                onClick={() => setIsPremiumPopupOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-background cursor-pointer"
              >
                <span className="text-2xl font-bold leading-none">&times;</span>
              </button>
            </div>

            {/* Description */}
            <div className="space-y-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
              <p>
                Tính năng <strong>Xuất Word chuẩn Nghị định 30 (Pipeline 5 layer tự động)</strong> là tính năng cao cấp dành riêng cho hội viên trả phí.
              </p>
              <p>
                Quét mã QR qua ứng dụng ngân hàng của bạn. Sau khi thanh toán thành công, hệ thống SePay sẽ tự động gửi <strong>Mã kích hoạt Premium</strong> qua email của bạn trong vòng 30 giây.
              </p>
            </div>

            {/* Payment Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background/50 border border-border rounded-2xl p-4">
              {/* Info */}
              <div className="space-y-2 text-xs text-text-primary flex flex-col justify-center">
                <div className="flex flex-col">
                  <span className="text-[9px] text-text-secondary font-bold uppercase">Ngân hàng</span>
                  <span className="font-bold text-text-primary">VietinBank (ICB)</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-text-secondary font-bold uppercase">Số tài khoản</span>
                  <span className="font-mono font-bold text-primary select-all text-sm">101886888888</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-text-secondary font-bold uppercase">Chủ tài khoản</span>
                  <span className="font-bold text-text-primary uppercase">NGUYEN VAN A</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-text-secondary font-bold uppercase">Số tiền</span>
                  <span className="font-bold text-accent text-sm">99.000 đ</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-text-secondary font-bold uppercase">Nội dung chuyển khoản</span>
                  <span className="font-mono font-bold bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded text-center select-all mt-1">
                    DOC PREMIUM email_cua_ban@gmail.com
                  </span>
                </div>
              </div>

              {/* Styled QR code box */}
              <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-border/80 pt-4 sm:pt-0 sm:pl-4">
                <div className="relative w-36 h-36 bg-white border-4 border-primary rounded-xl flex items-center justify-center p-2 shadow-sm overflow-hidden select-none">
                  {/* Decorative QR Pattern */}
                  <div className="w-full h-full bg-[radial-gradient(#163a70_1.5px,transparent_1.5px)] [background-size:8px_8px] relative opacity-90">
                    {/* QR Finder patterns */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-4 border-[#163a70] bg-white"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-4 border-[#163a70] bg-white"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-4 border-[#163a70] bg-white"></div>
                    {/* Small center logo */}
                    <div className="absolute inset-0 m-auto w-6 h-6 bg-primary rounded flex items-center justify-center text-[10px] text-white font-bold font-sans">
                      DOC
                    </div>
                  </div>
                </div>
                <span className="text-[9px] text-text-secondary font-bold uppercase mt-2 select-none tracking-wider">Quét mã để thanh toán nhanh</span>
              </div>
            </div>

            {/* Note */}
            <div className="text-[10px] text-text-secondary flex items-start gap-1.5 bg-background p-3 rounded-xl border border-border">
              <span className="material-icons text-[14px] text-primary mt-0.5">info</span>
              <p className="leading-normal">
                Vui lòng nhập đúng địa chỉ email của bạn vào <strong>Nội dung chuyển khoản</strong> để hệ thống SePay cấp mã kích hoạt tự động.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
              <button
                onClick={() => setIsPremiumPopupOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-background hover:bg-border text-text-primary border border-border rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const demoKey = "DEMO-PREMIUM-KEY-Decree30";
                  localStorage.setItem('ocr_license_key', demoKey);
                  setIsPremiumPopupOpen(false);
                  alert("Đã áp dụng mã kích hoạt Premium Demo thành công! Vui lòng tải lại trang hoặc lưu cấu hình.");
                  window.location.reload();
                }}
                className="px-4 py-2 text-xs font-bold btn-premium-primary text-white rounded-xl transition-all cursor-pointer shadow-md"
              >
                Kích hoạt Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
