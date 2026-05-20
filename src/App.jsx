import { useState, useRef, useCallback } from 'react';
import ApiConfig from './components/ApiConfig';
import FileDropzone from './components/FileDropzone';
import QueueList from './components/QueueList';
import ResultViewer from './components/ResultViewer';
import { Sparkles, Play } from 'lucide-react';
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

    setFiles(prev => prev.map(f => {
      if (f.status === 'error') {
        // Reset trạng thái lỗi của các tệp (cả trang con và ảnh độc lập)
        return { ...f, status: 'waiting', error: null };
      }
      return f;
    }));

    // Chỉ lấy các file cần chạy OCR thực tế (trang con PDF hoặc ảnh độc lập, loại bỏ PDF cha)
    // Cần lấy danh sách tệp mới nhất dựa trên state hiện tại tại thời điểm click chạy
    let currentWaiting = [];
    setFiles(prev => {
      currentWaiting = prev.filter(f => !f.isParentPdf && (f.status === 'waiting' || f.status === 'error'));
      return prev;
    });

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

  const activeFile = files.find(f => f.id === activeFileId);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <ApiConfig onConfigChange={handleConfigChange} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        
        {files.length === 0 ? (
          <div className="flex flex-col items-center mt-12 animate-in fade-in zoom-in duration-500">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-2xl mb-5 shadow-inner">
              <Sparkles size={32} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-4 text-center">
              Trích xuất văn bản thông minh
            </h1>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed text-center mb-10">
              Tải lên hình ảnh hoặc tài liệu PDF của bạn để nhận diện và trích xuất dữ liệu nhanh chóng với sức mạnh của Google Gemini AI.
            </p>
            <div className="w-full max-w-3xl bg-white p-2 md:p-4 rounded-3xl shadow-sm border border-slate-200">
              <FileDropzone onFilesSelected={handleFilesSelected} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Left Column: Dropzone + Queue */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                 <FileDropzone onFilesSelected={handleFilesSelected} />
              </div>
              
              <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 max-h-[600px] overflow-hidden">
                <QueueList 
                  files={files} 
                  activeFileId={activeFileId} 
                  onFileClick={setActiveFileId}
                  onRemoveFile={handleRemoveFile}
                />
                
                <div className="pt-4 mt-auto border-t border-gray-100">
                  <button
                    onClick={startOCR}
                    disabled={isProcessing || files.some(f => f.status === 'splitting') || !files.some(f => !f.isParentPdf && (f.status === 'waiting' || f.status === 'error'))}
                    className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play size={18} />
                    {isProcessing ? 'Đang xử lý...' : 'Bắt đầu OCR'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Result Viewer */}
            <div className="lg:col-span-7 h-[calc(100vh-140px)] sticky top-6">
              <ResultViewer file={activeFile} onUpdateResult={handleUpdateResult} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
