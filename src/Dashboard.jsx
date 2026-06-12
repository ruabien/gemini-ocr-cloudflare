import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApiConfig from './components/ApiConfig';
import FileDropzone from './components/FileDropzone';
import QueueList from './components/QueueList';
import ResultViewer from './components/ResultViewer';
import CustomExtractorModal from './components/CustomExtractorModal';
import { Settings, Scale, Shield, Users, Key, LogOut } from 'lucide-react';

import { processOCR } from './utils/ocrService';
import { GeminiKeyManager } from './utils/geminiKeyManager';
import { ocrWithOcrSpace } from './utils/ocrSpaceService';
import { splitPdfToImages } from './utils/pdfProcessor';
import { compressImageIfNeeded } from './utils/imageCompressor';
import { normalizeOcrText } from './utils/textNormalizer';
import { isPremiumUser, FREE_MAX_IMAGE_SIZE_MB, FREE_MAX_PDF_SIZE_MB, PREMIUM_MAX_FILE_SIZE_MB } from './utils/premiumHelper';

const delay = ms => new Promise(res => setTimeout(res, ms));

const getFallbackModel = (currentModel) => {
  if (!currentModel) return 'gemini-2.5-flash';
  const modelLower = currentModel.toLowerCase();
  if (modelLower !== 'gemini-2.5-flash') {
    return 'gemini-2.5-flash';
  }
  return currentModel;
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [config, setConfig] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileTab, setMobileTab] = useState('queue'); // 'queue' hoặc 'result'
  const [isCustomExtractorOpen, setIsCustomExtractorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tools'); // 'tools' hoặc 'account'

  // Trạng thái thành viên trong nhóm (Account Management tab)
  const [members, setMembers] = useState([
    { id: 1, name: 'Nguyễn Văn A', email: 'vanga@kiem-sat.gov.vn', role: 'Quản trị viên' },
    { id: 2, name: 'Trần Thị B', email: 'thib@kiem-sat.gov.vn', role: 'Thành viên' },
    { id: 3, name: 'Lê Văn C', email: 'vanc@kiem-sat.gov.vn', role: 'Thành viên' },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Thành viên');

  // Trạng thái nghiệp vụ và cảnh báo bảo mật tư pháp (Phase 4)
  const [ocrOptions] = useState({
    layoutPreserve: true,
    precisionMode: true,
    normalizeLines: false,
    legalOptimize: true,
    wordNd30: true
  });

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

  // Bộ chọn dải trang
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);

  // Tự động thiết lập mặc định cho bộ chọn dải trang khi thay đổi file PDF hoạt động
  useEffect(() => {
    if (activeParentPdf) {
      setFromPage(1);
      setToPage(activeParentPdf.totalPages || 1);
    } else {
      setFromPage(1);
      setToPage(1);
    }
  }, [activeParentPdf?.id, activeParentPdf?.totalPages]);

  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
  }, []);

  const resetWorkspaceSession = useCallback((force = false) => {
    if (processingRef.current && !force) {
      const confirmReset = window.confirm("Đang xử lý tài liệu. Bạn có chắc muốn làm mới phiên OCR hiện tại?");
      if (!confirmReset) return false;
    }
    
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
    return true;
  }, []);

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

  const handleFilesSelected = useCallback((filesToImport) => {
    if (filesToImport.length === 0) return;

    const validatedFiles = filesToImport.filter(file => {
      const type = file.type || '';
      const name = (file.name || '').toLowerCase();
      const isPdf = name.endsWith('.pdf') || type === 'application/pdf';
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      
      const isFormatValid = allowedTypes.some(t => type.toLowerCase().includes(t)) || 
                            /\.(png|jpe?g|webp|pdf)$/i.test(name);
      
      if (!isFormatValid) {
        alert(`Tệp "${file.name}" không được hỗ trợ. Chỉ hỗ trợ ảnh PNG, JPG, WEBP và PDF.`);
        return false;
      }
      
      const isPremium = isPremiumUser();
      let limitBytes;
      let reasonMessage;
      
      if (isPremium) {
        limitBytes = PREMIUM_MAX_FILE_SIZE_MB * 1024 * 1024;
        reasonMessage = `Tệp "${file.name}" quá lớn. File vượt giới hạn ${PREMIUM_MAX_FILE_SIZE_MB}MB của gói Premium.`;
      } else {
        const freeLimitMb = isPdf ? FREE_MAX_PDF_SIZE_MB : FREE_MAX_IMAGE_SIZE_MB;
        limitBytes = freeLimitMb * 1024 * 1024;
        reasonMessage = `Tệp "${file.name}" quá lớn. File vượt giới hạn gói miễn phí. Nâng cấp Premium để xử lý file lên tới 50MB.`;
      }
      
      if (file.size > limitBytes) {
        alert(reasonMessage);
        return false;
      }
      
      return true;
    });

    if (validatedFiles.length === 0) return;

    if (isProcessing) {
      alert("Hệ thống đang xử lý OCR. Vui lòng đợi quá trình hiện tại hoàn tất.");
      return;
    }

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

    setFiles(prev => [...prev, ...newItems]);
    if (newItems.length > 0) {
      setActiveFileId(prev => prev || newItems[0].id);
    }

    activeSessionIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentSessionId = activeSessionIdRef.current;
    const currentSignal = abortControllerRef.current.signal;

    setTimeout(async () => {
      for (const item of newItems) {
        if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) {
          break;
        }

        if (item.isParentPdf) {
          try {
            const pageImages = await splitPdfToImages(item.originalFile, (current, total) => {
              if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) return;
              setFiles(prev => prev.map(f => f.id === item.id ? { 
                ...f, 
                progress: Math.round((current / total) * 100) 
              } : f));
            }, { signal: currentSignal });

            if (currentSessionId !== activeSessionIdRef.current || currentSignal.aborted) {
              break;
            }

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
                status: 'completed',
                progress: 100,
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
        }
      }
    }, 50);
  }, [isProcessing]);

  // Nhận các file chuyển từ LandingPage qua Route state
  useEffect(() => {
    if (location.state?.initialFiles && location.state.initialFiles.length > 0) {
      handleFilesSelected(location.state.initialFiles);
      // Xoá state để tránh nạp lại khi người dùng refresh trang
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, handleFilesSelected, navigate, location.pathname]);

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

    const keysArray = GeminiKeyManager.getKeys(config);
    if (keysArray.length === 0) {
      setActiveTab('account');
      alert("Vui lòng cấu hình API Key trước khi thực hiện OCR.");
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;
    setMobileTab('result');

    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    const currentSignal = abortControllerRef.current.signal;
    const currentSessionId = activeSessionIdRef.current;

    let allowedIds = [];
    if (activeParentPdf) {
      const pdfPages = filesRef.current
        .filter(f => f.isPdfPage && f.parentPdfId === activeParentPdf.id)
        .sort((a, b) => a.pageIndex - b.pageIndex);
      
      const totalSubPages = pdfPages.length;
      const startIndex = Math.max(0, parseInt(fromPage) - 1);
      const endIndex = Math.min(totalSubPages - 1, parseInt(toPage) - 1);

      const pageArray = pdfPages;
      const targetPages = [];

      for (let currentIndex = startIndex; currentIndex <= endIndex; currentIndex++) {
        if (!pageArray[currentIndex] || !pageArray[currentIndex].originalFile) {
          continue;
        }
        targetPages.push(pageArray[currentIndex]);
      }

      allowedIds = targetPages.map(p => p.id);
    } else {
      allowedIds = filesRef.current.filter(f => !f.isPdfPage && !f.isParentPdf).map(f => f.id);
    }

    if (allowedIds.length === 0) {
      alert("Không tìm thấy trang hoặc tệp ảnh nào cần xử lý trong phạm vi dải trang đã chọn.");
      setIsProcessing(false);
      processingRef.current = false;
      return;
    }

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
      let currentModel = GeminiKeyManager.getModel(config);

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

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) return;
    const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
    setMembers([...members, { id: newId, name: newMemberName, email: newMemberEmail, role: newMemberRole }]);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleRemoveMember = (id) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const handleSignOut = () => {
    if (processingRef.current) {
      const confirmSignOut = window.confirm("Đang xử lý tài liệu. Bạn có chắc chắn muốn đăng xuất không?");
      if (!confirmSignOut) return;
    }
    // Hủy bỏ OCR
    resetWorkspaceSession(true);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans selection:bg-primary-container/10 selection:text-primary flex flex-col scroll-smooth">
      {/* Sticky Dashboard Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1E36] text-white h-16 flex items-center border-b border-white/10 shadow-md">
        <div className="max-w-[1400px] mx-auto w-full flex justify-between items-center px-4 md:px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-white shadow-sm">
                <Scale size={16} />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                DOC
              </span>
            </div>
            
            <nav className="hidden md:flex items-center gap-2 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('tools')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'tools' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                Công cụ số hóa
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'account' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                Cấu hình & Thành viên
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/80 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span>Kiểm sát viên: vanga@kiem-sat.gov.vn</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-accent hover:bg-accent-hover text-white rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Subheader Navigation for Mobile */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-[#0F2952] border-b border-white/10 flex text-white text-xs font-bold shadow-sm">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 text-center py-3 ${activeTab === 'tools' ? 'border-b-2 border-white text-white' : 'text-white/60'}`}
        >
          Công cụ số hóa
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`flex-1 text-center py-3 ${activeTab === 'account' ? 'border-b-2 border-white text-white' : 'text-white/60'}`}
        >
          Cấu hình & Thành viên
        </button>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-24 pb-12 flex-1 flex flex-col justify-start w-full min-h-0">
        {activeTab === 'tools' ? (
          <>
            {/* Mobile Tabs Switcher for Tools Queue vs Results */}
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
                <div className="bg-surface p-3 rounded-2xl border border-border shadow-sm">
                  <FileDropzone onFilesSelected={handleFilesSelected} isCompact={true} disabled={isProcessing} />
                </div>
                
                <div className="flex flex-col gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm overflow-hidden flex-1 min-h-[300px] max-h-[500px]">
                  <QueueList 
                    files={files} 
                    activeFileId={activeFileId} 
                    onFileClick={(id) => {
                      setActiveFileId(id);
                      setMobileTab('result');
                    }} 
                    onRemoveFile={handleRemoveFile}
                  />
                  
                  <div className="pt-4 mt-auto border-t border-border shrink-0 space-y-4">
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
                    
                    {(() => {
                      const isPremium = isPremiumUser();
                      const activeFile = files.find(f => f.id === activeFileId);
                      const activeParentPdf = activeFile
                        ? (activeFile.isParentPdf ? activeFile : files.find(f => f.id === activeFile.parentPdfId))
                        : null;

                      const packageLabel = isPremium ? "Premium" : "Miễn phí";
                      const limitLabel = isPremium ? `${PREMIUM_MAX_FILE_SIZE_MB}MB` : `Ảnh ${FREE_MAX_IMAGE_SIZE_MB}MB | PDF ${FREE_MAX_PDF_SIZE_MB}MB`;

                      let processingDetail = null;
                      if (isProcessing && activeFile) {
                        const activeProcessingFile = files.find(f => f.status === 'processing');
                        if (activeProcessingFile) {
                          const parent = activeProcessingFile.isPdfPage 
                            ? files.find(f => f.id === activeProcessingFile.parentPdfId)
                            : null;
                          const sizeBytes = parent 
                            ? parent.originalFile?.size 
                            : activeProcessingFile.originalFile?.size;
                          const sizeMb = sizeBytes ? (sizeBytes / 1024 / 1024).toFixed(1) : '0';
                          
                          const pageNum = activeProcessingFile.isPdfPage ? activeProcessingFile.pageIndex + 1 : 1;
                          const totalPages = parent ? parent.totalPages : 1;
                          
                          processingDetail = `${packageLabel}: đang xử lý file ${sizeMb}MB, ${activeProcessingFile.isPdfPage ? `trang ${pageNum}/${totalPages}` : '1/1'}`;
                        }
                      }

                      return (
                        <div className="bg-background/40 border border-border rounded-xl p-3 text-[11px] font-medium space-y-1 text-text-secondary select-none">
                          <div className="flex justify-between items-center">
                            <span>Gói tài khoản:</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${isPremium ? 'bg-primary/10 text-primary' : 'bg-text-secondary/10 text-text-secondary'}`}>
                              {packageLabel}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Giới hạn file:</span>
                            <span className="font-bold text-text-primary">{limitLabel}</span>
                          </div>
                          
                          {!isProcessing && activeFile && !activeFile.isPdfPage && (
                            <div className="flex justify-between items-center border-t border-border/50 pt-1.5 mt-1.5">
                              <span>Dung lượng file đang chọn:</span>
                              <span className="font-bold text-text-primary">
                                {(activeFile.originalFile?.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          )}
                          
                          {!isProcessing && activeParentPdf && (
                            <div className="flex justify-between items-center border-t border-border/50 pt-1.5 mt-1.5">
                              <span>Dung lượng tệp PDF gốc:</span>
                              <span className="font-bold text-text-primary">
                                {(activeParentPdf.originalFile?.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          )}

                          {processingDetail && (
                            <div className="flex items-center gap-1.5 border-t border-border/50 pt-2 mt-2 text-primary font-bold animate-pulse text-[10px] uppercase tracking-wider">
                              <span className="material-icons text-[14px]">sync</span>
                              <span>{processingDetail}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
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
                  onOpenCustomExtractor={() => setIsCustomExtractorOpen(true)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-8 animate-fade-up">
            {/* Account Settings / API config header */}
            <div className="text-left space-y-2">
              <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <Key className="text-primary" />
                <span>Cấu hình API & Quản lý Nhóm</span>
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Thiết lập khóa API Gemini của riêng cơ quan/tổ chức bạn và cấu hình danh sách các thành viên được phân quyền sử dụng tài nguyên.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* API Configuration */}
              <div className="md:col-span-6 space-y-6">
                <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-1.5">
                    <Key size={16} className="text-primary" />
                    <span>Cấu hình khóa API</span>
                  </h3>
                  <ApiConfig onConfigChange={handleConfigChange} />
                </div>
              </div>

              {/* Members Management */}
              <div className="md:col-span-6 space-y-6">
                <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm text-left">
                  <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-1.5">
                    <Users size={16} className="text-primary" />
                    <span>Danh sách thành viên ({members.length})</span>
                  </h3>

                  <div className="space-y-3 mb-6 max-h-[250px] overflow-y-auto pr-1">
                    {members.map(member => (
                      <div key={member.id} className="flex justify-between items-center p-3 bg-background rounded-xl border border-border">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-text-primary">{member.name}</p>
                          <p className="text-[10px] text-text-secondary font-mono">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            {member.role}
                          </span>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-accent hover:text-accent-hover p-1 hover:bg-accent/5 rounded transition-colors cursor-pointer"
                            title="Xóa thành viên"
                          >
                            <span className="material-icons text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Member Form */}
                  <form onSubmit={handleAddMember} className="border-t border-border pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-text-secondary">Thêm thành viên mới</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Họ và tên"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="h-9 px-3 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-text-primary"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        className="h-9 px-3 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-text-primary"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="flex-1 h-9 px-2 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium text-text-primary"
                      >
                        <option value="Thành viên">Thành viên</option>
                        <option value="Quản trị viên">Quản trị viên</option>
                      </select>
                      <button
                        type="submit"
                        className="h-9 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        Thêm mới
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Custom Extractor Modal */}
      <CustomExtractorModal 
        isOpen={isCustomExtractorOpen} 
        onClose={() => setIsCustomExtractorOpen(false)} 
        activeFile={activeFile} 
        allFiles={files} 
        config={config} 
      />
    </div>
  );
}