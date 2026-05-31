import { useState, useRef, useCallback, useEffect } from 'react';
import ApiConfig from './components/ApiConfig';
import FileDropzone from './components/FileDropzone';
import QueueList from './components/QueueList';
import ResultViewer from './components/ResultViewer';
import LandingPage from './components/LandingPage';
import MindmapWorkspace from './components/MindmapWorkspace';
import { Settings, Scale } from 'lucide-react';

import { processOCR } from './utils/ocrService';
import { ocrWithOcrSpace } from './utils/ocrSpaceService';
import { splitPdfToImages } from './utils/pdfProcessor';
import { compressImageIfNeeded } from './utils/imageCompressor';
import { normalizeOcrText } from './utils/textNormalizer';

const delay = ms => new Promise(res => setTimeout(res, ms));

const getFallbackModel = (currentModel) => {
  if (!currentModel) return 'gemini-2.5-flash';
  const modelLower = currentModel.toLowerCase();
  if (modelLower !== 'gemini-2.5-flash') {
    return 'gemini-2.5-flash';
  }
  return currentModel;
};

function App() {
  const [config, setConfig] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWorkspaceActive, setIsWorkspaceActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('queue'); // 'queue' hoặc 'result'
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isMindmapOpen, setIsMindmapOpen] = useState(false);
  const [mindmapText, setMindmapText] = useState('');

  // Trạng thái nghiệp vụ và cảnh báo bảo mật tư pháp (Phase 4)
  const [ocrOptions] = useState({
    layoutPreserve: true,
    precisionMode: true,
    normalizeLines: false,
    legalOptimize: true,
    wordNd30: true
  });

  useEffect(() => {
    window.openVideoModal = () => setIsVideoModalOpen(true);
    window.closeVideoModal = () => setIsVideoModalOpen(false);
    localStorage.removeItem('ocr_space_api_key');
    return () => {
      delete window.openVideoModal;
      delete window.closeVideoModal;
    };
  }, []);

  // Bộ chọn dải trang
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);

  const processingRef = useRef(false);
  const filesRef = useRef([]);
  const activeSessionIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  // Cập nhật filesRef để truy cập đồng bộ dữ liệu mới nhất trong vòng lặp bất đồng bộ
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Tìm parent PDF của file đang hoạt động nếu có
  const activeFile = files.find(f => f.id === activeFileId);
  const activeParentPdf = activeFile
    ? (activeFile.isParentPdf ? activeFile : files.find(f => f.id === activeFile.parentPdfId))
    : null;

  // Tự động thiết lập mặc định cho bộ chọn dải trang khi thay đổi file PDF hoạt động
  useEffect(() => {
    if (activeParentPdf) {
      setFromPage(1);
      setToPage(activeParentPdf.totalPages || 1);
    } else {
      setFromPage(1);
      setToPage(1);
    }
  }, [activeParentPdf?.id, activeParentPdf?.totalPages]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
  }, []);

  const resetWorkspaceSession = useCallback((force = false) => {
    if (processingRef.current && !force) {
      const confirmReset = window.confirm("Đang xử lý tài liệu. Bạn có chắc muốn làm mới phiên OCR hiện tại?");
      if (!confirmReset) return false;
    }
    
    // Tăng Session ID và hủy bất kỳ tác vụ chạy ngầm nào
    activeSessionIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    processingRef.current = false;
    setIsProcessing(false);
    setFiles([]);
    setActiveFileId(null);
    setFromPage(1);
    setToPage(1);
    setIsWorkspaceActive(true);
    return true;
  }, []);

  const goBackToHome = useCallback(() => {
    if (processingRef.current) {
      const confirmHome = window.confirm("Đang xử lý tài liệu. Bạn có chắc muốn trở về trang chủ?");
      if (!confirmHome) return;
    }
    
    // Tăng Session ID và hủy bất kỳ tác vụ chạy ngầm nào
    activeSessionIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    processingRef.current = false;
    setIsProcessing(false);
    setFiles([]);
    setActiveFileId(null);
    setFromPage(1);
    setToPage(1);
    setIsWorkspaceActive(false);
  }, []);

  // Xử lý thay đổi ô nhập dải trang
  const handleFromPageChange = (val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setFromPage('');
      return;
    }
    const maxPages = activeParentPdf ? activeParentPdf.totalPages : 1;
    const clamped = Math.max(1, Math.min(num, maxPages));
    setFromPage(clamped);
  };

  const handleToPageChange = (val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setToPage('');
      return;
    }
    const maxPages = activeParentPdf ? activeParentPdf.totalPages : 1;
    const clamped = Math.max(1, Math.min(num, maxPages));
    setToPage(clamped);
  };

  const handleFromPageBlur = () => {
    if (fromPage === '' || fromPage < 1) {
      setFromPage(1);
    } else if (fromPage > toPage) {
      setFromPage(toPage);
    }
  };

  const handleToPageBlur = () => {
    const maxPages = activeParentPdf ? activeParentPdf.totalPages : 1;
    if (toPage === '' || toPage > maxPages) {
      setToPage(maxPages);
    } else if (toPage < fromPage) {
      setToPage(fromPage);
    }
  };

  const handleFilesSelected = (filesToImport) => {
    if (filesToImport.length === 0) return;

    // Validate nhẹ trước khi đưa vào hàng đợi
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    const validatedFiles = filesToImport.filter(file => {
      const type = file.type || '';
      const name = (file.name || '').toLowerCase();
      const isFormatValid = allowedTypes.some(t => type.toLowerCase().includes(t)) || 
                            /\.(png|jpe?g|webp|pdf)$/i.test(name);
      
      if (!isFormatValid) {
        alert(`Tệp "${file.name}" không được hỗ trợ. Chỉ hỗ trợ ảnh PNG, JPG, WEBP và PDF.`);
        return false;
      }
      
      if (file.size > MAX_SIZE) {
        alert(`Tệp "${file.name}" quá lớn (tối đa 100MB). Vui lòng chọn tệp nhỏ hơn.`);
        return false;
      }
      
      return true;
    });

    if (validatedFiles.length === 0) return;

    const newItems = validatedFiles.map(file => {
      const id = Math.random().toString(36).substring(2, 9);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      return {
        id: id,
        name: file.name,
        originalFile: file,
        status: isPdf ? 'splitting' : 'waiting',
        progress: 0,
        result: '',
        error: null,
        isParentPdf: isPdf,
        totalPages: 0
      };
    });

    setIsWorkspaceActive(true);
    setFiles(prev => [...prev, ...newItems]);
    if (newItems.length > 0) {
      setActiveFileId(prev => prev || newItems[0].id);
    }

    // Tăng Session ID và hủy bất kỳ tác vụ chạy ngầm nào của phiên cũ
    activeSessionIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentSessionId = activeSessionIdRef.current;
    const currentSignal = abortControllerRef.current.signal;

    // Thực hiện tách trang PDF bất đồng bộ ngoài call stack chính để tránh đơ giao diện
    setTimeout(() => {
      for (const item of newItems) {
        if (item.isParentPdf) {
          (async () => {
            try {
              const pageImages = await splitPdfToImages(item.originalFile, (current, total) => {
                if (currentSessionId !== activeSessionIdRef.current) return;
                setFiles(prev => prev.map(f => f.id === item.id ? { 
                  ...f, 
                  progress: Math.round((current / total) * 100) 
                } : f));
              }, { signal: currentSignal });

              if (currentSessionId !== activeSessionIdRef.current) return;

              // Không nén song song ở đây. Việc nén sẽ được thực hiện tuần tự/on-the-fly trong processNext khi bắt đầu OCR
              const pageItems = pageImages.map((imgFile, index) => {
                return {
                  id: Math.random().toString(36).substring(2, 9),
                  name: imgFile.name,
                  originalFile: imgFile,
                  status: 'waiting',
                  progress: 0,
                  result: '',
                  error: null,
                  isPdfPage: true,
                  parentPdfId: item.id,
                  pageIndex: index
                };
              });

              setFiles(prev => {
                if (currentSessionId !== activeSessionIdRef.current) return prev;
                const parentIdx = prev.findIndex(f => f.id === item.id);
                if (parentIdx === -1) return prev;

                const updatedPrev = prev.map(f => f.id === item.id ? {
                  ...f,
                  status: 'waiting',
                  progress: 0,
                  totalPages: pageImages.length
                } : f);

                const newFiles = [...updatedPrev];
                newFiles.splice(parentIdx + 1, 0, ...pageItems);
                return newFiles;
              });
            } catch (err) {
              if (currentSessionId !== activeSessionIdRef.current) return;
              console.error("Lỗi phân tách trang PDF:", err);
              setFiles(prev => prev.map(f => f.id === item.id ? { 
                ...f, 
                status: 'error', 
                error: `Lỗi phân tách trang: ${err.message}` 
              } : f));
            }
          })();
        }
      }
    }, 50);
  };

  const handleRemoveFile = (id) => {
    setFiles(prev => {
      const item = prev.find(f => f.id === id);
      if (item && item.isParentPdf) {
        return prev.filter(f => f.id !== id && f.parentPdfId !== id);
      }
      return prev.filter(f => f.id !== id);
    });
    if (activeFileId === id) {
      setActiveFileId(null);
    }
  };

  const handleUpdateResult = (id, newText) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, result: newText } : f));
  };

  const startOcrProcessing = async () => {
    if (isProcessing || processingRef.current) return;

    if (!config || !config.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    const keysArray = config.apiKey.split(',').map(k => k.trim()).filter(Boolean);
    if (keysArray.length === 0) {
      setIsSettingsOpen(true);
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;
    setMobileTab('result'); // Tự động chuyển sang tab kết quả khi bắt đầu xử lý

    // Setup abortControllerRef if not already active, and extract currentSignal and currentSessionId
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    const currentSignal = abortControllerRef.current.signal;
    const currentSessionId = activeSessionIdRef.current;

    // Chọn danh sách ID được phép xử lý
    let allowedIds = [];
    if (activeParentPdf) {
      // Chế độ PDF: Lấy các trang của activeParentPdf, sắp xếp tăng dần theo pageIndex để tránh lệch chỉ số
      const pdfPages = filesRef.current
        .filter(f => f.isPdfPage && f.parentPdfId === activeParentPdf.id)
        .sort((a, b) => a.pageIndex - b.pageIndex);
      
      const totalSubPages = pdfPages.length;
      const startIndex = Math.max(0, parseInt(fromPage) - 1);
      const endIndex = Math.min(totalSubPages - 1, parseInt(toPage) - 1);

      const pageArray = pdfPages;
      const targetPages = [];

      for (let currentIndex = startIndex; currentIndex <= endIndex; currentIndex++) {
        // Bảo vệ an toàn dữ liệu đầu vào (Guard Clause)
        if (!pageArray[currentIndex] || !pageArray[currentIndex].originalFile) {
          continue;
        }
        targetPages.push(pageArray[currentIndex]);
      }

      allowedIds = targetPages.map(p => p.id);
    } else {
      // Chế độ ảnh độc lập
      allowedIds = filesRef.current.filter(f => !f.isPdfPage && !f.isParentPdf).map(f => f.id);
    }

    if (allowedIds.length === 0) {
      alert("Không tìm thấy trang hoặc tệp ảnh nào cần xử lý trong phạm vi dải trang đã chọn.");
      setIsProcessing(false);
      processingRef.current = false;
      return;
    }

    // Reset trạng thái cho các trang trong dải trang được chọn. Các trang ngoài dải trang giữ nguyên trạng thái.
    setFiles(prev => prev.map(f => {
      if (allowedIds.includes(f.id)) {
        return { ...f, status: 'waiting', progress: 0, error: null, retryInfo: null };
      }
      return f;
    }));

    await delay(100);

    let currentKeyIndex = 0;

    const processNext = async () => {
      if (!processingRef.current) return;
      if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

      const fileToProcess = filesRef.current.find(f => allowedIds.includes(f.id) && f.status === 'waiting');
      if (!fileToProcess) {
        if (currentSessionId === activeSessionIdRef.current) {
          setIsProcessing(false);
          processingRef.current = false;
        }
        return;
      }

      setActiveFileId(fileToProcess.id);

      setFiles(prev => {
        if (currentSessionId !== activeSessionIdRef.current) return prev;
        return prev.map(f => f.id === fileToProcess.id ? { 
          ...f, 
          status: 'processing', 
          progress: 20, 
          error: null,
          retryInfo: null
        } : f);
      });

      await delay(50);
      if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

      let success = false;
      let keysTriedForThisFile = 0;
      const maxRetriesPerKey = 3;
      let currentModel = config.model || 'gemini-2.5-flash';

      let attemptIndex = 1;
      const errorsBreakdown = [];
      const pageNum = fileToProcess.pageIndex !== undefined ? fileToProcess.pageIndex + 1 : 1;

      const mapErrorCode = (engine, code) => {
        const codeStr = String(code || 'UNKNOWN').toUpperCase();
        if (engine === 'ocr-space') {
          if (codeStr === 'INVALID_API_KEY') return 'invalid api key';
          if (codeStr === 'E201_LANGUAGE_INVALID') return 'E201 language invalid';
          if (codeStr === 'QUOTA_EXCEEDED') return 'quota exceeded';
          if (codeStr === 'FILE_TOO_LARGE') return 'file too large';
          if (codeStr === 'TIMEOUT') return 'timeout';
          if (codeStr === 'NETWORK') return 'network';
          return 'UNKNOWN';
        } else {
          // Gemini
          if (codeStr === 'INVALID_KEY') return 'invalid key';
          if (codeStr === 'QUOTA_EXCEEDED') return 'quota exceeded';
          if (codeStr === 'RECITATION') return 'RECITATION';
          if (codeStr === 'NETWORK') return 'network';
          if (codeStr === 'BLOCKED_REQUEST') return 'blocked request';
          if (codeStr === 'MALFORMED_REQUEST') return 'malformed request';
          return 'UNKNOWN';
        }
      };

      const logAttempt = (engine, keySource, page, retry, status, errorCode, errorMessage) => {
        const finalErrorCode = status === 'failed' ? mapErrorCode(engine, errorCode) : '';
        const finalErrorMsg = status === 'failed' ? (errorMessage || '') : '';
        
        // Exact log format requested
        const attemptLog = `[OCR Attempt ${attemptIndex}]
engine: ${engine}
key source: ${keySource}
page: ${page}
retry: ${retry}
status: ${status}
error code: ${finalErrorCode || 'none'}
error message: ${finalErrorMsg || 'none'}`;
        
        console.log(attemptLog);

        errorsBreakdown.push({
          attempt: attemptIndex,
          engine: engine,
          keySource: keySource,
          code: finalErrorCode || 'UNKNOWN',
          error: finalErrorMsg || ''
        });

        attemptIndex++;
      };

      const getBreakdownText = () => {
        if (errorsBreakdown.length === 0) return "Đã xảy ra lỗi không xác định.";
        const lines = errorsBreakdown
          .filter(e => e.code !== 'success' && e.code !== 'none')
          .map(e => {
            let label = e.keySource;
            if (label.includes("Gemini Key #")) {
              label = label.replace("Gemini Key #", "Gemini #");
            } else if (e.engine === 'ocr-space') {
              label = "OCR.space";
            }
            return `${label}: ${e.code}${e.error ? ` (${e.error})` : ''}`;
          });
        return lines.join('\n');
      };

      while (!success && keysTriedForThisFile < keysArray.length && processingRef.current && currentSessionId === activeSessionIdRef.current && !currentSignal.aborted) {
        const activeKey = keysArray[currentKeyIndex];
        const keyLabel = `Gemini Key #${currentKeyIndex + 1}`;
        let attemptCount = 0;

        while (!success && attemptCount <= maxRetriesPerKey && processingRef.current && currentSessionId === activeSessionIdRef.current && !currentSignal.aborted) {
          try {
            setFiles(prev => {
              if (currentSessionId !== activeSessionIdRef.current) return prev;
              return prev.map(f => f.id === fileToProcess.id ? { 
                ...f, 
                progress: Math.min(90, 20 + attemptCount * 20) 
              } : f);
            });

            const startTime = Date.now();
            let textResult = null;
            let usedEngine = "gemini";
            let ocrStatus = "success";
            let processingTimeMs = 0;

            let fileToOcr = fileToProcess.originalFile;
            try {
              fileToOcr = await compressImageIfNeeded(fileToOcr);
            } catch (compressErr) {
              console.error("Lỗi khi nén ảnh trước khi OCR:", compressErr);
            }

            if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

            try {
              textResult = await processOCR(
                fileToOcr,
                activeKey,
                currentModel,
                { ...ocrOptions, signal: currentSignal }
              );
              processingTimeMs = Date.now() - startTime;

              logAttempt("gemini", keyLabel, pageNum, false, "success");
            } catch (error) {
              if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

              const errorCode = error.code || (error.name === 'TypeError' ? 'NETWORK' : 'UNKNOWN');
              const errorMsg = error.message;

              logAttempt("gemini", keyLabel, pageNum, false, "failed", errorCode, errorMsg);

              if (error.finishReason === 'RECITATION' || error.message === 'RECITATION' || error.code === 'RECITATION') {
                console.warn(`Trang ${fileToProcess.name} bị lỗi RECITATION. Đang thử lại Gemini với cấu hình an toàn...`);
                
                setFiles(prev => {
                  if (currentSessionId !== activeSessionIdRef.current) return prev;
                  return prev.map(f => f.id === fileToProcess.id ? { 
                    ...f, 
                    status: 'processing', 
                    progress: 50,
                    retryInfo: {
                      customMessage: `Trang ${pageNum} bị chặn. Đang thử lại với cấu hình Gemini an toàn hơn...`,
                      errorMsg: `Phát hiện bộ lọc RECITATION của Google.`,
                      attempt: 1,
                      maxAttempts: 1,
                      secondsLeft: 1
                    }
                  } : f);
                });
                
                await delay(1000);
                if (!processingRef.current || currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

                const retryStartTime = Date.now();
                try {
                  textResult = await processOCR(
                    fileToOcr,
                    activeKey,
                    currentModel,
                    { ...ocrOptions, isRetry: true, signal: currentSignal }
                  );
                  usedEngine = "gemini-retry";
                  processingTimeMs = Date.now() - retryStartTime;
                  logAttempt("gemini-retry", keyLabel, pageNum, true, "success");
                } catch (retryError) {
                  if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

                  const retryErrorCode = retryError.code || (retryError.name === 'TypeError' ? 'NETWORK' : 'UNKNOWN');
                  const retryErrorMsg = retryError.message;

                  logAttempt("gemini-retry", keyLabel, pageNum, true, "failed", retryErrorCode, retryErrorMsg);

                  console.error("Retry Gemini vẫn bị lỗi:", retryError);
                  if (retryError.finishReason === 'RECITATION' || retryError.message === 'RECITATION' || retryError.code === 'RECITATION' || !textResult) {
                    console.warn(`Đang fallback trang ${fileToProcess.name} sang OCR.space...`);
                    setFiles(prev => {
                      if (currentSessionId !== activeSessionIdRef.current) return prev;
                      return prev.map(f => f.id === fileToProcess.id ? { 
                        ...f, 
                        status: 'processing', 
                        progress: 75,
                        retryInfo: {
                          customMessage: `Gemini bị chặn. Đang thử OCR.space...`,
                          errorMsg: `Trang ${pageNum} được xử lý bằng OCR.space.`,
                          attempt: 1,
                          maxAttempts: 1,
                          secondsLeft: 1
                        }
                      } : f);
                    });

                    await delay(1000);
                    if (!processingRef.current || currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

                    const spaceStartTime = Date.now();
                    try {
                      textResult = await ocrWithOcrSpace(
                        fileToOcr,
                        { language: 'vie', signal: currentSignal }
                      );
                      usedEngine = "ocr-space";
                      ocrStatus = "fallback";
                      processingTimeMs = Date.now() - spaceStartTime;
                      logAttempt("ocr-space", "OCR.space Key", pageNum, false, "success");
                    } catch (spaceError) {
                      if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

                      const spaceErrorCode = spaceError.code || "UNKNOWN";
                      const spaceErrorMsg = spaceError.message;

                      logAttempt("ocr-space", "OCR.space Key", pageNum, false, "failed", spaceErrorCode, spaceErrorMsg);

                      const finalErr = new Error(`Không thể xử lý trang ${pageNum}. Vui lòng thử lại hoặc kiểm tra chất lượng ảnh. (Chi tiết: ${spaceError.message})`);
                      finalErr.code = spaceErrorCode;
                      throw finalErr;
                    }
                  } else {
                    throw retryError;
                  }
                }
              } else {
                throw error;
              }
            }

            const durationSec = (processingTimeMs / 1000).toFixed(1);

            if (!processingRef.current || currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

            // Build a list of active OCR modes for metadata display
            const activeOptionsList = [];
            if (ocrOptions.layoutPreserve) activeOptionsList.push("Giữ bố cục");
            if (ocrOptions.precisionMode) activeOptionsList.push("Độ chính xác");
            if (ocrOptions.normalizeLines) activeOptionsList.push("Chuẩn hóa dòng");
            if (ocrOptions.legalOptimize) activeOptionsList.push("Tối ưu pháp lý");
            const ocrModeStr = activeOptionsList.join(", ") || "Mặc định";

            setFiles(prev => {
              if (currentSessionId !== activeSessionIdRef.current) return prev;
              return prev.map(f => f.id === fileToProcess.id ? {
                ...f,
                status: 'completed',
                progress: 100,
                result: normalizeOcrText(textResult),
                retryInfo: null,
                error: null,
                metadata: {
                  duration: durationSec,
                  engine: usedEngine,
                  ocrMode: ocrModeStr,
                  pageNumber: pageNum,
                  engineUsed: usedEngine,
                  status: ocrStatus,
                  processingTimeMs: processingTimeMs
                }
              } : f);
            });

            success = true;

          } catch (error) {
            if (!processingRef.current || currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;

            console.error(`Lỗi OCR với trang ${fileToProcess.name} (Key Index: ${currentKeyIndex}, Lần thử: ${attemptCount + 1}):`, error);

            if (
              error.code === "CONFIG_MISSING" || 
              error.message.includes("Không thể xử lý trang") || 
              error.message.includes("Cấu hình thiếu") || 
              error.message.includes("Lỗi cấu hình") || 
              error.message.includes("OCR.space")
            ) {
              setFiles(prev => {
                if (currentSessionId !== activeSessionIdRef.current) return prev;
                return prev.map(f => f.id === fileToProcess.id ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  error: getBreakdownText(),
                  retryInfo: null,
                  metadata: {
                    pageNumber: pageNum,
                    engineUsed: "ocr-space",
                    status: "failed",
                    errorReason: error.message
                  }
                } : f);
              });
              keysTriedForThisFile = keysArray.length;
              break;
            }

            if (error.finishReason === 'RECITATION' || error.message === 'RECITATION' || error.code === 'RECITATION') {
              const fallbackModel = getFallbackModel(currentModel);
              if (fallbackModel !== currentModel) {
                console.warn(`Phát hiện lỗi bộ lọc RECITATION. Tự động hạ cấp mô hình từ ${currentModel} sang ${fallbackModel} và thử lại ngay lập tức.`);
                currentModel = fallbackModel;
                continue;
              } else {
                setFiles(prev => {
                  if (currentSessionId !== activeSessionIdRef.current) return prev;
                  return prev.map(f => f.id === fileToProcess.id ? {
                    ...f,
                    status: 'error',
                    progress: 0,
                    error: getBreakdownText(),
                    retryInfo: null,
                    metadata: {
                      pageNumber: pageNum,
                      engineUsed: "gemini",
                      status: "failed",
                      errorReason: "Recitation Filter"
                    }
                  } : f);
                });
                keysTriedForThisFile = keysArray.length;
                break;
              }
            }

            let displayError = error.message;
            if (error.message === 'Load failed' || error.name === 'TypeError') {
              displayError = 'Lỗi kết nối trực tiếp máy chủ Google (CORS/Network Error trên Mobile). Hãy kiểm tra kết nối mạng và tính hợp lệ của API Key.';
            }

            attemptCount++;

            if (attemptCount > maxRetriesPerKey) {
              break;
            }

            // Trì hoãn tăng dần: Lần 1 = 2s, Lần 2 = 4s, Lần 3 = 6s
            const delaySeconds = attemptCount * 2;
            const customMessage = `Lỗi xảy ra. Đang tự động thử lại lần ${attemptCount}/${maxRetriesPerKey} với Key hiện tại...`;

            for (let sec = delaySeconds; sec > 0; sec--) {
              if (!processingRef.current || currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;
              setFiles(prev => {
                if (currentSessionId !== activeSessionIdRef.current) return prev;
                return prev.map(f => f.id === fileToProcess.id ? {
                  ...f,
                  status: 'processing',
                  retryInfo: {
                    customMessage: customMessage,
                    errorMsg: displayError,
                    attempt: attemptCount,
                    maxAttempts: maxRetriesPerKey,
                    secondsLeft: sec
                  }
                } : f);
              });
              await delay(1000);
            }
          }
        }

        if (success) {
          break;
        }

        keysTriedForThisFile++;

        if (keysTriedForThisFile < keysArray.length) {
          const oldKeyIndex = currentKeyIndex;
          currentKeyIndex = (currentKeyIndex + 1) % keysArray.length;
          
          console.warn(`Key Index ${oldKeyIndex} thất bại. Chuyển sang Key Index ${currentKeyIndex} dự phòng...`);
          
          setFiles(prev => {
            if (currentSessionId !== activeSessionIdRef.current) return prev;
            return prev.map(f => f.id === fileToProcess.id ? {
              ...f,
              status: 'processing',
              retryInfo: {
                customMessage: `Key lỗi. Đang đổi sang Key dự phòng (${keysTriedForThisFile + 1}/${keysArray.length})...`,
                errorMsg: `Chuyển khóa tự động không trì hoãn.`,
                attempt: 0,
                maxAttempts: maxRetriesPerKey,
                secondsLeft: 1
              }
            } : f);
          });
          
          await delay(500);
        } else {
          // Thử hết tất cả các Key và đều thất bại
          setFiles(prev => {
            if (currentSessionId !== activeSessionIdRef.current) return prev;
            return prev.map(f => f.id === fileToProcess.id ? {
              ...f,
              status: 'error',
              progress: 0,
              error: getBreakdownText(),
              retryInfo: null
            } : f);
          });
        }
      }

      if (processingRef.current && currentSessionId === activeSessionIdRef.current && !currentSignal.aborted) {
        // Nghỉ nhẹ giữa các trang để an toàn
        await delay(1500);
        if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;
        await processNext();
      }
    };

    await processNext();

    if (currentSessionId === activeSessionIdRef.current) {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  if (!isWorkspaceActive) {
    return (
      <>
        <LandingPage 
          onFilesSelected={handleFilesSelected} 
          onOpenSettings={() => setIsSettingsOpen(true)} 
        />
        
        {/* Settings Modal (Global) */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden mx-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
                <h3 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
                  <span className="material-icons text-primary text-[18px]">settings</span>
                  <span>Cấu hình API & Mô hình AI</span>
                </h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)} 
                  className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-background cursor-pointer font-bold"
                >
                  <span className="text-xl font-semibold leading-none">&times;</span>
                </button>
              </div>
              <div className="p-6">
                <ApiConfig onConfigChange={handleConfigChange} />
                <p className="text-xs text-on-surface-variant/70 mt-4 leading-relaxed">
                  * API Key của bạn được lưu cục bộ trong trình duyệt và không bao giờ chuyển đến bất kỳ máy chủ bên thứ ba nào ngoại trừ việc xác thực trực tiếp với Google Gemini API.
                </p>
              </div>
              <div className="flex justify-end px-6 py-4 bg-background border-t border-border">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Video Modal (Global) */}
        {isVideoModalOpen && (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsVideoModalOpen(false);
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div className="relative w-full max-w-3xl bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden mx-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <span>🎥 Hướng dẫn lấy Gemini API Key (30 giây)</span>
                </h3>
                <button 
                  onClick={() => setIsVideoModalOpen(false)} 
                  className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-background cursor-pointer font-bold"
                >
                  <span className="text-xl font-semibold leading-none">&times;</span>
                </button>
              </div>
              {/* Body */}
              <div className="w-full aspect-video bg-black">
                <iframe 
                  id="youtube-iframe"
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/ag0bHshpQ4U?enablejsapi=1" 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans selection:bg-primary-container/10 selection:text-primary flex flex-col scroll-smooth">
      {/* Sticky Header for Workspace Mode */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md h-16 flex items-center border-b border-border">
        <div className="max-w-[1400px] mx-auto w-full flex justify-between items-center px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div 
              onClick={goBackToHome}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
                <Scale size={16} />
              </div>
              <span className="font-bold text-xl tracking-tight text-primary">
                DOC
              </span>
            </div>
            <span className="h-4 w-px bg-border hidden sm:block" />
            <span className="text-xs bg-background text-text-secondary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline-block">
              Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.openVideoModal && window.openVideoModal()}
              className="flex items-center gap-1 px-3 py-2 text-[10px] sm:text-xs font-semibold bg-background hover:bg-border text-on-surface rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <span>🎥 Hướng dẫn</span>
            </button>
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-border hover:border-secondary/30 text-on-surface rounded-xl transition-all cursor-pointer"
            >
              <Settings size={14} />
              <span>Cấu hình API</span>
            </button>
            
            <button
              onClick={goBackToHome}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <span>Trở về Trang chủ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 pt-24 pb-12 flex-1 flex flex-col justify-start w-full min-h-0">
        
        {/* Mobile Tabs Switcher */}
        <div className="flex lg:hidden bg-background p-1 rounded-2xl mb-6 self-center w-full max-w-md border border-border shadow-sm">
          <button
            onClick={() => setMobileTab('queue')}
            className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${mobileTab === 'queue' ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Hàng đợi ({files.filter(f => !f.isPdfPage).length})
          </button>
          <button
            onClick={() => setMobileTab('result')}
            className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${mobileTab === 'result' ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Kết quả OCR
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          
          {/* Left Column: Dropzone + Queue */}
          <div className={`lg:col-span-5 flex-col gap-6 w-full lg:sticky lg:top-24 max-h-[calc(100vh-120px)] ${mobileTab === 'queue' ? 'flex' : 'hidden lg:flex'}`}>
            
            {/* Compact Drag & Drop upload */}
            <div className="bg-surface p-3 rounded-2xl border border-border shadow-sm">
              <FileDropzone onFilesSelected={handleFilesSelected} isCompact={true} />
            </div>
            
            {/* Queue List card */}
            <div className="flex flex-col gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm overflow-hidden flex-1 min-h-[300px] max-h-[500px]">
              <QueueList 
                files={files} 
                activeFileId={activeFileId} 
                onFileClick={(id) => {
                  setActiveFileId(id);
                  setMobileTab('result'); // Tự động chuyển tab xem kết quả khi click chọn file
                }} 
                onRemoveFile={handleRemoveFile}
              />
              
              <div className="pt-4 mt-auto border-t border-border shrink-0 space-y-4">
                {/* Page Range Selector */}
                {activeParentPdf && (
                  <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-on-surface select-none">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Chọn dải trang</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <span className="text-text-secondary">Từ trang:</span>
                        <input
                          type="number"
                          min={1}
                          max={activeParentPdf.totalPages || 1}
                          value={fromPage}
                          onChange={(e) => handleFromPageChange(e.target.value)}
                          onBlur={handleFromPageBlur}
                          disabled={isProcessing || activeParentPdf.status === 'splitting'}
                          className="w-12 h-8 text-center bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-bold text-text-primary"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <span className="text-text-secondary">Đến:</span>
                        <input
                          type="number"
                          min={1}
                          max={activeParentPdf.totalPages || 1}
                          value={toPage}
                          onChange={(e) => handleToPageChange(e.target.value)}
                          onBlur={handleToPageBlur}
                          disabled={isProcessing || activeParentPdf.status === 'splitting'}
                          className="w-12 h-8 text-center bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-bold text-text-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Nút bấm Chuyển đổi chính */}
                <button
                  onClick={startOcrProcessing}
                  disabled={isProcessing || files.length === 0 || (activeParentPdf && activeParentPdf.status === 'splitting')}
                  className="w-full btn-premium-primary text-white py-3.5 px-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
                >
                  {isProcessing ? 'Đang xử lý...' : 'Chuyển đổi ngay'}
                  <span className="material-icons text-[18px]">auto_fix_high</span>
                </button>
              </div>
            </div>
            
          </div>

          {/* Right Column: Result Viewer */}
          <div className={`lg:col-span-7 h-auto lg:h-[calc(100vh-140px)] lg:sticky lg:top-24 w-full ${mobileTab === 'result' ? 'block' : 'hidden lg:block'}`}>
            <ResultViewer 
              file={activeFile} 
              allFiles={files} 
              onUpdateResult={handleUpdateResult} 
              onReset={resetWorkspaceSession}
              ocrOptions={ocrOptions}
              config={config}
              onOpenMindmap={(text) => {
                setMindmapText(text);
                setIsMindmapOpen(true);
              }}
            />
            
            {/* ApiConfig Collapsible in Workspace */}
            <div className="mt-6">
              <ApiConfig onConfigChange={handleConfigChange} />
            </div>
          </div>
          
        </div>
      </main>

      {/* Settings Modal inside Workspace Mode */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
              <h3 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
                <span className="material-icons text-primary text-[18px]">settings</span>
                <span>Cấu hình API & Mô hình AI</span>
              </h3>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-background cursor-pointer font-bold"
              >
                <span className="text-xl font-semibold leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <ApiConfig onConfigChange={handleConfigChange} />
              <p className="text-xs text-on-surface-variant/70 mt-4 leading-relaxed">
                * API Key của bạn được lưu cục bộ trong trình duyệt và không bao giờ chuyển đến bất kỳ máy chủ bên thứ ba nào ngoại trừ việc xác thực trực tiếp với Google Gemini API.
              </p>
            </div>
            <div className="flex justify-end px-6 py-4 bg-background border-t border-border">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Video Modal (Global) */}
      {isVideoModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsVideoModalOpen(false);
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-3xl bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden mx-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <span>🎥 Hướng dẫn lấy Gemini API Key (30 giây)</span>
              </h3>
              <button 
                onClick={() => setIsVideoModalOpen(false)} 
                className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-background cursor-pointer font-bold"
              >
                <span className="text-xl font-semibold leading-none">&times;</span>
              </button>
            </div>
            {/* Body */}
            <div className="w-full aspect-video bg-black">
              <iframe 
                id="youtube-iframe"
                className="w-full h-full"
                src="https://www.youtube.com/embed/ag0bHshpQ4U?enablejsapi=1" 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {isMindmapOpen && (
        <MindmapWorkspace
          ocrText={mindmapText}
          config={config}
          onClose={() => setIsMindmapOpen(false)}
        />
      )}

    </div>
  );
}

export default App;
