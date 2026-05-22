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
  ArrowRight,
  Frown,
  XCircle,
  Rocket,
  CheckCircle2
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
    <div className="min-h-screen bg-surface-bright text-on-surface font-sans selection:bg-primary-fixed/30 selection:text-on-primary-container flex flex-col scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 h-16 flex items-center select-none">
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles size={18} className="animate-pulse fill-current" />
            </div>
            <span className="font-display font-bold text-headline-md text-primary tracking-tight">
              ScanJoy
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-label-md text-on-surface-variant">
            <button onClick={() => scrollToSection('workspace')} className="hover:text-primary transition-colors cursor-pointer">Sử dụng</button>
            <button onClick={() => scrollToSection('so-sanh')} className="hover:text-primary transition-colors cursor-pointer">So sánh đối ứng</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-primary transition-colors cursor-pointer">Hỏi đáp & Bảo mật</button>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-label-sm bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-wider hidden sm:inline-block">
              BYOK Client
            </span>
            <button 
              onClick={() => scrollToSection('workspace')}
              className="px-4 h-11 text-label-md font-bold bg-primary hover:bg-primary-container text-on-primary rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 duration-200"
            >
              Trải nghiệm ngay
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-grow flex flex-col gap-12 md:gap-16">
        
        {/* Section 1: Hero ở trên cùng */}
        <section className="max-w-container-max mx-auto text-center space-y-4 select-none pt-4">
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-display-lg-mobile md:text-display-lg font-display-lg text-primary tracking-tight leading-tight">
              Chuyển đổi Hình ảnh &amp; PDF sang Văn bản
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Biến mọi tài liệu giấy thành văn bản số chỉ trong vài giây với công nghệ AI hiện đại của ScanJoy.
            </p>
          </div>
        </section>

        {/* Section 1.5: Workspace */}
        <section id="workspace" className="py-2 space-y-6 w-full max-w-5xl mx-auto animate-fade-in">
          <ApiConfig onConfigChange={handleConfigChange} />

          {files.length === 0 ? (
            <div className="space-y-6 max-w-2xl mx-auto w-full">
              <FileDropzone onFilesSelected={handleFilesSelected} />
              
              <div className="flex justify-center pt-2 select-none">
                <button 
                  onClick={handleConvertClick}
                  className="bg-primary hover:bg-primary-container text-on-primary h-14 px-8 rounded-full font-headline-md shadow-lg shadow-primary/20 active:scale-95 transition-all duration-200 w-full max-w-xs flex items-center justify-center gap-2 cursor-pointer text-body-lg"
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
                
                <div className="flex flex-col gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-xl border border-outline-variant/30 shadow-[0_4px_20px_rgba(0,88,190,0.04)] flex-1 max-h-[550px] overflow-hidden">
                  <QueueList 
                    files={files} 
                    activeFileId={activeFileId} 
                    onFileClick={setActiveFileId}
                    onRemoveFile={handleRemoveFile}
                  />
                  
                  <div className="pt-4 mt-auto border-t border-outline-variant/30 shrink-0">
                    <button
                      onClick={startOCR}
                      disabled={isProcessing || files.some(f => f.status === 'splitting') || !files.some(f => !f.isParentPdf && (f.status === 'waiting' || f.status === 'error'))}
                      className="w-full h-12 px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-body-md"
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

        {/* Section 2: Comparison Grid */}
        <section id="so-sanh" className="max-w-container-max mx-auto w-full space-y-8">
          <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-center text-primary">
            Tại sao nên chọn ScanJoy?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Old Way */}
            <div className="glass-card p-6 rounded-xl shadow-sm border border-outline-variant/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Frown size={60} className="text-error" />
              </div>
              <h3 className="text-headline-md font-headline-md text-on-surface mb-6">Cách cũ</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <XCircle size={20} className="text-error shrink-0 fill-error/10" />
                  <span className="text-body-md text-on-surface-variant">Gõ phím mỏi tay</span>
                </li>
                <li className="flex items-center gap-3">
                  <XCircle size={20} className="text-error shrink-0 fill-error/10" />
                  <span className="text-body-md text-on-surface-variant">Dễ sai sót</span>
                </li>
                <li className="flex items-center gap-3">
                  <XCircle size={20} className="text-error shrink-0 fill-error/10" />
                  <span className="text-body-md text-on-surface-variant">Mất hàng giờ</span>
                </li>
              </ul>
            </div>
            
            {/* ScanJoy Way */}
            <div className="bg-primary-container/10 p-6 rounded-xl shadow-md border border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Rocket size={60} className="text-primary" />
              </div>
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-headline-md font-headline-md text-primary">Cách ScanJoy</h3>
                <span className="bg-secondary-container text-on-secondary-container text-label-sm px-2 py-0.5 rounded-full select-none animate-pulse">
                  Khuyên dùng
                </span>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-tertiary shrink-0 fill-tertiary/10" />
                  <span className="text-body-md font-medium text-on-surface">Xử lý trong giây lát</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-tertiary shrink-0 fill-tertiary/10" />
                  <span className="text-body-md font-medium text-on-surface">Độ chính xác 99%</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-tertiary shrink-0 fill-tertiary/10" />
                  <span className="text-body-md font-medium text-on-surface">Tiết kiệm thời gian tối đa</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: FAQ */}
        <section id="faq" className="max-w-container-max mx-auto w-full space-y-8">
          <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-center text-primary">
            Câu hỏi thường gặp
          </h2>

          <div className="space-y-4 w-full max-w-3xl mx-auto">
            {faqItems.map((item, index) => {
              return (
                <details 
                  key={index}
                  open={openFaqIndex === index}
                  onToggle={(e) => {
                    if (e.target.open) {
                      setOpenFaqIndex(index);
                    } else if (openFaqIndex === index) {
                      setOpenFaqIndex(null);
                    }
                  }}
                  className="group bg-surface-container-lowest rounded-xl border border-outline-variant/30 open:border-primary/30 transition-all duration-300"
                >
                  <summary className="flex justify-between items-center p-5 cursor-pointer list-none list-inside select-none">
                    <span className="text-body-lg font-bold text-on-surface leading-relaxed font-display pr-4">{item.q}</span>
                    <ChevronDown 
                      size={18} 
                      className="text-on-surface-variant group-open:rotate-180 transition-transform duration-300 shrink-0" 
                    />
                  </summary>
                  <div className="px-5 pb-5 text-on-surface-variant leading-relaxed text-body-md">
                    {item.a}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest py-12 border-t border-outline-variant/30 select-none">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-gutter max-w-container-max mx-auto">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-label-md font-label-md font-bold text-secondary">ScanJoy</span>
            <p className="text-label-sm font-label-sm text-on-surface-variant">© 2026 ScanJoy. Made with joy for efficient minds.</p>
          </div>
          <div className="flex gap-6">
            <a className="text-label-sm font-label-sm text-on-surface-variant hover:text-secondary-container transition-all" href="#workspace">Security</a>
            <a className="text-label-sm font-label-sm text-on-surface-variant hover:text-secondary-container transition-all" href="#workspace">Formats</a>
            <a className="text-label-sm font-label-sm text-on-surface-variant hover:text-secondary-container transition-all" href="#so-sanh">Pricing</a>
            <a className="text-label-sm font-label-sm text-on-surface-variant hover:text-secondary-container transition-all" href="#faq">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
