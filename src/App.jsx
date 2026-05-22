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
          Bạn có thể truy cập{' '}
          <a 
            href="https://aistudio.google.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline hover:text-[#222222] font-extrabold"
          >
            Google AI Studio (aistudio.google.com)
          </a>
          , đăng nhập bằng tài khoản Google của bạn và nhấn nút "Get API key" để tạo một mã khóa mới hoàn toàn miễn phí.{' '}
          <a 
            href="https://www.youtube.com/watch?v=ag0bHshpQ4U" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline hover:text-[#222222] font-extrabold"
          >
            Xem Video hướng dẫn
          </a>
        </span>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col scroll-smooth">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all select-none">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl font-bold">
              ☕
            </div>
            <span className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-1.5">
              Gemini OCR <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-lg text-[10px] font-extrabold tracking-wider">1-LINE</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-extrabold text-slate-600">
            <button onClick={() => scrollToSection('cong-cu')} className="hover:text-indigo-600 hover:underline transition-colors cursor-pointer">Sử dụng</button>
            <button onClick={() => scrollToSection('so-sanh')} className="hover:text-indigo-600 hover:underline transition-colors cursor-pointer">So sánh đối ứng</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-indigo-600 hover:underline transition-colors cursor-pointer">Hỏi đáp & Bảo mật</button>
          </nav>

          <div>
            <button 
              onClick={() => scrollToSection('cong-cu')}
              className="px-5 py-2.5 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-transparent"
            >
              Trải nghiệm ngay
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex-grow flex flex-col gap-16">
        <section id="cong-cu" className="flex flex-col gap-6 animate-fade-in">
          <div className="text-center py-4 max-w-3xl mx-auto select-none">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[11px] font-bold text-indigo-700 mb-4 shadow-sm">
              <Sparkles size={12} className="text-indigo-600 fill-indigo-600 animate-pulse" />
              Ứng dụng Client-Side Bảo mật tuyệt đối - Không lưu trữ dữ liệu
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-3">
              Bóc Tách Văn Bản Tiếng Việt Hàng Loạt Ra 1 Dòng Duy Nhất
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm font-semibold max-w-2xl mx-auto leading-relaxed">
              Tự cấu hình API Key Gemini của bạn để OCR không giới hạn trang, bóc tách hàng loạt file ảnh & PDF, tự động ghép và làm sạch định dạng.
            </p>
          </div>

          <div className="w-full">
            <ApiConfig onConfigChange={handleConfigChange} />
          </div>

          {files.length === 0 ? (
            <div className="max-w-3xl mx-auto w-full">
              <FileDropzone onFilesSelected={handleFilesSelected} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="w-full">
                   <FileDropzone onFilesSelected={handleFilesSelected} />
                </div>
                
                <div className="flex flex-col gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex-1 max-h-[550px] overflow-hidden">
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
                      className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg transition-all shadow-sm border border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <Play size={16} fill="white" stroke="white" />
                      {isProcessing ? 'Đang xử lý...' : 'Bắt đầu OCR'}
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

        <section id="so-sanh" className="flex flex-col gap-6 py-6">
          <div className="text-center max-w-3xl mx-auto select-none">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider mb-3">
              So Sánh Đối Ứng
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              Tại Sao Bạn Nên Chọn Gemini OCR 1-Line?
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed">
              Bóc tách văn bản thủ công hay dùng các công cụ nước ngoài thông thường luôn đi kèm những phiền toái kinh điển. Xem bảng đối sánh dưới đây để thấy sự khác biệt vượt trội.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 bg-white border-b border-slate-200 select-none">
              <div className="p-5 flex items-center gap-3 md:border-r border-slate-200">
                <span className="text-lg text-slate-500">❌</span>
                <h3 className="text-sm font-extrabold text-slate-900">Khó khăn & Nỗi đau của bạn</h3>
              </div>
              <div className="p-5 flex items-center gap-3">
                <span className="text-lg text-indigo-600">✨</span>
                <h3 className="text-sm font-extrabold text-indigo-950">Giải pháp vượt trội từ App</h3>
              </div>
            </div>

            {/* Rows */}
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/80 hover:bg-slate-50/80 transition-colors duration-200">
              <div className="p-6 md:border-r border-slate-200/80 flex gap-3.5 items-start">
                <span className="text-base shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  Phải upload từng trang tài liệu lên Google Drive, chờ đợi bóc tách rồi cặm cụi copy từng đoạn thủ công rất mất thời gian.
                </p>
              </div>
              <div className="p-6 flex gap-3.5 items-start">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 p-1 rounded-lg text-xs shrink-0 select-none flex items-center justify-center">💡</span>
                <p className="text-slate-800 text-xs font-bold leading-relaxed">
                  Hỗ trợ OCR hàng loạt thả ga, xử lý mượt mà hàng chục file ảnh cùng một lúc nhờ hàng đợi tự động thông minh.
                </p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/80 hover:bg-slate-50/80 transition-colors duration-200">
              <div className="p-6 md:border-r border-slate-200/80 flex gap-3.5 items-start">
                <span className="text-base shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  Văn bản sau khi quét bị lỗi định dạng lung tung, xuống dòng vô tội vạ, khoảng trắng thừa khiến bạn phải dùng phím Backspace edit tay mệt mỏi.
                </p>
              </div>
              <div className="p-6 flex gap-3.5 items-start">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 p-1 rounded-lg text-xs shrink-0 select-none flex items-center justify-center">💡</span>
                <p className="text-slate-800 text-xs font-bold leading-relaxed">
                  Tự động xử lý chuỗi và dàn phẳng văn bản trên duy nhất 1 dòng thuần túy, xóa sạch rác định dạng, paste thẳng vào Excel hoặc AI RAG ăn ngay.
                </p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/80 hover:bg-slate-50/80 transition-colors duration-200">
              <div className="p-6 md:border-r border-slate-200/80 flex gap-3.5 items-start">
                <span className="text-base shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  Sử dụng các phần mềm, trang web nước ngoài thì nhận diện Tiếng Việt không chuẩn, lỗi chính tả be bét do AI không hiểu ngữ cảnh văn hóa.
                </p>
              </div>
              <div className="p-6 flex gap-3.5 items-start">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 p-1 rounded-lg text-xs shrink-0 select-none flex items-center justify-center">💡</span>
                <p className="text-slate-800 text-xs font-bold leading-relaxed">
                  Sử dụng trí tuệ nhân tạo Gemini tối tân, không chỉ 'nhìn chữ' mà còn 'đọc hiểu ngữ nghĩa pháp lý' để tự động sửa lỗi chính tả chuẩn xác 99%.
                </p>
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/80 hover:bg-slate-50/80 transition-colors duration-200">
              <div className="p-6 md:border-r border-slate-200/80 flex gap-3.5 items-start">
                <span className="text-base shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  Hào hứng bấm xuất file .docx từ các web chuyển đổi trực tuyến, để rồi nhận lại một file Word chứa toàn hình ảnh chụp lại, hoàn toàn không thể edit text.
                </p>
              </div>
              <div className="p-6 flex gap-3.5 items-start">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 p-1 rounded-lg text-xs shrink-0 select-none flex items-center justify-center">💡</span>
                <p className="text-slate-800 text-xs font-bold leading-relaxed">
                  Xuất file định dạng .txt thuần túy (text/plain), đảm bảo 100% dữ liệu là ký tự sạch, bôi đen, chỉnh sửa và khai thác văn bản thoải mái.
                </p>
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200/80 hover:bg-slate-50/80 transition-colors duration-200">
              <div className="p-6 md:border-r border-slate-200/80 flex gap-3.5 items-start">
                <span className="text-base shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  Các ứng dụng miễn phí bóp nghẹt tính năng, chỉ cho quét keo kiệt 1 - 2 trang, bắt đóng phí bản quyền đắt đỏ hàng tháng nếu muốn dùng nhiều hơn.
                </p>
              </div>
              <div className="p-6 flex gap-3.5 items-start">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 p-1 rounded-lg text-xs shrink-0 select-none flex items-center justify-center">💡</span>
                <p className="text-slate-800 text-xs font-bold leading-relaxed">
                  Mô hình BYOK (Tự điền API Key miễn phí): OCR vô hạn số lượng trang, sở hữu trọn vẹn băng thông của Google mà không tốn một xu chi phí nào.
                </p>
              </div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-1 md:grid-cols-2 hover:bg-slate-50/80 transition-colors duration-200">
              <div className="p-6 md:border-r border-slate-200/80 flex gap-3.5 items-start">
                <span className="text-base shrink-0 mt-0.5 select-none">❌</span>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  Tài liệu, hợp đồng, hồ sơ vụ án tối mật bị lưu lại trên máy chủ của các dịch vụ bên thứ ba, đối mặt với nguy cơ rò rỉ thông tin bí mật nghiêm trọng.
                </p>
              </div>
              <div className="p-6 flex gap-3.5 items-start">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 p-1 rounded-lg text-xs shrink-0 select-none flex items-center justify-center">💡</span>
                <p className="text-slate-800 text-xs font-bold leading-relaxed">
                  Kiến trúc bảo mật Zero-Server tuyệt đối. Toàn bộ quá trình xử lý diễn ra trực tiếp trên trình duyệt của bạn (hoặc qua hạ tầng Serverless Cloudflare an toàn), không lưu trữ bất kỳ tệp tin nào của người dùng.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="flex flex-col gap-6 py-6 max-w-3xl mx-auto w-full">
          <div className="text-center select-none">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-extrabold text-indigo-700 mb-3">
              <Shield size={12} className="text-indigo-600" />
              Đảm bảo an toàn thông tin
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              Hỏi Đáp & Chính Sách Bảo Mật
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed">
              Giải đáp các thắc mắc về cơ chế hoạt động, độ tin cậy và cam kết bảo vệ dữ liệu người dùng.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="bg-white border border-slate-200/80 rounded-xl overflow-hidden transition-all duration-300 shadow-sm"
                >
                  <button
                     onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                     className="w-full px-5 py-4 flex items-center justify-between text-left font-extrabold text-xs text-slate-800 hover:bg-slate-50/50 transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="pr-4 leading-relaxed">{item.q}</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-slate-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-slate-800' : ''}`} 
                    />
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-4 pt-3 text-slate-600 text-xs font-semibold leading-relaxed bg-slate-50/30 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-250 font-medium">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="bg-white text-slate-500 py-8 border-t border-slate-200/80 text-center text-[11px] font-bold mt-12 select-none">
        <div className="max-w-[1200px] mx-auto px-4">
          <p className="mb-1 text-slate-800">Gemini OCR Tiếng Việt Hàng Loạt Ra 1 Dòng - Phiên bản Client-Side Bảo Mật</p>
          <p className="text-slate-400">© {new Date().getFullYear()} Công cụ phát triển mã nguồn mở. Cam kết không thu thập dữ liệu người dùng.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
