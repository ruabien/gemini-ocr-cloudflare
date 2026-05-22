import { useState, useRef, useCallback } from 'react';
import ApiConfig from './components/ApiConfig';
import FileDropzone from './components/FileDropzone';
import QueueList from './components/QueueList';
import ResultViewer from './components/ResultViewer';
import { 
  Sparkles, 
  Play, 
  Key, 
  ChevronDown, 
  Shield, 
  ArrowRight, 
  Clock, 
  FileText,
  AlertCircle,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { processOCR } from './utils/ocrService';

function App() {
  const [config, setConfig] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processingRef = useRef(false);

  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
  }, []);

  // Helper cập nhật tiến trình của PDF cha dựa trên trạng thái các trang con
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
        // Xóa PDF cha -> Xóa toàn bộ các trang con tương ứng
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
    if (!config || !config.apiKey) {
      alert("Vui lòng cấu hình API Key ở phía trên cùng trước khi bắt đầu.");
      return;
    }
    if (!config.workerUrl) {
      alert("Vui lòng cấu hình Cloudflare Worker URL ở phía trên cùng trước khi bắt đầu.");
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;

    // Reset trạng thái lỗi của các tệp (cả trang con và ảnh độc lập)
    setFiles(prev => prev.map(f => {
      if (f.status === 'error') {
        return { ...f, status: 'waiting', error: null };
      }
      return f;
    }));

    // Lấy danh sách tệp cần chạy OCR thực tế một cách đồng bộ từ state files hiện tại
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
          config.apiKey,
          config.model,
          config.workerUrl,
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
            // Set all non-completed pages to error as well
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

      // Khoảng trễ nhỏ giữa các file chính (ví dụ 1 giây)
      if (currentIndex < currentWaiting.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await processNext();
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

  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col scroll-smooth">
      {/* Sticky Glassmorphism Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md">
              <Sparkles size={20} />
            </div>
            <span className="font-extrabold text-lg text-indigo-950 tracking-tight flex items-center gap-1.5">
              Gemini OCR <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider">1-Line</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button onClick={() => scrollToSection('cong-cu')} className="hover:text-indigo-600 transition-colors cursor-pointer">Sử dụng</button>
            <button onClick={() => scrollToSection('so-sanh')} className="hover:text-indigo-600 transition-colors cursor-pointer">Nỗi đau & Giải pháp</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-indigo-600 transition-colors cursor-pointer">Hỏi đáp & Bảo mật</button>
          </nav>

          <div>
            <button 
              onClick={() => scrollToSection('cong-cu')}
              className="px-4.5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              Trải nghiệm ngay
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Section 1: OCR Tool Workspace (At the very top) */}
      <section id="cong-cu" className="relative overflow-hidden bg-slate-50 py-10 lg:py-16 border-b border-slate-200/60 flex-1 flex flex-col justify-start">
        <div className="absolute top-0 left-[10%] w-96 h-96 bg-indigo-100/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-[10%] w-96 h-96 bg-slate-200/40 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4 shadow-sm animate-fade-in">
              <Sparkles size={12} className="text-indigo-600 animate-pulse" />
              Ứng dụng Client-Side Bảo mật tuyệt đối - Không lưu trữ dữ liệu
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-indigo-950 tracking-tight leading-tight mb-4">
              Bóc Tách Văn Bản Tiếng Việt<br />
              <span className="text-amber-600">
                Hàng Loạt Ra 1 Dòng Duy Nhất
              </span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Tự cấu hình API Key Gemini của bạn để OCR không giới hạn trang, bóc tách hàng loạt file ảnh & PDF, tự động ghép và làm sạch định dạng.
            </p>
          </div>

          <div className="mb-8 max-w-4xl mx-auto bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-sm transition-all hover:border-slate-300">
            <ApiConfig onConfigChange={handleConfigChange} />
          </div>

          {files.length === 0 ? (
            <div className="max-w-3xl mx-auto bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 animate-in fade-in zoom-in duration-300">
              <FileDropzone onFilesSelected={handleFilesSelected} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Left Column: Dropzone + Queue */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-sm">
                   <FileDropzone onFilesSelected={handleFilesSelected} />
                </div>
                
                <div className="flex flex-col gap-4 bg-white p-5 rounded-xl border border-slate-200/80 flex-1 max-h-[600px] overflow-hidden shadow-sm">
                  <QueueList 
                    files={files} 
                    activeFileId={activeFileId} 
                    onFileClick={setActiveFileId}
                    onRemoveFile={handleRemoveFile}
                  />
                  
                  <div className="pt-4 mt-auto border-t border-slate-100 shrink-0">
                    <button
                      onClick={startOCR}
                      disabled={isProcessing || files.some(f => f.status === 'splitting') || !files.some(f => !f.isParentPdf && (f.status === 'waiting' || f.status === 'error'))}
                      className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play size={18} fill="white" />
                      {isProcessing ? 'Đang xử lý...' : 'Bắt đầu OCR'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Result Viewer */}
              <div className="lg:col-span-7 h-[calc(100vh-140px)] sticky top-20">
                <ResultViewer 
                  file={activeFile} 
                  allFiles={files} 
                  onUpdateResult={handleUpdateResult} 
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: So sánh Nỗi đau & Giải pháp */}
      <section id="so-sanh" className="py-20 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-semibold text-indigo-600 mb-4 uppercase tracking-wider">
              So Sánh Thực Tế
            </span>
            <h2 className="text-3xl font-extrabold text-indigo-950 tracking-tight mb-4 sm:text-4xl">
              Nỗi Đau Thủ Công vs. Giải Pháp Từ Gemini OCR
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Đặt lên bàn cân giữa phương thức xử lý văn bản truyền thống đầy bất cập và giải pháp tự động hóa thông minh tối ưu hóa năng suất của bạn.
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            {/* Header row on desktop */}
            <div className="hidden md:grid grid-cols-2 bg-slate-50/75 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <div className="p-4 pl-8 border-r border-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Khó Khăn & Nỗi Đau (Thủ Công & Công Cụ Khác)
              </div>
              <div className="p-4 pl-8 text-indigo-955 bg-indigo-50/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Giải Pháp Vượt Trội (Gemini OCR 1-Line)
              </div>
            </div>

            {/* Comparison Rows */}
            <div className="divide-y divide-slate-200">
              {/* Row 1 */}
              <div>
                {/* Row title bar */}
                <div className="bg-slate-50/50 px-6 py-3.5 border-b border-slate-200/60 text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                  Tối ưu quy trình xử lý
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  {/* Left Column (Pain) */}
                  <div className="p-6 md:p-8 bg-rose-50/20 hover:bg-rose-50/40 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Clock size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-950 mb-1.5">Tải & Copy thủ công từng trang</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Phải upload từng trang tài liệu lên Google Drive, chờ đợi bóc tách rồi cặm cụi copy từng đoạn thủ công cực kỳ mất thời gian.
                      </p>
                    </div>
                  </div>
                  {/* Right Column (Solution) */}
                  <div className="p-6 md:p-8 bg-emerald-50/15 hover:bg-emerald-50/25 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 mb-1.5">Hàng đợi tự động xử lý hàng loạt</h4>
                      <p className="text-slate-700 text-sm leading-relaxed font-medium">
                        Hỗ trợ OCR hàng loạt thả ga, tự động xử lý mượt mà hàng chục file ảnh/PDF cùng một lúc nhờ hệ thống hàng đợi thông minh.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div>
                <div className="bg-slate-50/50 px-6 py-3.5 border-b border-slate-200/60 text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                  Chuẩn hóa định dạng đầu ra
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  {/* Left Column (Pain) */}
                  <div className="p-6 md:p-8 bg-rose-50/20 hover:bg-rose-50/40 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-950 mb-1.5">Lỗi ngắt dòng & Word giả chứa ảnh</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Văn bản bị lỗi dính chữ, dính khoảng trắng, xuống dòng vô tội vạ; xuất file .docx trực tuyến nhưng thực chất là chứa hình ảnh dán vào, không thể chỉnh sửa (edit) text.
                      </p>
                    </div>
                  </div>
                  {/* Right Column (Solution) */}
                  <div className="p-6 md:p-8 bg-emerald-50/15 hover:bg-emerald-50/25 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 mb-1.5">Dàn phẳng 1 dòng text 100% sạch</h4>
                      <p className="text-slate-700 text-sm leading-relaxed font-medium">
                        Tự động dàn phẳng văn bản trên duy nhất 1 dòng thuần túy, xóa sạch ký tự rác, xuất file .txt chứa 100% ký tự sạch để paste thẳng vào Excel hoặc AI RAG.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div>
                <div className="bg-slate-50/50 px-6 py-3.5 border-b border-slate-200/60 text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                  Độ chính xác & Giới hạn sử dụng
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  {/* Left Column (Pain) */}
                  <div className="p-6 md:p-8 bg-rose-50/20 hover:bg-rose-50/40 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <AlertCircle size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-950 mb-1.5">Sai chính tả & Phí trang đắt đỏ</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Ứng dụng nước ngoài nhận diện Tiếng Việt không chuẩn, lỗi chính tả be bét; giới hạn keo kiệt 1 - 2 trang và bắt đóng phí bản quyền đắt đỏ.
                      </p>
                    </div>
                  </div>
                  {/* Right Column (Solution) */}
                  <div className="p-6 md:p-8 bg-emerald-50/15 hover:bg-emerald-50/25 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Key size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 mb-1.5">Trí tuệ Gemini & BYOK quét vô hạn</h4>
                      <p className="text-slate-700 text-sm leading-relaxed font-medium">
                        Tận dụng trí tuệ nhân tạo Gemini tối tân để đọc hiểu ngữ nghĩa và tự sửa chính tả; áp dụng mô hình BYOK (Tự điền Key miễn phí) để quét vô hạn số trang hoàn toàn miễn phí.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4 */}
              <div>
                <div className="bg-slate-50/50 px-6 py-3.5 border-b border-slate-200/60 text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                  Bảo mật an toàn dữ liệu
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  {/* Left Column (Pain) */}
                  <div className="p-6 md:p-8 bg-rose-50/20 hover:bg-rose-50/40 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-950 mb-1.5">Lưu trữ máy chủ & Rò rỉ dữ liệu</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Tài liệu, hợp đồng, hồ sơ vụ án tối mật bị lưu lại trên máy chủ của bên thứ ba, đối mặt với nguy cơ rò rỉ và lộ thông tin bí mật nghiêm trọng.
                      </p>
                    </div>
                  </div>
                  {/* Right Column (Solution) */}
                  <div className="p-6 md:p-8 bg-emerald-50/15 hover:bg-emerald-50/25 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 mb-1.5">Xử lý cục bộ bảo mật tuyệt đối</h4>
                      <p className="text-slate-700 text-sm leading-relaxed font-medium">
                        Kiến trúc bảo mật Zero-Server tuyệt đối. Toàn bộ quá trình xử lý diễn ra trực tiếp trên trình duyệt của bạn hoặc hạ tầng Serverless Cloudflare, cam kết không lưu trữ bất kỳ tệp tin nào.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 bg-white border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-semibold text-indigo-600 mb-4">
              <Shield size={12} />
              Đảm bảo an toàn thông tin
            </div>
            <h2 className="text-3xl font-extrabold text-indigo-950 tracking-tight mb-4">
              Hỏi Đáp & Chính Sách Bảo Mật
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Giải đáp các thắc mắc về cơ chế hoạt động, độ tin cậy và cam kết bảo vệ dữ liệu người dùng.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 animate-fade-in"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-800 hover:text-indigo-600 hover:bg-slate-50/50 transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="pr-4">{item.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} 
                    />
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-5 pt-4 text-slate-600 text-sm leading-relaxed bg-slate-50/50 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-slate-500 py-8 border-t border-slate-200/85 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p className="mb-2 text-slate-600 font-semibold">Gemini OCR Tiếng Việt Hàng Loạt Ra 1 Dòng - Phiên bản Client-Side Bảo Mật</p>
          <p className="text-slate-400">© {new Date().getFullYear()} Công cụ phát triển mã nguồn mở. Cam kết không thu thập dữ liệu người dùng.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
