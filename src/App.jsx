import { useState, useRef, useCallback } from 'react';
import ApiConfig from './components/ApiConfig';
import FileDropzone from './components/FileDropzone';
import QueueList from './components/QueueList';
import ResultViewer from './components/ResultViewer';
import { 
  Sparkles, 
  Play, 
  Key, 
  Upload, 
  CheckCircle2, 
  ChevronDown, 
  Shield, 
  HelpCircle, 
  ArrowRight, 
  Clock, 
  FileText,
  XCircle,
  AlertCircle,
  Lock,
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
      a: "Đây là tính năng tối ưu đặc biệt được thiết kế cho các tác vụ tự động hóa và nhập liệu nhanh (ví dụ: dán dữ liệu vào Google Sheets, Excel hoặc hệ thống CRM). Việc ghép văn bản thành một dòng giúp loại bỏ các ký tự xuống dòng phức tạp gây lỗi định dạng bảng biểu."
    },
    {
      q: "Làm thế nào để tránh lỗi quá tải API khi xử lý PDF nhiều trang?",
      a: "Ứng dụng của chúng tôi đã được tích hợp sẵn hai lá chắn bảo vệ: cơ chế bóc tách từng trang ảnh riêng biệt trên Client-side kết hợp hàng đợi chạy tuần tự với độ trễ 4 giây, và thuật toán Tự động thử lại (Self-Healing Retry) lên đến 5 lần với thời gian chờ lũy thừa (Exponential Backoff) kèm đếm ngược giây."
    }
  ];

  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-100 flex flex-col scroll-smooth">
      {/* Sticky Glassmorphism Navbar */}
      <header className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-900/80 shadow-lg transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white p-2 rounded-xl shadow-md">
              <Sparkles size={20} />
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-400 via-emerald-400 to-emerald-500 bg-clip-text text-transparent tracking-tight">
              Gemini OCR 1-Line
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <button onClick={() => scrollToSection('cong-cu')} className="hover:text-emerald-400 transition-colors cursor-pointer">Sử dụng</button>
            <button onClick={() => scrollToSection('noi-dau')} className="hover:text-emerald-400 transition-colors cursor-pointer">Nỗi đau khách hàng</button>
            <button onClick={() => scrollToSection('giai-phap')} className="hover:text-emerald-400 transition-colors cursor-pointer">Giải pháp vượt trội</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-emerald-400 transition-colors cursor-pointer">Hỏi đáp & Bảo mật</button>
          </nav>

          <div>
            <button 
              onClick={() => scrollToSection('cong-cu')}
              className="px-4.5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/15 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              Trải nghiệm ngay
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Section 1: OCR Tool Workspace (At the very top) */}
      <section id="cong-cu" className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 py-10 lg:py-16 border-b border-slate-900 flex-1 flex flex-col justify-start">
        <div className="absolute top-0 left-[10%] w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-[10%] w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full text-xs font-semibold text-slate-300 mb-4 shadow-md animate-fade-in">
              <Sparkles size={12} className="text-emerald-400 animate-pulse" />
              Ứng dụng Client-Side Bảo mật tuyệt đối - Không lưu trữ dữ liệu
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-4">
              Bóc Tách Văn Bản Tiếng Việt<br />
              <span className="bg-gradient-to-r from-indigo-400 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                Hàng Loạt Ra 1 Dòng Duy Nhất
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Tự cấu hình API Key Gemini của bạn để OCR không giới hạn trang, bóc tách hàng loạt file ảnh & PDF, tự động ghép và làm sạch định dạng.
            </p>
          </div>

          <div className="mb-8 max-w-4xl mx-auto bg-slate-900 rounded-3xl p-2 border border-slate-800 shadow-xl transition-all hover:border-slate-700">
            <ApiConfig onConfigChange={handleConfigChange} />
          </div>

          {files.length === 0 ? (
            <div className="max-w-3xl mx-auto bg-slate-900 p-5 rounded-3xl shadow-xl border border-slate-800 animate-in fade-in zoom-in duration-300">
              <FileDropzone onFilesSelected={handleFilesSelected} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Left Column: Dropzone + Queue */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-md">
                   <FileDropzone onFilesSelected={handleFilesSelected} />
                </div>
                
                <div className="flex flex-col gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 flex-1 max-h-[600px] overflow-hidden shadow-md">
                  <QueueList 
                    files={files} 
                    activeFileId={activeFileId} 
                    onFileClick={setActiveFileId}
                    onRemoveFile={handleRemoveFile}
                  />
                  
                  <div className="pt-4 mt-auto border-t border-slate-800 shrink-0">
                    <button
                      onClick={startOCR}
                      disabled={isProcessing || files.some(f => f.status === 'splitting') || !files.some(f => !f.isParentPdf && (f.status === 'waiting' || f.status === 'error'))}
                      className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-950/50 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Section 2: Customer Pain Points */}
      <section id="noi-dau" className="py-20 bg-slate-950 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-xs font-semibold text-rose-400 mb-4 uppercase tracking-wider">
              Khó Khăn Thực Tế
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4 sm:text-4xl">
              Tại Sao Việc OCR Tiếng Việt Hiện Tại Lại Mệt Mỏi Đến Thế?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Bóc tách văn bản thủ công hay dùng các công cụ nước ngoài thông thường luôn đi kèm những phiền toái kinh điển đánh mất thời gian của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Pain Point 1 */}
            <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 flex flex-col group hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-3 group-hover:text-rose-400 transition-colors">
                Bóc tách từng trang mệt mỏi
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Phải thực hiện OCR cho từng trang tài liệu một, rồi sao chép từng đoạn nhỏ lẻ thủ công từ Google Drive cực kỳ tốn thời gian khi bạn có cả một tập tài liệu dài.
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 flex flex-col group hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-3 group-hover:text-rose-400 transition-colors">
                Lỗi định dạng & Xuống dòng rác
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Văn bản trích xuất bị ngắt dòng vô tội vạ, dính khoảng trắng thừa lung tung. Bạn phải căng mắt ngồi chỉnh sửa thủ công để làm sạch trước khi đem đi sử dụng.
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 flex flex-col group hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-3 group-hover:text-rose-400 transition-colors">
                AI ngoại ngữ dịch sai ngữ cảnh
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Sử dụng các trang web nước ngoài thì tiếng Việt nhận diện không chuẩn, lỗi chính tả nhiều do mô hình AI của họ không hiểu rõ đặc trưng ngữ cảnh tiếng Việt.
              </p>
            </div>

            {/* Pain Point 4 */}
            <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 flex flex-col group hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <XCircle size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-3 group-hover:text-rose-400 transition-colors">
                Xuất file Word "giả cầy" chứa ảnh
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Hệ thống xuất ra file .docx nhưng thực chất bên trong chỉ chứa hình ảnh dán trực tiếp vào, hoàn toàn không thể bôi đen hay chỉnh sửa nội dung văn bản.
              </p>
            </div>

            {/* Pain Point 5 */}
            <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 flex flex-col group hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-3 group-hover:text-rose-400 transition-colors">
                Giới hạn số trang & Phí đắt đỏ
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Bị giới hạn ngặt nghèo chỉ cho phép dùng thử 1 - 2 trang. Bắt ép người dùng trả các khoản phí dịch vụ đắt đỏ nếu muốn xử lý nhiều tài liệu hơn.
              </p>
            </div>

            {/* Pain Point 6 */}
            <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 flex flex-col group hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldAlert size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-3 group-hover:text-rose-400 transition-colors">
                Nỗi sợ lộ bí mật tài liệu
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Khi sử dụng các web dịch vụ trực tuyến, tài liệu của bạn bị lưu lại trên máy chủ của họ, đối mặt với nguy cơ rò rỉ thông tin tối mật của hồ sơ vụ án, hợp đồng hoặc dữ liệu nội bộ doanh nghiệp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Outstanding Solution */}
      <section id="giai-phap" className="py-20 bg-slate-900/30 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-semibold text-indigo-400 mb-4 uppercase tracking-wider">
              Giải Pháp Vượt Trội
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4 sm:text-4xl">
              Gemini OCR 1-Line - Công Nghệ Đột Phá
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Chúng tôi mang đến giải pháp kết hợp sức mạnh trí tuệ nhân tạo của Google Gemini và cơ chế tối ưu luồng công việc của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Solution 1 */}
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800/80 shadow-lg flex gap-6 hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="w-14 h-14 bg-slate-950 border border-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                <Zap size={24} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Xuất file TXT 1 dòng thuần túy, sạch rác định dạng
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Tính năng loại bỏ hoàn toàn các ký tự xuống dòng rác, khoảng trắng thừa thãi. Xuất ra tệp TXT 1 dòng cực sạch giúp dán thẳng vào Word, Excel hoặc nạp trực tiếp vào cơ sở dữ liệu AI RAG mà không bị lỗi cấu trúc bảng.
                </p>
              </div>
            </div>

            {/* Solution 2 */}
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800/80 shadow-lg flex gap-6 hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="w-14 h-14 bg-slate-950 border border-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                <Sparkles size={24} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Tự động phát hiện và sửa lỗi chính tả bằng AI
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Tận dụng tối đa sức mạnh thấu hiểu ngữ nghĩa sâu sắc của Google Gemini để tự phát hiện và chuẩn hóa lỗi chính tả của ảnh gốc. Đọc tốt các chữ bị mờ, tài liệu cũ hoặc font chữ cổ xưa khó nhận diện.
                </p>
              </div>
            </div>

            {/* Solution 3 */}
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800/80 shadow-lg flex gap-6 hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="w-14 h-14 bg-slate-950 border border-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                <Key size={24} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Mô hình BYOK: Tự nhập Key miễn phí, OCR vô hạn
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Sử dụng cơ chế Bring Your Own Key để tận dụng tài nguyên Google hoàn toàn miễn phí của riêng bạn. Thoải mái bóc tách hàng loạt file hình ảnh hay tài liệu PDF cực dài mà không lo giới hạn trang hay tốn chi phí.
                </p>
              </div>
            </div>

            {/* Solution 4 */}
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800/80 shadow-lg flex gap-6 hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="w-14 h-14 bg-slate-950 border border-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                <Shield size={24} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Bảo mật dữ liệu tuyệt đối cấp Client-Side
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Cam kết bảo vệ dữ liệu ở mức cao nhất. Tài liệu của bạn chỉ được lưu trữ cục bộ trên trình duyệt và gửi trực tiếp tới API của Google qua HTTPS. Chúng tôi hoàn toàn không lưu trữ tệp trên bất kỳ máy chủ nào.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 bg-slate-950 border-b border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-400 mb-4">
              <Shield size={12} />
              Đảm bảo an toàn thông tin
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">
              Hỏi Đáp & Chính Sách Bảo Mật
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Giải đáp các thắc mắc về cơ chế hoạt động, độ tin cậy và cam kết bảo vệ dữ liệu người dùng.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-200 hover:text-emerald-400 hover:bg-slate-800/20 transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="pr-4">{item.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} 
                    />
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-5 pt-4 text-slate-400 text-sm leading-relaxed bg-slate-950/40 border-t border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
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
      <footer className="bg-slate-950 text-slate-500 py-8 border-t border-slate-900 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p className="mb-2">Gemini OCR Tiếng Việt Hàng Loạt Ra 1 Dòng - Phiên bản Client-Side Bảo Mật</p>
          <p>© {new Date().getFullYear()} Công cụ phát triển mã nguồn mở. Cam kết không thu thập dữ liệu người dùng.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
