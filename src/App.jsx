import { useState, useRef, useCallback } from 'react';
import ApiConfig from './components/ApiConfig';
import FileDropzone from './components/FileDropzone';
import QueueList from './components/QueueList';
import ResultViewer from './components/ResultViewer';
import { 
  Sparkles, 
  Play, 
  ChevronDown, 
  Shield, 
  ArrowRight
} from 'lucide-react';
import { processOCR } from './utils/ocrService';

function App() {
  const [config, setConfig] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processingRef = useRef(false);

  const activeFile = files.find(f => f.id === activeFileId);

  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
  }, []);

  // Helper updating parent PDF progress based on child pages
  const updateParentProgress = (currentFiles, parentId) => {
    const siblingPages = currentFiles.filter(f => f.parentPdfId === parentId && f.isPdfPage);
    const completedPages = siblingPages.filter(p => p.status === 'completed' || p.status === 'error').length;
    const totalPages = siblingPages.length;
    if (totalPages === 0) return currentFiles;

    const progress = Math.round((completedPages / totalPages) * 100);
    const processingPage = siblingPages.find(p => p.status === 'processing');
    const processingPageIdx = processingPage ? processingPage.pageIndex + 1 : completedPages + 1;
    const isDone = completedPages === totalPages;

    return currentFiles.map(f => {
      if (f.id === parentId) {
        let displayName = f.originalFile.name;
        if (!isDone) {
          if (processingPage && processingPage.retryInfo) {
            const { attempt, secondsLeft } = processingPage.retryInfo;
            displayName = `${f.originalFile.name} (Quá tải, thử lại lần ${attempt} sau ${secondsLeft}s...)`;
          } else {
            displayName = `${f.originalFile.name} (Đang xử lý: trang ${processingPageIdx}/${totalPages}...)`;
          }
        }
        return {
          ...f,
          name: displayName,
          progress: progress,
          status: isDone ? f.status : 'processing'
        };
      }
      return f;
    });
  };

  const handleFilesSelected = async (newOriginalFiles) => {
    const newItems = newOriginalFiles.map(file => {
      const id = Math.random().toString(36).substring(2, 9);
      const isPdf = file.type === 'application/pdf';
      return {
        id: id,
        name: file.name,
        originalFile: file,
        status: 'waiting',
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

  const startOCR = async () => {
    const activeApiKey = config?.apiKey || localStorage.getItem('ocr_api_key') || localStorage.getItem('gemini_api_key');
    const activeWorkerUrl = config?.workerUrl || localStorage.getItem('ocr_worker_url') || 'https://gemini-ocr-backend.ruabien1504.workers.dev';
    const activeModel = config?.model || localStorage.getItem('ocr_model') || 'gemini-1.5-flash';

    if (!activeApiKey) {
      alert("Vui lòng điền API Key của bạn trước khi bắt đầu.");
      return;
    }
    if (!activeWorkerUrl) {
      alert("Vui lòng cấu hình Cloudflare Worker URL ở phía trên cùng trước khi bắt đầu.");
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;

    setFiles(prev => prev.map(f => {
      if (f.status === 'error') {
        return { ...f, status: 'waiting', error: null };
      }
      return f;
    }));

    const currentWaiting = files
      .map(f => f.status === 'error' ? { ...f, status: 'waiting', error: null } : f)
      .filter(f => !f.isPdfPage && f.status === 'waiting');

    let currentIndex = 0;

    const processNext = async () => {
      if (!processingRef.current) return;

      const fileToProcess = currentWaiting[currentIndex++];
      if (!fileToProcess) return;

      setActiveFileId(fileToProcess.id);

      setFiles(prev => {
        return prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'processing', progress: 10, error: null } : f);
      });

      try {
        const textResult = await processOCR(
          fileToProcess.originalFile,
          activeApiKey,
          activeModel,
          activeWorkerUrl,
          (event) => {
            if (event.type === 'status') {
              setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
                ...f,
                name: `${fileToProcess.originalFile.name} (${event.message})`
              } : f));
            } else if (event.type === 'init') {
              if (fileToProcess.isParentPdf) {
                setFiles(prev => {
                  const updatedParent = {
                    ...prev.find(f => f.id === fileToProcess.id),
                    name: fileToProcess.originalFile.name,
                    status: 'processing',
                    totalPages: event.totalPages,
                    progress: 0
                  };
                  const pageItems = Array.from({ length: event.totalPages }).map((_, idx) => ({
                    id: `${fileToProcess.id}-page-${idx}`,
                    name: `${fileToProcess.originalFile.name} - Trang ${idx + 1}`,
                    originalFile: null,
                    status: 'waiting',
                    progress: 0,
                    result: '',
                    error: null,
                    isPdfPage: true,
                    parentPdfId: fileToProcess.id,
                    pageIndex: idx,
                    totalPages: event.totalPages
                  }));
                  const newArray = [...prev];
                  const filteredArray = newArray.filter(f => f.parentPdfId !== fileToProcess.id);
                  const parentIdx = filteredArray.findIndex(f => f.id === fileToProcess.id);
                  filteredArray.splice(parentIdx, 1, updatedParent, ...pageItems);
                  return filteredArray;
                });
              } else {
                setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
                  ...f,
                  name: fileToProcess.originalFile.name,
                  status: 'processing',
                  progress: 0
                } : f));
              }
            } else if (event.type === 'page_start') {
              if (fileToProcess.isParentPdf) {
                setFiles(prev => {
                  const updated = prev.map(f => f.id === `${fileToProcess.id}-page-${event.pageIndex}` ? {
                    ...f,
                    status: 'processing',
                    progress: 25
                  } : f);
                  return updateParentProgress(updated, fileToProcess.id);
                });
              } else {
                setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
                  ...f,
                  status: 'processing',
                  progress: 50
                } : f));
              }
            } else if (event.type === 'page_retry') {
              if (fileToProcess.isParentPdf) {
                setFiles(prev => {
                  const updated = prev.map(f => f.id === `${fileToProcess.id}-page-${event.pageIndex}` ? {
                    ...f,
                    retryInfo: {
                      attempt: event.attempt,
                      maxAttempts: event.maxAttempts,
                      secondsLeft: event.secondsLeft,
                      errorMsg: event.errorMsg
                    }
                  } : f);
                  return updateParentProgress(updated, fileToProcess.id);
                });
              } else {
                setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
                  ...f,
                  retryInfo: {
                    attempt: event.attempt,
                    maxAttempts: event.maxAttempts,
                    secondsLeft: event.secondsLeft,
                    errorMsg: event.errorMsg
                  }
                } : f));
              }
            } else if (event.type === 'page_complete') {
              if (fileToProcess.isParentPdf) {
                setFiles(prev => {
                  const updated = prev.map(f => f.id === `${fileToProcess.id}-page-${event.pageIndex}` ? {
                    ...f,
                    status: 'completed',
                    progress: 100,
                    result: event.text,
                    retryInfo: null
                  } : f);
                  return updateParentProgress(updated, fileToProcess.id);
                });
              } else {
                setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
                  ...f,
                  status: 'completed',
                  progress: 100,
                  result: event.text,
                  retryInfo: null
                } : f));
              }
            } else if (event.type === 'page_error') {
              if (fileToProcess.isParentPdf) {
                setFiles(prev => {
                  const updated = prev.map(f => f.id === `${fileToProcess.id}-page-${event.pageIndex}` ? {
                    ...f,
                    status: 'error',
                    progress: 0,
                    error: event.error,
                    retryInfo: null
                  } : f);
                  return updateParentProgress(updated, fileToProcess.id);
                });
              } else {
                setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  error: event.error,
                  retryInfo: null
                } : f));
              }
            }
          }
        );

        setFiles(prev => prev.map(f => f.id === fileToProcess.id ? {
          ...f,
          status: 'completed',
          progress: 100,
          result: textResult,
          name: fileToProcess.originalFile.name,
          retryInfo: null,
          error: null
        } : f));

      } catch (error) {
        console.error("Lỗi khi xử lý OCR file:", fileToProcess.name, error);
        setFiles(prev => {
          let updated = prev.map(f => f.id === fileToProcess.id ? {
            ...f,
            status: 'error',
            progress: 0,
            error: error.message,
            name: fileToProcess.originalFile.name,
            retryInfo: null
          } : f);
          
          if (fileToProcess.isParentPdf) {
            updated = updated.map(f => {
              if (f.parentPdfId === fileToProcess.id && f.status !== 'completed') {
                return { ...f, status: 'error', error: error.message };
              }
              return f;
            });
            updated = updateParentProgress(updated, fileToProcess.id);
          }
          return updated;
        });
      }

      if (currentIndex < currentWaiting.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await processNext();
    };

    await processNext();

    setIsProcessing(false);
    processingRef.current = false;
  };

  const handleConvertClick = () => {
    if (files.length === 0) {
      alert("Vui lòng kéo thả hoặc chọn file tài liệu trước!");
      return;
    }
    startOCR();
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
      q: "ScanJoy có bảo mật không?",
      a: "ScanJoy được thiết kế với kiến trúc bảo mật Zero-Server tuyệt đối. Tất cả các quá trình xử lý diễn ra trực tiếp trên trình duyệt của bạn thông qua API của Google Gemini, cam kết không lưu trữ bất kỳ tệp tin hay dữ liệu nào của bạn."
    },
    {
      q: "Có hỗ trợ tiếng Việt không?",
      a: "Có, ScanJoy hỗ trợ nhận diện tiếng Việt cực kỳ tốt, kể cả các ký tự có dấu phức tạp và font chữ viết tay rõ ràng."
    },
    {
      q: "Giới hạn dung lượng file là bao nhiêu?",
      a: "Bạn có thể tải file lên đến 20MB. Đối với các tệp PDF nhiều trang, chúng tôi khuyên bạn nên chia nhỏ nếu kích thước vượt quá giới hạn này."
    },
    {
      q: "Làm thế nào để lấy Gemini API Key miễn phí?",
      a: (
        <span>
          Bạn có thể truy cập{' '}
          <a 
            href="https://aistudio.google.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline hover:text-[#0058be] font-bold"
          >
            Google AI Studio (aistudio.google.com)
          </a>
          , đăng nhập bằng tài khoản Google của bạn và nhấn nút "Get API key" để tạo một mã khóa mới hoàn toàn miễn phí.
        </span>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm select-none">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-lg bg-[#0058be]/10 flex items-center justify-center text-[#0058be]">
              <Sparkles size={18} className="animate-pulse fill-current" />
            </div>
            <span className="font-display font-bold text-xl md:text-2xl text-[#0058be] tracking-tight">
              ScanJoy
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-[#424754]">
            <button onClick={() => scrollToSection('workspace')} className="hover:text-[#0058be] hover:underline transition-colors cursor-pointer">Sử dụng</button>
            <button onClick={() => scrollToSection('so-sanh')} className="hover:text-[#0058be] hover:underline transition-colors cursor-pointer">So sánh đối ứng</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-[#0058be] hover:underline transition-colors cursor-pointer">Hỏi đáp & Bảo mật</button>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-[#0058be]/10 text-[#0058be] px-3 py-1 rounded-full uppercase tracking-wider hidden sm:inline-block">
              BYOK Client
            </span>
            <button 
              onClick={() => scrollToSection('workspace')}
              className="px-4 h-12 text-sm font-bold bg-[#0058be] hover:bg-[#004395] text-white rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              Trải nghiệm ngay
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-grow flex flex-col gap-10 md:gap-16">
        
        {/* Section 1: Workspace ở trên cùng */}
        <section id="workspace" className="py-2 space-y-6 w-full max-w-5xl mx-auto animate-fade-in">
          <ApiConfig onConfigChange={handleConfigChange} />

          {files.length === 0 ? (
            <div className="space-y-6 max-w-2xl mx-auto w-full">
              <FileDropzone onFilesSelected={handleFilesSelected} />
              
              <div className="flex justify-center pt-2 select-none">
                <button 
                  onClick={handleConvertClick}
                  className="bg-[#0058be] hover:bg-[#004395] text-white h-12 sm:h-14 px-8 rounded-full font-display font-bold shadow-lg shadow-[#0058be]/20 active:scale-95 transition-all duration-200 w-full max-w-xs flex items-center justify-center gap-2 cursor-pointer text-base sm:text-lg"
                >
                  <span>Chuyển đổi ngay</span>
                  <Sparkles size={18} className="animate-pulse" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
              <div className="lg:col-span-5 flex flex-col gap-5">
                <div className="w-full">
                  <FileDropzone onFilesSelected={handleFilesSelected} />
                </div>
                
                <div className="flex flex-col gap-4 bg-white p-5 sm:p-6 rounded-[24px] border border-slate-200/60 shadow-[0_4px_20px_rgba(0,88,190,0.04)] flex-1 max-h-[550px] overflow-hidden">
                  <QueueList 
                    files={files} 
                    activeFileId={activeFileId} 
                    onFileClick={setActiveFileId}
                    onRemoveFile={handleRemoveFile}
                  />
                  
                  <div className="pt-4 mt-auto border-t border-slate-200/80 shrink-0">
                    <button
                      onClick={startOCR}
                      disabled={isProcessing || files.some(f => f.status === 'splitting') || !files.some(f => !f.isParentPdf && (f.status === 'waiting' || f.status === 'error'))}
                      className="w-full h-12 px-5 bg-[#0058be] hover:bg-[#004395] text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-base"
                    >
                      <Play size={16} fill="white" stroke="white" />
                      {isProcessing ? 'Đang xử lý...' : 'Chuyển đổi ngay'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 h-[calc(100vh-140px)] sticky top-20">
                <ResultViewer 
                  file={activeFile} 
                  allFiles={files} 
                  onUpdateResult={handleUpdateResult} 
                />
              </div>
            </div>
          )}
        </section>

        {/* Section 1.5: Intro Title & Hero description (Dưới Workspace) */}
        <section className="max-w-[1280px] mx-auto text-center py-4 space-y-4 select-none">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-[#0b1c30] tracking-tight leading-tight">
              Chuyển đổi Hình ảnh &amp; PDF sang Văn bản
            </h1>
            <p className="text-base sm:text-[17px] text-[#424754] max-w-2xl mx-auto leading-relaxed font-medium">
              Biến mọi tài liệu giấy thành văn bản số chỉ trong vài giây với công nghệ AI hiện đại của ScanJoy.
            </p>
          </div>
        </section>

        {/* Section 2: Comparison Grid */}
        <section id="so-sanh" className="py-2 space-y-8 w-full">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center text-[#0b1c30]">
            Tại sao nên chọn ScanJoy?
          </h2>
          
          <div className="bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,88,190,0.04)] border border-slate-200/60 overflow-hidden max-w-4xl mx-auto">
            {/* Header Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 bg-white border-b border-slate-200/60 select-none">
              <div className="py-4 px-5 md:py-5 md:px-6 flex items-center gap-3 border-b border-slate-200/60 md:border-b-0 md:border-r border-slate-200/60">
                <span className="text-xl">😫</span>
                <h3 className="font-display text-lg md:text-xl font-bold text-[#0b1c30]">Khó khăn & Nỗi đau của bạn</h3>
              </div>
              <div className="py-4 px-5 md:py-5 md:px-6 flex items-center gap-3">
                <span className="text-xl">✨</span>
                <h3 className="font-display text-lg md:text-xl font-bold text-[#0058be]">Giải pháp vượt trội từ App</h3>
              </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/60 hover:bg-[#f8f9ff] transition-colors duration-200">
              <div className="py-4 px-5 md:py-5 md:px-6 border-b border-slate-200/60 md:border-b-0 md:border-r border-slate-200/60 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-[#424754] text-base md:text-[17px] leading-relaxed">
                  Phải upload từng trang tài liệu lên Google Drive, chờ đợi bóc tách rồi copy từng đoạn thủ công mất thời gian.
                </p>
              </div>
              <div className="py-4 px-5 md:py-5 md:px-6 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">💡</span>
                <p className="text-[#0b1c30] text-base md:text-[17px] font-bold leading-relaxed">
                  Hỗ trợ OCR hàng loạt thả ga, xử lý mượt mà hàng chục file ảnh cùng một lúc nhờ hàng đợi tự động thông minh.
                </p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/60 hover:bg-[#f8f9ff] transition-colors duration-200">
              <div className="py-4 px-5 md:py-5 md:px-6 border-b border-slate-200/60 md:border-b-0 md:border-r border-slate-200/60 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-[#424754] text-base md:text-[17px] leading-relaxed">
                  Văn bản sau khi quét bị lỗi định dạng lung tung, xuống dòng vô tội vạ, khoảng trắng thừa phải edit tay mệt mỏi.
                </p>
              </div>
              <div className="py-4 px-5 md:py-5 md:px-6 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">💡</span>
                <p className="text-[#0b1c30] text-base md:text-[17px] font-bold leading-relaxed">
                  Tự động xử lý chuỗi và dàn phẳng văn bản trên duy nhất 1 dòng thuần túy, xóa sạch rác định dạng để paste thẳng vào Excel, AI RAG.
                </p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/60 hover:bg-[#f8f9ff] transition-colors duration-200">
              <div className="py-4 px-5 md:py-5 md:px-6 border-b border-slate-200/60 md:border-b-0 md:border-r border-slate-200/60 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-[#424754] text-base md:text-[17px] leading-relaxed">
                  Dùng phần mềm nước ngoài thì nhận diện Tiếng Việt không chuẩn, lỗi chính tả be bét do AI không hiểu ngữ cảnh.
                </p>
              </div>
              <div className="py-4 px-5 md:py-5 md:px-6 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">💡</span>
                <p className="text-[#0b1c30] text-base md:text-[17px] font-bold leading-relaxed">
                  Sử dụng trí tuệ nhân tạo Gemini tối tân, đọc hiểu ngữ nghĩa pháp lý để tự động sửa lỗi chính tả chính xác đến từng dấu thanh.
                </p>
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/60 hover:bg-[#f8f9ff] transition-colors duration-200">
              <div className="py-4 px-5 md:py-5 md:px-6 border-b border-slate-200/60 md:border-b-0 md:border-r border-slate-200/60 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-[#424754] text-base md:text-[17px] leading-relaxed">
                  Xuất file .docx từ các web chuyển đổi trực tuyến nhưng nhận lại file Word chứa toàn hình ảnh chụp, không thể edit text.
                </p>
              </div>
              <div className="py-4 px-5 md:py-5 md:px-6 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">💡</span>
                <p className="text-[#0b1c30] text-base md:text-[17px] font-bold leading-relaxed">
                  Xuất file định dạng .txt thuần túy, đảm bảo 100% dữ liệu là ký tự sạch, tha hồ bôi đen, chỉnh sửa và khai thác văn bản.
                </p>
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/60 hover:bg-[#f8f9ff] transition-colors duration-200">
              <div className="py-4 px-5 md:py-5 md:px-6 border-b border-slate-200/60 md:border-b-0 md:border-r border-slate-200/60 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-[#424754] text-base md:text-[17px] leading-relaxed">
                  Các ứng dụng miễn phí bóp nghẹt tính năng, chỉ cho quét 1 - 2 trang, bắt đóng phí bản quyền đắt đỏ hàng tháng.
                </p>
              </div>
              <div className="py-4 px-5 md:py-5 md:px-6 flex gap-3 items-start">
                <span class="text-lg shrink-0 mt-0.5 select-none">💡</span>
                <p className="text-[#0b1c30] text-base md:text-[17px] font-bold leading-relaxed">
                  Mô hình BYOK (Tự điền API Key miễn phí): OCR vô hạn số lượng trang, sở hữu trọn vẹn băng thông của Google mà không tốn một xu.
                </p>
              </div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-1 md:grid-cols-2 hover:bg-[#f8f9ff] transition-colors duration-200">
              <div className="py-4 px-5 md:py-5 md:px-6 border-b border-slate-200/60 md:border-b-0 md:border-r border-slate-200/60 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-[#424754] text-base md:text-[17px] leading-relaxed">
                  Tài liệu, hợp đồng, hồ sơ vụ án tối mật bị lưu lại trên server bên thứ ba, đối mặt với nguy cơ rò rỉ thông tin bí mật.
                </p>
              </div>
              <div className="py-4 px-5 md:py-5 md:px-6 flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5 select-none">💡</span>
                <p className="text-[#0b1c30] text-base md:text-[17px] font-bold leading-relaxed">
                  Kiến trúc bảo mật Zero-Server tuyệt đối. Toàn bộ quá trình xử lý diễn ra trực tiếp trên trình duyệt của bạn, không lưu trữ bất kỳ tệp tin nào của người dùng.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: FAQ */}
        <section id="faq" className="py-2 space-y-8 w-full max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center text-[#0b1c30]">
            Câu hỏi thường gặp
          </h2>

          <div className="space-y-4 w-full">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className={`bg-white border rounded-[24px] overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(0,88,190,0.04)] ${
                    isOpen ? 'border-[#0058be]/30' : 'border-slate-200/60'
                  }`}
                >
                  <button
                     onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                     className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-base md:text-lg text-[#0b1c30] hover:bg-slate-50/50 transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="pr-4 leading-relaxed font-display">{item.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-[#424754] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#0058be]' : ''}`} 
                    />
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-5 pt-3 text-[#424754] text-base md:text-[17px] leading-relaxed border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-250">
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
      <footer className="bg-white py-12 border-t border-slate-200/50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-gutter max-w-container-max mx-auto select-none">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-base font-bold text-[#0058be] font-display">ScanJoy</span>
            <p className="text-sm font-bold text-[#424754]">© 2026 ScanJoy. Made with joy for efficient minds.</p>
          </div>
          <div className="flex gap-6">
            <a className="text-sm font-bold text-[#424754] hover:text-[#0058be] transition-all" href="#workspace">Security</a>
            <a className="text-sm font-bold text-[#424754] hover:text-[#0058be] transition-all" href="#workspace">Formats</a>
            <a className="text-sm font-bold text-[#424754] hover:text-[#0058be] transition-all" href="#so-sanh">Pricing</a>
            <a className="text-sm font-bold text-[#424754] hover:text-[#0058be] transition-all" href="#faq">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
