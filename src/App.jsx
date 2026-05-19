import { useState, useRef, useCallback } from 'react';
import ApiConfig from './components/ApiConfig';
import FileDropzone from './components/FileDropzone';
import QueueList from './components/QueueList';
import ResultViewer from './components/ResultViewer';
import { Sparkles, Play } from 'lucide-react';
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

  const handleFilesSelected = (newOriginalFiles) => {
    const newFiles = newOriginalFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      originalFile: file,
      status: 'waiting',
      progress: 0,
      result: '',
      error: null
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    if (!activeFileId && newFiles.length > 0) {
      setActiveFileId(newFiles[0].id);
    }
  };

  const handleRemoveFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
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
      if (f.status === 'error') return { ...f, status: 'waiting', error: null };
      return f;
    }));
    
    // Use the current files closure to determine the queue
    const waitingFiles = files.filter(f => f.status === 'waiting' || f.status === 'error');
    let currentIndex = 0;
    
    const CONCURRENCY = 2;
    
    const processNext = async () => {
      if (!processingRef.current) return;

      const fileToProcess = waitingFiles[currentIndex++];
      if (!fileToProcess) return;

      setActiveFileId(prev => prev || fileToProcess.id);

      setFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'processing', progress: 50, error: null } : f));

      try {
        const textResult = await processOCR(fileToProcess.originalFile, config.apiKey, config.model);
        
        setFiles(prev => prev.map(f => f.id === fileToProcess.id ? { 
          ...f, 
          status: 'completed', 
          progress: 100, 
          result: textResult 
        } : f));
        
      } catch (error) {
        setFiles(prev => prev.map(f => f.id === fileToProcess.id ? { 
          ...f, 
          status: 'error', 
          progress: 0, 
          error: error.message 
        } : f));
      }

      await processNext();
    };

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY, waitingFiles.length); i++) {
      workers.push(processNext());
    }

    await Promise.all(workers);
    
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
                    disabled={isProcessing || !files.some(f => f.status === 'waiting' || f.status === 'error')}
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
