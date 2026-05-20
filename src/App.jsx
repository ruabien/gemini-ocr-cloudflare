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
  FileText 
} from 'lucide-react';
import { processOCR } from './utils/ocrService';
import { splitPdfToImages } from './utils/pdfProcessor';

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

  // Helper ghép văn bản từ các trang con khi tất cả đã xử lý xong
  const checkAndMergePdfText = (currentFiles, parentId) => {
    const siblingPages = currentFiles.filter(f => f.parentPdfId === parentId && f.isPdfPage);
    const allPagesDone = siblingPages.every(p => p.status === 'completed' || p.status === 'error');

    if (allPagesDone) {
      const mergedText = siblingPages
        .sort((a, b) => a.pageIndex - b.pageIndex)
        .map(p => `--- TRANG ${p.pageIndex + 1} ---\n${p.result || (p.error ? `[Lỗi OCR: ${p.error}]` : '')}`)
        .join('\n\n');

      const hasErrors = siblingPages.some(p => p.status === 'error');

      return currentFiles.map(f => {
        if (f.id === parentId) {
          return {
            ...f,
            status: hasErrors ? 'error' : 'completed',
            progress: 100,
            result: mergedText,
            error: hasErrors ? 'Một số trang có lỗi khi chạy OCR.' : null
          };
        }
        return f;
      });
    }
    return currentFiles;
  };

  const handleFilesSelected = async (newOriginalFiles) => {
    for (const file of newOriginalFiles) {
      const id = Math.random().toString(36).substring(2, 9);

      if (file.type === 'application/pdf') {
        // Tạo một placeholder tạm thời cho PDF đang tách trang
        const placeholderItem = {
          id: id,
          name: `${file.name} (Đang chuẩn bị...)`,
          originalFile: file,
          status: 'splitting',
          progress: 0,
          result: '',
          error: null,
          isParentPdf: true,
          totalPages: 0
        };

        setFiles(prev => [...prev, placeholderItem]);
        setActiveFileId(prev => prev || id);

        try {
          const imageFiles = await splitPdfToImages(file, (current, total) => {
            setFiles(prev => prev.map(f => f.id === id ? {
              ...f,
              progress: Math.round((current / total) * 100),
              name: `${file.name} (Đang bóc tách: ${current}/${total} trang...)`
            } : f));
          });

          const pageItems = imageFiles.map((pageFile, idx) => ({
            id: Math.random().toString(36).substring(2, 9),
            name: `${file.name} - Trang ${idx + 1}`,
            originalFile: pageFile,
            status: 'waiting',
            progress: 0,
            result: '',
            error: null,
            isPdfPage: true,
            parentPdfId: id,
            pageIndex: idx,
            totalPages: imageFiles.length
          }));

          setFiles(prev => {
            const index = prev.findIndex(f => f.id === id);
            if (index === -1) return prev;

            const updatedParent = {
              ...prev[index],
              name: file.name,
              status: 'waiting',
              progress: 0,
              totalPages: imageFiles.length
            };

            const newArray = [...prev];
            newArray.splice(index, 1, updatedParent, ...pageItems);
            return newArray;
          });

        } catch (err) {
          console.error("Lỗi bóc tách PDF:", err);
          setFiles(prev => prev.map(f => f.id === id ? {
            ...f,
            status: 'error',
            name: `${file.name} (Lỗi phân tách)`,
            error: `Lỗi bóc tách PDF: ${err.message}`
          } : f));
        }
      } else {
        // Tệp ảnh thông thường
        const newImage = {
          id: id,
          name: file.name,
          originalFile: file,
          status: 'waiting',
          progress: 0,
          result: '',
          error: null
        };
        setFiles(prev => [...prev, newImage]);
        setActiveFileId(prev => prev || id);
      }
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
      .filter(f => !f.isParentPdf && f.status === 'waiting');

    let currentIndex = 0;

    const processNext = async () => {
      if (!processingRef.current) return;

      const fileToProcess = currentWaiting[currentIndex++];
      if (!fileToProcess) return;

      setActiveFileId(fileToProcess.id);

      setFiles(prev => {
        const updated = prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'processing', progress: 50, error: null } : f);
        if (fileToProcess.isPdfPage) {
          return updateParentProgress(updated, fileToProcess.parentPdfId);
        }
        return updated;
      });

      try {
        const textResult = await processOCR(
          fileToProcess.originalFile,
          config.apiKey,
          config.model,
          (attempt, maxAttempts, secondsLeft, errorMsg) => {
            setFiles(prev => {
              const updated = prev.map(f => f.id === fileToProcess.id ? {
                ...f,
                retryInfo: { attempt, maxAttempts, secondsLeft, errorMsg }
              } : f);
              if (fileToProcess.isPdfPage) {
                return updateParentProgress(updated, fileToProcess.parentPdfId);
              }
              return updated;
            });
          }
        );

        setFiles(prev => {
          let updated = prev.map(f => f.id === fileToProcess.id ? {
            ...f,
            status: 'completed',
            progress: 100,
            result: textResult,
            retryInfo: null
          } : f);

          if (fileToProcess.isPdfPage) {
            updated = updateParentProgress(updated, fileToProcess.parentPdfId);
            updated = checkAndMergePdfText(updated, fileToProcess.parentPdfId);
          }
          return updated;
        });

      } catch (error) {
        setFiles(prev => {
          let updated = prev.map(f => f.id === fileToProcess.id ? {
            ...f,
            status: 'error',
            progress: 0,
            error: error.message,
            retryInfo: null
          } : f);

          if (fileToProcess.isPdfPage) {
            updated = updateParentProgress(updated, fileToProcess.parentPdfId);
            updated = checkAndMergePdfText(updated, fileToProcess.parentPdfId);
          }
          return updated;
        });
      }

      // Khoảng trễ 4 giây giữa các trang PDF (hoặc giữa các tệp OCR)
      if (currentIndex < currentWaiting.length) {
        await new Promise(resolve => setTimeout(resolve, 4000));
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col scroll-smooth">
      {/* Sticky Glassmorphism Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-md">
              <Sparkles size={20} />
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
              Gemini OCR 1-Line
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button onClick={() => scrollToSection('tinh-nang')} className="hover:text-blue-600 transition-colors cursor-pointer">Tính năng</button>
            <button onClick={() => scrollToSection('huong-dan')} className="hover:text-blue-600 transition-colors cursor-pointer">Hướng dẫn</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-blue-600 transition-colors cursor-pointer">Hỏi đáp & Bảo mật</button>
            <button onClick={() => scrollToSection('cong-cu')} className="hover:text-blue-600 transition-colors cursor-pointer">Công cụ OCR</button>
          </nav>

          <div>
            <button 
              onClick={() => scrollToSection('cong-cu')}
              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              Sử dụng ngay
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="tinh-nang" className="relative overflow-hidden bg-gradient-to-b from-blue-50/30 via-white to-slate-50 py-20 lg:py-28">
        <div className="absolute top-1/4 left-[10%] w-96 h-96 bg-blue-300/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-[10%] w-96 h-96 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-semibold text-blue-700 mb-6 shadow-xs">
            <Sparkles size={12} />
            Sức mạnh từ mô hình Google Gemini AI
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-800 tracking-tight leading-[1.15] mb-6">
            Trích Xuất Văn Bản Tiếng Việt<br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Hàng Loạt Ra 1 Dòng Duy Nhất
            </span>
          </h1>

          <p className="text-slate-500 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-10">
            Công cụ hỗ trợ bóc tách từng trang PDF ngay trên trình duyệt, hàng đợi xử lý ảnh tuần tự kết hợp cơ chế tự động thử lại 5 lần thông minh. Kết quả văn bản OCR được chuẩn hóa nối liền trên một hàng ngang tiện lợi cho việc nhập liệu.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => scrollToSection('cong-cu')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={18} fill="white" />
              Bắt đầu chuyển đổi ngay
            </button>
            <button 
              onClick={() => scrollToSection('huong-dan')}
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              Xem hướng dẫn 3 bước
            </button>
          </div>
        </div>
      </section>

      {/* 3-Step Guide Section */}
      <section id="huong-dan" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-4">
              Hướng Dẫn 3 Bước Sử Dụng Nhanh
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
              Không cần cài đặt ứng dụng phức tạp, chỉ cần chuẩn bị API Key của bạn để bắt đầu sử dụng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xs group-hover:scale-110 transition-transform">
                <Key size={24} />
              </div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Bước 1</span>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Lấy API Key Gemini</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Truy cập <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">Google AI Studio</a> để tạo một API Key miễn phí của riêng bạn chỉ trong 30 giây.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xs group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Bước 2</span>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Cấu Hình Key & Tải File</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Điền API Key vào khung cấu hình phía dưới, sau đó kéo thả các tệp hình ảnh hoặc tài liệu PDF cần trích xuất văn bản vào vùng làm việc.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-xs group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <span className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-2">Bước 3</span>
              <h3 className="text-lg font-bold text-slate-800 mb-3">OCR & Nhận Kết Quả</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Nhấn "Bắt đầu OCR", hệ thống sẽ xử lý tuần tự, tự động ghép nối các trang lại và làm sạch thành 1 dòng TXT duy nhất để bạn xuất file.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-xs font-semibold text-emerald-700 mb-4">
              <Shield size={12} />
              Đảm bảo an toàn thông tin
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-4">
              Hỏi Đáp & Chính Sách Bảo Mật
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              Giải đáp các thắc mắc về cơ chế hoạt động, độ tin cậy và cam kết bảo vệ dữ liệu người dùng.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 hover:text-blue-600 transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="pr-4">{item.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} 
                    />
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-slate-500 text-sm leading-relaxed border-t border-slate-50 animate-in fade-in slide-in-from-top-1 duration-200">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* OCR Tool Workspace Section */}
      <section id="cong-cu" className="py-20 bg-slate-55 border-t border-slate-200/80 flex-1 flex flex-col justify-start">
        <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-4">
              Không Gian Làm Việc OCR
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
              Cấu hình API Key và bắt đầu thả file ảnh hoặc PDF của bạn vào để tiến hành chuyển đổi.
            </p>
          </div>

          <div className="mb-8 max-w-4xl mx-auto bg-white rounded-3xl p-2 border border-slate-200 shadow-xs">
            <ApiConfig onConfigChange={handleConfigChange} />
          </div>

          {files.length === 0 ? (
            <div className="max-w-3xl mx-auto bg-white p-4 rounded-3xl shadow-xs border border-slate-200 animate-in fade-in zoom-in duration-300">
              <FileDropzone onFilesSelected={handleFilesSelected} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Left Column: Dropzone + Queue */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
                   <FileDropzone onFilesSelected={handleFilesSelected} />
                </div>
                
                <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200 flex-1 max-h-[600px] overflow-hidden shadow-xs">
                  <QueueList 
                    files={files} 
                    activeFileId={activeFileId} 
                    onFileClick={setActiveFileId}
                    onRemoveFile={handleRemoveFile}
                  />
                  
                  <div className="pt-4 mt-auto border-t border-gray-100 shrink-0">
                    <button
                      onClick={startOCR}
                      disabled={isProcessing || files.some(f => f.status === 'splitting') || !files.some(f => !f.isParentPdf && (f.status === 'waiting' || f.status === 'error'))}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play size={18} fill="white" />
                      {isProcessing ? 'Đang xử lý...' : 'Bắt đầu OCR'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Result Viewer */}
              <div className="lg:col-span-7 h-[calc(100vh-140px)] sticky top-20">
                <ResultViewer file={activeFile} onUpdateResult={handleUpdateResult} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p className="mb-2">Gemini OCR Tiếng Việt Hàng Loạt Ra 1 Dòng - Phiên bản Client-Side Bảo Mật</p>
          <p>© {new Date().getFullYear()} Công cụ phát triển mã nguồn mở. Cam kết không thu thập dữ liệu người dùng.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
