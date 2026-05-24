import { useState, useRef, useCallback, useEffect } from 'react';
import ApiConfig from './components/ApiConfig';
import FileDropzone from './components/FileDropzone';
import QueueList from './components/QueueList';
import ResultViewer from './components/ResultViewer';

import { processOCR } from './utils/ocrService';
import { splitPdfToImages } from './utils/pdfProcessor';
import { compressImageIfNeeded } from './utils/imageCompressor';

function App() {
  const [config, setConfig] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Bộ chọn dải trang
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);

  const processingRef = useRef(false);
  const filesRef = useRef([]);

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
  }, [activeParentPdf?.id, activeParentPdf?.totalPages]);

  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
  }, []);

  const handleReset = useCallback(() => {
    processingRef.current = false;
    setIsProcessing(false);
    setFiles([]);
    setActiveFileId(null);
    setFromPage(1);
    setToPage(1);
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

  const handleFilesSelected = async (newOriginalFiles) => {
    // 1. Thực hiện nén các ảnh trực tiếp nếu dung lượng > 1.5MB trước khi cho vào hàng đợi
    const processedFiles = await Promise.all(
      newOriginalFiles.map(async (file) => {
        try {
          return await compressImageIfNeeded(file);
        } catch (err) {
          console.error("Lỗi khi nén ảnh nạp vào:", file.name, err);
          return file; // Fallback
        }
      })
    );

    const newItems = processedFiles.map(file => {
      const id = Math.random().toString(36).substring(2, 9);
      const isPdf = file.type === 'application/pdf';
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

    // Kích hoạt tách trang ngay cho các file PDF được chọn
    for (const item of newItems) {
      if (item.isParentPdf) {
        (async () => {
          try {
            const pageImages = await splitPdfToImages(item.originalFile, (current, total) => {
              setFiles(prev => prev.map(f => f.id === item.id ? { 
                ...f, 
                progress: Math.round((current / total) * 100) 
              } : f));
            });

            // 2. Thực hiện nén các trang ảnh PDF được tách ra nếu dung lượng > 1.5MB
            const compressedPages = await Promise.all(
              pageImages.map(async (pageImg) => {
                try {
                  return await compressImageIfNeeded(pageImg);
                } catch (err) {
                  console.error("Lỗi khi nén trang PDF:", pageImg.name, err);
                  return pageImg; // Fallback
                }
              })
            );

            const pageItems = compressedPages.map((imgFile, index) => {
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
    if (!config || !config.apiKey) {
      alert("Vui lòng cấu hình API Key ở phía trên cùng trước khi bắt đầu.");
      return;
    }

    const keysArray = config.apiKey.split(',').map(k => k.trim()).filter(Boolean);
    if (keysArray.length === 0) {
      alert("Vui lòng nhập cấu hình API Key hợp lệ.");
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;

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

    await new Promise(resolve => setTimeout(resolve, 100));

    let currentKeyIndex = 0;

    const processNext = async () => {
      if (!processingRef.current) return;

      const fileToProcess = filesRef.current.find(f => allowedIds.includes(f.id) && f.status === 'waiting');
      if (!fileToProcess) {
        setIsProcessing(false);
        processingRef.current = false;
        return;
      }

      setActiveFileId(fileToProcess.id);

      setFiles(prev => prev.map(f => f.id === fileToProcess.id ? { 
        ...f, 
        status: 'processing', 
        progress: 20, 
        error: null,
        retryInfo: null
      } : f));

      await new Promise(resolve => setTimeout(resolve, 50));

      let success = false;
      let attemptCount = 0;
      const maxAttempts = keysArray.length * 3;

      while (!success && processingRef.current) {
        const activeKey = keysArray[currentKeyIndex];
        try {
          setFiles(prev => prev.map(f => f.id === fileToProcess.id ? { 
            ...f, 
            progress: Math.min(90, 20 + attemptCount * 10) 
          } : f));

          const textResult = await processOCR(
            fileToProcess.originalFile,
            activeKey,
            config.model || 'gemini-2.5-flash',
            config.workerUrl
          );

          if (!processingRef.current) return;

          setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
            ...f,
            status: 'completed',
            progress: 100,
            result: textResult,
            retryInfo: null,
            error: null
          } : f));

          success = true;

        } catch (error) {
          if (!processingRef.current) return;

          console.error(`Lỗi OCR với trang ${fileToProcess.name} (Key Index: ${currentKeyIndex}):`, error);

          let displayError = error.message;
          if (error.message === 'Load failed' || error.name === 'TypeError') {
            displayError = 'Lỗi kết nối trực tiếp máy chủ Google (CORS/Network Error trên Mobile). Hãy kiểm tra kết nối mạng và tính hợp lệ của API Key.';
          }

          // Bắt lỗi 429 / 403 / Hạn mức / Quá giới hạn
          const isRateLimitOrPermission = error.status === 429 || error.status === 403 || 
            /429|403|limit|quota|exhausted|forbidden|permission/i.test(error.message || '');

          if (isRateLimitOrPermission) {
            attemptCount++;
            if (attemptCount >= maxAttempts) {
              setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
                ...f,
                status: 'error',
                progress: 0,
                error: `Đã thử lại xoay vòng tất cả Key dự phòng nhưng vẫn gặp lỗi giới hạn: ${displayError}`,
                retryInfo: null
              } : f));
              break;
            }

            // Xoay Key tiếp theo
            currentKeyIndex = (currentKeyIndex + 1) % keysArray.length;
            const customMessage = keysArray.length > 1 ? 'Đang chuyển sang Key dự phòng...' : 'Đang tự động thử lại...';

            for (let sec = 2; sec > 0; sec--) {
              if (!processingRef.current) return;
              setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
                ...f,
                status: 'processing',
                retryInfo: {
                  customMessage: `${customMessage} (Thử lại sau ${sec}s)`,
                  errorMsg: displayError,
                  attempt: attemptCount,
                  maxAttempts: maxAttempts,
                  secondsLeft: sec
                }
              } : f));
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            // Lỗi thông thường khác, không xoay key mà báo lỗi luôn
            setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
              ...f,
              status: 'error',
              progress: 0,
              error: displayError,
              retryInfo: null
            } : f));
            break;
          }
        }
      }

      if (processingRef.current) {
        // Nghỉ nhẹ giữa các trang để an toàn
        await new Promise(resolve => setTimeout(resolve, 1500));
        await processNext();
      }
    };

    await processNext();

    setIsProcessing(false);
    processingRef.current = false;
  };

  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqItems = [
    {
      q: "Ứng dụng này có an toàn và bảo mật thông tin không?",
      a: "Hoàn toàn bảo mật! Ứng dụng chạy trực tiếp trên trình duyệt của bạn (Client-Side). Tất cả tệp hình ảnh, tài liệu PDF và nội dung trích xuất đều được xử lý cục bộ và gửi trực tiếp tới API của Google qua HTTPS. Chúng tôi không sử dụng máy chủ trung gian và không lưu trữ bất kỳ dữ liệu nào của bạn."
    },
    {
      q: "API Key của tôi được lưu trữ ở đâu?",
      a: "API Key được lưu trữ trực tiếp trong localStorage trên trình duyệt cá nhân của bạn. Dữ liệu này được lưu cục bộ bởi trình duyệt và không bao giờ bị gửi ra ngoài ngoại trừ việc xác thực trực tiếp với máy chủ Google Gemini."
    },
    {
      q: "Tại sao ứng dụng lại tự động ghép kết quả thành một hàng ngang?",
      a: "Đây là tính năng tối ưu đặc biệt được thiết kế cho các tác vụ tự động hóa và nhập liệu nhanh (ví dụ: dán dữ liệu vào Word, Excel hoặc Ai). Việc ghép văn bản thành một dòng giúp loại bỏ các ký tự xuống dòng phức tạp gây lỗi định dạng bảng biểu."
    },
    {
      q: "Làm thế nào để lấy Gemini API Key miễn phí?",
      a: (
        <span>
          Bạn có thể truy cập Google AI Studio (aistudio.google.com), đăng nhập bằng tài khoản Google của bạn và nhấn nút "Get API key" để tạo một mã khóa mới hoàn toàn miễn phí.{" "}
          <a
            href="https://www.youtube.com/watch?v=ag0bHshpQ4U"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-500 font-semibold underline inline-flex items-center gap-0.5"
          >
            Xem Video hướng dẫn
          </a>
        </span>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-container/10 selection:text-primary flex flex-col scroll-smooth">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md h-[60px] flex items-center border-b border-outline-variant/30">
        <div className="max-w-[1200px] mx-auto w-full flex justify-between items-center px-4 md:px-8">
          <img 
            src="/logo.svg" 
            alt="DOC Logo" 
            onClick={handleReset}
            className="h-8 w-auto object-contain cursor-pointer transition-all duration-300 hover:scale-105 select-none" 
          />
          <nav className="hidden md:flex items-center gap-8">
            <button 
              className="text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer" 
              onClick={() => scrollToSection('cong-cu')}
            >
              Công cụ OCR
            </button>
            <button 
              className="text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer" 
              onClick={() => scrollToSection('so-sanh')}
            >
              So sánh
            </button>
            <button 
              className="text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer" 
              onClick={() => scrollToSection('faq')}
            >
              Hỏi đáp
            </button>
          </nav>
          <div className="flex items-center md:hidden">
            <button className="material-icons text-on-surface-variant hover:text-secondary transition-colors duration-200">menu</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 pt-20 pb-12 space-y-16 flex-1 flex flex-col justify-start w-full">
        {/* Section 1: Hero & App */}
        <section id="cong-cu" className="w-full text-center space-y-8">
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-display-lg-mobile md:text-display-lg font-display-lg text-primary tracking-tight">
              Chuyển đổi PDF & Hình ảnh sang Văn bản
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-md mx-auto">
              Biến mọi tài liệu giấy thành văn bản soạn thảo chỉ trong vài giây với công nghệ AI hiện đại.
            </p>
          </div>

          {files.length === 0 ? (
            <div className="flex flex-col gap-8">
              <div className="max-w-md mx-auto w-full">
                <FileDropzone onFilesSelected={handleFilesSelected} />
              </div>
              <div className="max-w-4xl mx-auto w-full">
                <ApiConfig onConfigChange={handleConfigChange} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                {/* Left Column: Dropzone + Queue */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/30 shadow-sm">
                    <FileDropzone onFilesSelected={handleFilesSelected} />
                  </div>
                  
                  <div className="flex flex-col gap-4 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 flex-1 max-h-[600px] overflow-hidden shadow-sm">
                    <QueueList 
                      files={files} 
                      activeFileId={activeFileId} 
                      onFileClick={setActiveFileId}
                      onRemoveFile={handleRemoveFile}
                    />
                    
                    <div className="pt-4 mt-auto border-t border-outline-variant/20 shrink-0 space-y-4">
                      {/* Page Range Selector */}
                      {activeParentPdf && (
                        <div className="bg-surface border border-outline-variant/40 rounded-xl p-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-on-surface select-none">
                            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Chọn dải trang</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <span className="text-on-surface-variant">Từ trang:</span>
                              <input
                                type="number"
                                min={1}
                                max={activeParentPdf.totalPages || 1}
                                value={fromPage}
                                onChange={(e) => handleFromPageChange(e.target.value)}
                                onBlur={handleFromPageBlur}
                                disabled={isProcessing || activeParentPdf.status === 'splitting'}
                                className="w-12 h-8 text-center bg-white border border-outline-variant/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-bold text-on-surface"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <span className="text-on-surface-variant">Đến:</span>
                              <input
                                type="number"
                                min={1}
                                max={activeParentPdf.totalPages || 1}
                                value={toPage}
                                onChange={(e) => handleToPageChange(e.target.value)}
                                onBlur={handleToPageBlur}
                                disabled={isProcessing || activeParentPdf.status === 'splitting'}
                                className="w-12 h-8 text-center bg-white border border-outline-variant/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-bold text-on-surface"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={startOcrProcessing}
                        disabled={isProcessing || files.length === 0 || (activeParentPdf && activeParentPdf.status === 'splitting')}
                        className="w-full bg-primary hover:bg-primary-container text-on-primary py-3.5 px-4 rounded-full font-headline-md shadow-lg shadow-primary/20 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isProcessing ? 'Đang xử lý...' : 'Chuyển đổi ngay'}
                        <span className="material-icons">auto_fix_high</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Result Viewer */}
                <div className="lg:col-span-7 h-auto lg:h-[calc(100vh-140px)] sticky top-20">
                  <ResultViewer 
                    file={activeFile} 
                    allFiles={files} 
                    onUpdateResult={handleUpdateResult} 
                    onReset={handleReset}
                  />
                </div>
              </div>
              <div className="max-w-4xl mx-auto w-full">
                <ApiConfig onConfigChange={handleConfigChange} />
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Comparison */}
        <section id="so-sanh" className="w-full space-y-8 pt-10">
          <div className="text-center space-y-2">
            <h2 className="text-headline-lg font-headline-lg text-primary">Tại sao nên chọn DOC?</h2>
            <p className="text-on-surface-variant text-body-md font-medium">So sánh sự khác biệt vượt trội</p>
          </div>

          <div className="space-y-6">
            <div className="hidden md:grid grid-cols-2 gap-0 mb-2">
              <div className="text-center py-2 bg-error-container/10 rounded-l-xl border border-outline-variant/30">
                <span className="text-label-md font-bold text-error uppercase tracking-widest">Cách cũ (Truyền thống)</span>
              </div>
              <div className="text-center py-2 bg-tertiary-container/10 rounded-r-xl border border-outline-variant/30 border-l-0">
                <span className="text-label-md font-bold text-tertiary uppercase tracking-widest">Giải pháp DOC</span>
              </div>
            </div>

            {/* Row 1: Tối ưu quy trình xử lý */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-5 border-b md:border-b-0 md:border-r border-outline-variant/20 bg-error-container/5">
                  <div className="flex gap-3">
                    <span className="material-icons text-error shrink-0">heart_broken</span>
                    <div>
                      <p className="text-body-md text-on-surface-variant leading-relaxed">
                        Phải upload từng trang tài liệu lên Google Drive, chờ đợi bóc tách rồi cặm cụi copy từng đoạn thủ công cực kỳ mất thời gian.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-tertiary-container/5">
                  <div className="flex gap-3">
                    <span className="material-icons text-tertiary shrink-0">verified</span>
                    <div>
                      <p className="text-body-md text-on-surface leading-relaxed">
                        Hỗ trợ OCR hàng loạt thả ga, tự động xử lý mượt mà hàng chục file ảnh/PDF cùng một lúc nhờ hệ thống hàng đợi thông minh.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Chuẩn hóa định dạng đầu ra */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-5 border-b md:border-b-0 md:border-r border-outline-variant/20 bg-error-container/5">
                  <div className="flex gap-3">
                    <span className="material-icons text-error shrink-0">cancel</span>
                    <div>
                      <p className="text-body-md text-on-surface-variant leading-relaxed">
                        Văn bản bị lỗi dính chữ, dính khoảng trắng, xuống dòng vô tội vạ; xuất file .docx trực tuyến nhưng thực chất là chứa ảnh dán vào, không chỉnh sửa được.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-tertiary-container/5">
                  <div className="flex gap-3">
                    <span className="material-icons text-tertiary shrink-0">check_circle</span>
                    <div>
                      <p className="text-body-md text-on-surface leading-relaxed">
                        Tự động dàn phẳng văn bản trên 1 dòng duy nhất (Single-line), xóa sạch ký tự rác và xuống dòng dư thừa, sẵn sàng copy-paste dùng ngay.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Độ chính xác & Giới hạn sử dụng */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-5 border-b md:border-b-0 md:border-r border-outline-variant/20 bg-error-container/5">
                  <div className="flex gap-3">
                    <span className="material-icons text-error shrink-0">payments</span>
                    <div>
                      <p className="text-body-md text-on-surface-variant leading-relaxed">
                        Ứng dụng nước ngoài nhận diện tiếng Việt không chuẩn, lại giới hạn số trang (1-2 trang) và ép nâng cấp gói trả phí đắt đỏ.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-tertiary-container/5">
                  <div className="flex gap-3">
                    <span className="material-icons text-tertiary shrink-0">all_inclusive</span>
                    <div>
                      <p className="text-body-md text-on-surface leading-relaxed">
                        Tận dụng sức mạnh AI tối tân từ Gemini để tự động sửa lỗi chính tả theo ngữ cảnh, dùng API Key cá nhân miễn phí không lo giới hạn.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Bảo mật dữ liệu */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-5 border-b md:border-b-0 md:border-r border-outline-variant/20 bg-error-container/5">
                  <div className="flex gap-3">
                    <span className="material-icons text-error shrink-0">warning</span>
                    <div>
                      <p className="text-body-md text-on-surface-variant leading-relaxed">
                        E ngại tài liệu tối mật của doanh nghiệp bị lưu trữ và rò rỉ trên máy chủ của bên thứ ba.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-tertiary-container/5">
                  <div className="flex gap-3">
                    <span className="material-icons text-tertiary shrink-0">security</span>
                    <div>
                      <p className="text-body-md text-on-surface leading-relaxed">
                        Cam kết bảo mật tuyệt đối với mô hình Zero-Server – toàn bộ file được xử lý trực tiếp trên trình duyệt, không một ai có thể đọc trộm.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: FAQ */}
        <section id="faq" className="w-full space-y-8 pt-10">
          <h2 className="text-headline-lg font-headline-lg text-center text-primary">Câu hỏi thường gặp</h2>
          <div className="space-y-4 max-w-4xl mx-auto">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 open:border-primary/30 transition-all overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="flex justify-between items-center p-5 cursor-pointer text-body-lg font-bold text-on-surface hover:text-primary hover:bg-primary-container/5 transition-colors focus:outline-none w-full text-left"
                  >
                    <span>{item.q}</span>
                    <span className={`material-icons transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}>
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-on-surface-variant leading-relaxed text-body-md border-t border-outline-variant/10 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest dark:bg-inverse-surface py-12 border-t border-outline-variant/30">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 text-center">
          <p className="text-label-md text-on-surface-variant">© 2026 DOC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
