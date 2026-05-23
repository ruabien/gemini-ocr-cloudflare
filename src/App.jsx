import { useState, useRef, useCallback, useEffect } from 'react';
import ApiConfig from './components/ApiConfig';
import FileDropzone from './components/FileDropzone';
import QueueList from './components/QueueList';
import ResultViewer from './components/ResultViewer';

import { processOCR } from './utils/ocrService';
import { splitPdfToImages } from './utils/pdfProcessor';

function App() {
  const [config, setConfig] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processingRef = useRef(false);
  const filesRef = useRef([]);

  // Cập nhật filesRef để truy cập đồng bộ dữ liệu mới nhất trong vòng lặp bất đồng bộ
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const keyIndexRef = useRef(0);

  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
  }, []);

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
            const { customMessage } = processingPage.retryInfo;
            if (customMessage) {
              displayName = `${f.originalFile.name} (${customMessage})`;
            }
          } else {
            displayName = `${f.originalFile.name} (Đang xử lý: trang ${processingPageIdx}/${totalPages}...)`;
          }
        }
        return {
          ...f,
          name: displayName,
          progress: progress,
          status: isDone ? (siblingPages.some(p => p.status === 'error') ? 'error' : 'completed') : 'processing'
        };
      }
      return f;
    });
  };

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

  const handleReset = useCallback(() => {
    processingRef.current = false;
    setIsProcessing(false);
    setFiles([]);
    setActiveFileId(null);
  }, []);



  const handleFilesSelected = async (newOriginalFiles) => {
    for (const file of newOriginalFiles) {
      const id = Math.random().toString(36).substring(2, 9);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
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
    const keys = config?.apiKeys || [];
    if (keys.length === 0) {
      alert("Vui lòng cấu hình API Key ở phía trên cùng trước khi bắt đầu.");
      return;
    }

    setIsProcessing(true);
    processingRef.current = true;

    // Reset trạng thái lỗi của các tệp (cả trang con và ảnh độc lập)
    setFiles(prev => prev.map(f => {
      if (f.status === 'error') {
        return { ...f, status: 'waiting', error: null, retryInfo: null };
      }
      return f;
    }));

    // Đợi 100ms để React cập nhật trạng thái lỗi về waiting và đồng bộ vào filesRef
    await new Promise(resolve => setTimeout(resolve, 100));

    const processNext = async () => {
      if (!processingRef.current) return;

      // Tìm tệp tiếp theo ở trạng thái 'waiting' trực tiếp từ filesRef
      // Chú ý: Chỉ lấy file chạy OCR thực tế (trang con PDF hoặc ảnh độc lập, loại bỏ PDF cha)
      const fileToProcess = filesRef.current.find(f => !f.isParentPdf && f.status === 'waiting');
      
      // Nếu không còn tệp nào hoặc luồng bị hủy, kết thúc tiến trình
      if (!fileToProcess) {
        setIsProcessing(false);
        processingRef.current = false;
        return;
      }

      setActiveFileId(fileToProcess.id);

      setFiles(prev => {
        const updated = prev.map(f => f.id === fileToProcess.id ? { 
          ...f, 
          status: 'processing', 
          progress: 50, 
          error: null,
          retryInfo: null
        } : f);
        if (fileToProcess.isPdfPage) {
          return updateParentProgress(updated, fileToProcess.parentPdfId);
        }
        return updated;
      });

      // Chờ nhẹ 50ms để trạng thái cập nhật vào filesRef
      await new Promise(resolve => setTimeout(resolve, 50));

      let success = false;
      let textResult = '';

      while (!success && processingRef.current) {
        const currentKey = keys[keyIndexRef.current];
        try {
          textResult = await processOCR(
            fileToProcess.originalFile,
            currentKey,
            config.model
          );

          if (!processingRef.current) return; // Dừng nếu đã Reset

          success = true;

          setFiles(prev => {
            let updated = prev.map(f => f.id === fileToProcess.id ? {
              ...f,
              status: 'completed',
              progress: 100,
              result: textResult,
              retryInfo: null,
              error: null
            } : f);

            if (fileToProcess.isPdfPage) {
              updated = updateParentProgress(updated, fileToProcess.parentPdfId);
              updated = checkAndMergePdfText(updated, fileToProcess.parentPdfId);
            }
            return updated;
          });

        } catch (error) {
          if (!processingRef.current) return; // Dừng nếu đã Reset

          console.error("Lỗi khi xử lý OCR page:", fileToProcess.name, error);
          
          const isRateLimit = error.status === 429 || 
                              error.message?.includes('429') || 
                              error.message?.includes('RESOURCE_EXHAUSTED') || 
                              error.message?.toLowerCase().includes('quota') || 
                              error.message?.toLowerCase().includes('rate limit');

          if (isRateLimit && keys.length > 1) {
            // Tăng chỉ mục keyIndex lên 1 để chuyển sang key tiếp theo
            keyIndexRef.current = (keyIndexRef.current + 1) % keys.length;

            // Hiển thị trạng thái đổi key
            setFiles(prev => {
              const updated = prev.map(f => f.id === fileToProcess.id ? {
                ...f,
                status: 'processing',
                retryInfo: {
                  customMessage: 'Key cũ bị nghẽn, đang tự động đổi sang Key dự phòng...',
                  errorMsg: error.message
                }
              } : f);
              if (fileToProcess.isPdfPage) {
                return updateParentProgress(updated, fileToProcess.parentPdfId);
              }
              return updated;
            });

            // Nghỉ chờ 2 giây
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Tiếp tục vòng lặp để gọi lại chính trang đó bằng key mới
          } else {
            // Lỗi thông thường hoặc chỉ có 1 key -> Đánh dấu lỗi và thoát khỏi loop
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
            break; // Thoát khỏi retry loop
          }
        }
      }

      // Kiểm tra xem còn tệp nào đang chờ xử lý tiếp theo không
      const nextWaiting = filesRef.current.find(f => !f.isParentPdf && f.status === 'waiting');
      if (nextWaiting && processingRef.current) {
        // Tích hợp khoảng trễ 4.5 giây giãn cách giữa các file để tránh lỗi Rate Limit 429
        await new Promise(resolve => setTimeout(resolve, 4500));
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
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-container/10 selection:text-primary flex flex-col scroll-smooth">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md h-16 flex items-center border-b border-outline-variant/30">
        <div className="max-w-[1200px] mx-auto w-full flex justify-between items-center px-4 md:px-8">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="material-symbols-outlined text-primary text-headline-md">bubble_chart</span>
            <span className="text-headline-md font-headline-md font-bold text-primary">ScanJoy</span>
          </div>
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
            <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors duration-200">menu</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 pt-24 pb-12 space-y-16 flex-1 flex flex-col justify-start w-full">
        {/* Section 1: Hero & App */}
        <section id="cong-cu" className="w-full text-center space-y-8">
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-display-lg-mobile md:text-display-lg font-display-lg text-primary tracking-tight">
              Chuyển đổi Hình ảnh & PDF sang Văn bản
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-md mx-auto">
              Biến mọi tài liệu giấy thành văn bản số chỉ trong vài giây với công nghệ AI hiện đại.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <ApiConfig onConfigChange={handleConfigChange} />
          </div>

          {files.length === 0 ? (
            <div className="max-w-md mx-auto">
              <FileDropzone onFilesSelected={handleFilesSelected} />
            </div>
          ) : (
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
                  
                  <div className="pt-4 mt-auto border-t border-outline-variant/20 shrink-0">
                    <button
                      onClick={startOCR}
                      disabled={isProcessing || files.some(f => f.status === 'splitting') || files.length === 0}
                      className="w-full bg-primary hover:bg-primary-container text-on-primary py-3.5 px-4 rounded-full font-headline-md shadow-lg shadow-primary/20 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isProcessing ? 'Đang xử lý...' : 'Chuyển đổi ngay'}
                      <span className="material-symbols-outlined">auto_fix_high</span>
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
          )}
        </section>

        {/* Section 2: Comparison */}
        <section id="so-sanh" className="w-full space-y-8 pt-10">
          <div className="text-center space-y-2">
            <h2 className="text-headline-lg font-headline-lg text-primary">Tại sao nên chọn ScanJoy?</h2>
            <p className="text-on-surface-variant text-body-md font-medium">So sánh sự khác biệt vượt trội</p>
          </div>

          <div className="space-y-6">
            <div className="hidden md:grid grid-cols-2 gap-0 mb-2">
              <div className="text-center py-2 bg-error-container/10 rounded-l-xl border border-outline-variant/30">
                <span className="text-label-md font-bold text-error uppercase tracking-widest">Cách cũ (Truyền thống)</span>
              </div>
              <div className="text-center py-2 bg-tertiary-container/10 rounded-r-xl border border-outline-variant/30 border-l-0">
                <span className="text-label-md font-bold text-tertiary uppercase tracking-widest">Giải pháp ScanJoy</span>
              </div>
            </div>

            {/* Row 1: Tối ưu quy trình xử lý */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-5 border-b md:border-b-0 md:border-r border-outline-variant/20 bg-error-container/5">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-error shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>heart_broken</span>
                    <div>
                      <p className="text-body-md text-on-surface-variant leading-relaxed">
                        Phải upload từng trang tài liệu lên Google Drive, chờ đợi bóc tách rồi cặm cụi copy từng đoạn thủ công cực kỳ mất thời gian.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-tertiary-container/5">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-tertiary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
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
                    <span className="material-symbols-outlined text-error shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                    <div>
                      <p className="text-body-md text-on-surface-variant leading-relaxed">
                        Văn bản bị lỗi dính chữ, dính khoảng trắng, xuống dòng vô tội vạ; xuất file .docx trực tuyến nhưng thực chất là chứa ảnh dán vào, không chỉnh sửa được.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-tertiary-container/5">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-tertiary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
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
                    <span className="material-symbols-outlined text-error shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                    <div>
                      <p className="text-body-md text-on-surface-variant leading-relaxed">
                        Ứng dụng nước ngoài nhận diện tiếng Việt không chuẩn, lại giới hạn số trang (1-2 trang) và ép nâng cấp gói trả phí đắt đỏ.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-tertiary-container/5">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-tertiary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
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
                    <span className="material-symbols-outlined text-error shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    <div>
                      <p className="text-body-md text-on-surface-variant leading-relaxed">
                        E ngại tài liệu tối mật của doanh nghiệp bị lưu trữ và rò rỉ trên máy chủ của bên thứ ba.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-tertiary-container/5">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-tertiary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
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
                    <span className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}>
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
          <p className="text-label-md text-on-surface-variant">© 2026 Gemini OCR Tiếng Việt</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
