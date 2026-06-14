/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { UploadCloud, Settings, Shield, AlertTriangle, Layers, Activity, ScanLine, CheckCircle2, XCircle } from "lucide-react";
import { OcrConfig } from "../types";
import * as pdfjs from 'pdfjs-dist';

interface OcrScannerProps {
  onFileLoaded: (fileData: { name: string; content: string; mimeType: string; selectedFile?: File | File[] }) => void;
  config: OcrConfig;
  setConfig: React.Dispatch<React.SetStateAction<OcrConfig>>;
}

interface QueuedFile {
  id: string;
  file: File;
  status: 'waiting' | 'slicing' | 'ready' | 'processing' | 'done' | 'error';
  size: string;
  slicedPages: { index: number; dataUrl: string; size: string }[];
  pagesBase64Array: string[];
  message?: string;
  resultData?: any;
}

export default function OcrScanner({ onFileLoaded, config, setConfig }: OcrScannerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [autoMerge, setAutoMerge] = useState(true);
  
  const [isSlicing, setIsSlicing] = useState(false);
  const [slicingMessage, setSlicingMessage] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState("");
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [editorContent, setEditorContent] = useState("");
  const editorContentRef = useRef("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Range State
  const [fromPage, setFromPage] = useState<string>("");
  const [toPage, setToPage] = useState<string>("");

  // Cắt PDF thành từng trang ảnh rời rạc và tự động nén
  const sliceAndCompressPdf = async (file: File, logProgress: (msg: string) => void): Promise<{ dataUrl: string; base64: string; size: string }[]> => {
    logProgress("Đang nạp bộ giải mã PDF chuyên sâu...");
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    logProgress("Đang phân tích cấu trúc tệp PDF...");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pagesCount = pdf.numPages;
    const result: { dataUrl: string; base64: string; size: string }[] = [];
    
    for (let i = 1; i <= pagesCount; i++) {
      logProgress(`Đang trích xuất & nén trang ${i}/${pagesCount}...`);
      const page = await pdf.getPage(i);
      
      const viewport = page.getViewport({ scale: 1 });
      const maxDim = 1200; // Tối ưu cân bằng giữa độ nét chữ và dung lượng payload
      let scale = 1.5;
      if (viewport.width > maxDim || viewport.height > maxDim) {
        scale = maxDim / Math.max(viewport.width, viewport.height);
      }
      
      const scaledViewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      const context = canvas.getContext("2d");
      
      if (context) {
        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75); // Nén tối đa kích thước, chất lượng 75%
        const base64 = dataUrl.split(",")[1];
        const approxSize = `${((base64.length * 3) / 4 / 1024).toFixed(0)} KB`;
        result.push({ dataUrl, base64, size: approxSize });
      }
    }
    return result;
  };

  // Nén tự động chất lượng hình ảnh đầu vào thông thường
  const compressImageFile = (file: File, logProgress: (msg: string) => void): Promise<{ dataUrl: string; base64: string; size: string }[]> => {
    return new Promise((resolve, reject) => {
      logProgress("Đang nạp hình ảnh hồ sơ vụ án...");
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          logProgress("Đang nén tối ưu độ phân giải...");
          const canvas = document.createElement("canvas");
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75); // Nén 75% chất lượng
            const base64 = dataUrl.split(",")[1];
            const approxSize = `${((base64.length * 3) / 4 / 1024).toFixed(0)} KB`;
            resolve([{ dataUrl, base64, size: approxSize }]);
          } else {
            reject(new Error("Không thể tạo bộ dựng canvas."));
          }
        };
        img.onerror = (err) => reject(err);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleSelectedFiles = (files: File[]) => {
    const newQueued: QueuedFile[] = files.map(f => ({
      id: Math.random().toString(36).substring(2, 11),
      file: f,
      status: 'waiting',
      size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
      slicedPages: [],
      pagesBase64Array: []
    }));
    
    setQueuedFiles(prev => [...prev, ...newQueued]);
  };

  // Xử lý sự kiện Drag
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
       fileInputRef.current.value = "";
    }
  };

  const startOcrProcess = async () => {
    const filesToProcess = queuedFiles.filter(q => q.status !== 'done');
    if (filesToProcess.length === 0) return;
    
    let keys: string[] = [];
    try {
      const stored = localStorage.getItem('vks_gemini_api_keys');
      keys = stored ? JSON.parse(stored) : [];
    } catch(e) { 
      keys = []; 
    }

    if (!keys || keys.length === 0) {
      alert("Vui lòng cấu hình ít nhất một Gemini API Key trong mục Cài đặt để bắt đầu bóc tách hồ sơ.");
      return;
    }

    setIsBatchProcessing(true);
    setEditorContent("");
    editorContentRef.current = "";
    
    let totalFiles = filesToProcess.length;
    let completedFiles = 0;
    
    const filesPassToEditor: File[] = [];

    for (const qFile of filesToProcess) {
      const file = qFile.file;
      setBatchProgressText(`Đã xử lý ${completedFiles}/${totalFiles} tệp...`);
      setProcessingFile(file.name);
      setProgress(5);

      // Step 1: Tiền xử lý (slicing & nén) nếu chưa được thực hiện
      let pagesBase64Array = qFile.pagesBase64Array;
      if (pagesBase64Array.length === 0) {
        setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? { ...f, status: 'slicing' } : f));
        setBatchProgressText(`Đã xử lý ${completedFiles}/${totalFiles} tệp - Đang phân tích cấu trúc...`);
        
        try {
          const isPdfValue = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
          const isImageValue = file.type.startsWith("image/") || 
                            file.name.toLowerCase().endsWith(".png") || 
                            file.name.toLowerCase().endsWith(".jpg") || 
                            file.name.toLowerCase().endsWith(".jpeg");

          let pages: { dataUrl: string; base64: string; size: string }[] = [];
          if (isPdfValue) {
            pages = await sliceAndCompressPdf(file, (msg) => {
              setBatchProgressText(`Đang xử lý ${completedFiles}/${totalFiles} tệp - ${msg}`);
            });
          } else if (isImageValue) {
            pages = await compressImageFile(file, (msg) => {
              setBatchProgressText(`Đang xử lý ${completedFiles}/${totalFiles} tệp - ${msg}`);
            });
          } else {
            const reader = new FileReader();
            pages = await new Promise((resolve, reject) => {
              reader.onload = (e) => {
                if (e.target?.result) {
                  const base64 = (e.target.result as string).split(",")[1];
                  resolve([{
                    dataUrl: e.target.result as string,
                    base64,
                    size: `${((base64.length * 3) / 4 / 1024).toFixed(0)} KB`
                  }]);
                } else {
                  reject(new Error("Lỗi đọc tệp tin."));
                }
              };
              reader.onerror = () => reject(new Error("Lỗi tải tệp."));
              reader.readAsDataURL(file);
            });
          }

          pagesBase64Array = pages.map(p => p.base64);
          
          setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? {
            ...f,
            slicedPages: pages.map((p, idx) => ({ index: idx + 1, dataUrl: p.dataUrl, size: p.size })),
            pagesBase64Array: pagesBase64Array
          } : f));
        } catch (err: any) {
          console.error("Lỗi tiền xử lý tệp tin:", err);
          setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? { ...f, status: 'error', message: err.message || err } : f));
          completedFiles++;
          continue;
        }
      }
      
      // Step 2: Gửi tín hiệu bóc tách văn bản (OCR)
      setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? { ...f, status: 'processing' } : f));
      setBatchProgressText(`Đã xử lý ${completedFiles}/${totalFiles} tệp - Đang trích xuất văn bản...`);

      // Simulate progress bar while waiting
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          const increment = Math.floor(Math.random() * 10) + 5;
          return Math.min(prev + increment, 90);
        });
      }, 500);

      const mimeTypeToSend = (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) 
                              ? "application/json-pages" 
                              : file.type || "image/jpeg";
                              
      const formData = new FormData();
      formData.append("file", file);

      // Extract form data if necessary - currently sending raw file via FormData
      // Removing custom headers entirely so browser sets multipart boundary and avoids CORS preflight OPTIONS

      let response: Response;
      try {
        response = await fetch('https://ocr-worker.text24.workers.dev/', {
          method: 'POST',
          body: formData,
        });
      } catch (err: any) {
        clearInterval(interval);
        setEditorContent((prev) => {
          const next = prev + `\n\n[LỖI TRANG: ${file.name}]\n\n`;
          editorContentRef.current = next;
          return next;
        });
        setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? { ...f, status: 'error', message: err.message || err } : f));
        completedFiles++;
        console.error(`OCR request failed for ${file.name}:`, err);
        continue;
      }
      
      clearInterval(interval);
      setProgress(100);

      if (response.ok) {
        const rawResult = await response.text();
        try {
          const cleanJson = JSON.parse(rawResult);
          const finalContent = cleanJson.text || rawResult;
          setEditorContent((prev) => {
            const next = prev + (prev ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + finalContent;
            editorContentRef.current = next;
            return next;
          });
        } catch (e) {
          setEditorContent((prev) => {
            const next = prev + (prev ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + rawResult;
            editorContentRef.current = next;
            return next;
          });
        }
        
        setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? { ...f, status: 'done' } : f));
        filesPassToEditor.push(file);
      } else {
        setEditorContent((prev) => {
          const next = prev + `\n\n[LỖI TRANG: ${file.name}]\n\n`;
          editorContentRef.current = next;
          return next;
        });
        setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? { ...f, status: 'error', message: `HTTP error: ${response.status}` } : f));
      }
      completedFiles++;
    }

    setBatchProgressText(`Đã xử lý xong ${completedFiles}/${totalFiles} tệp.`);
    
    setTimeout(() => {
      const finalContent = editorContentRef.current;
      if (finalContent.trim() !== "") {
        const outputMime = filesPassToEditor.length > 0 ? filesPassToEditor[0].type : "application/pdf";
        onFileLoaded({ 
          name: filesPassToEditor.length > 1 && autoMerge ? "Hồ Sơ Gộp Nhiều Tài Liệu" : (filesPassToEditor[0]?.name || "Tài Liệu OCR"), 
          content: finalContent, 
          mimeType: outputMime, 
          selectedFile: filesPassToEditor 
        });
      }
      
      setIsBatchProcessing(false);
      setProcessingFile(null);
      setProgress(0);
    }, 1000);
  };

  return (
    <div id="ocr-scanner-tab" className="min-h-[calc(100vh-4rem)] bg-slate-50 pb-12 flex flex-col">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-grow">
      
        {/* HEADER SECTION */}
        <div className="border-b border-slate-200 pb-5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <span>Số hóa & Trích xuất hồ sơ vụ án chuyên sâu</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Tải tài liệu tố tụng định dạng PDF, JPEG, PNG. Hỗ trợ <strong>tải lên hàng loạt nhiều tệp</strong> (Bulk Image OCR) và tự động gộp văn bản xuất chuẩn.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CẤU HÌNH OCR VÀ DROPZONE CHÍNH (Chiếm 2 cột trên màn hình Desktop) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* DROPZONE */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] transition-all duration-200 ${
                dragActive 
                  ? "border-red-600 bg-red-50/40" 
                  : "border-slate-300 bg-white hover:border-red-500/50 hover:bg-slate-50/50"
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                multiple={true}
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg" 
                onChange={handleFileInput}
              />
              <div className="h-14 w-14 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4 border border-red-100">
                <UploadCloud className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                Kéo thả nhiều tài liệu vào đây hoặc click để duyệt từ máy tính
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Hỗ trợ chọn nhiều tệp tin cùng lúc. Bản quét sẽ được tự động phân lớp, đưa vào hàng đợi và bóc tách nội dung tuần tự.
              </p>
              
              <div className="mt-4 flex items-center justify-center space-x-2 text-[10px] text-slate-400 font-semibold font-mono bg-slate-50 border border-slate-150 rounded px-2.5 py-1">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>MẬT MÃ HOÁ TRÊN THIẾT BỊ ĐẦU CUỐI</span>
              </div>
            </div>

            {/* HIỂN THỊ TIẾN TRÌNH KHI ĐANG BATCH PROCESSING OR SLICING */}
            {(isSlicing || isBatchProcessing) && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[200px]">
                <div className={`absolute inset-0 bg-gradient-to-r ${isBatchProcessing ? 'from-red-50/50 via-yellow-50/50 to-red-50/50' : 'from-emerald-50/50 via-yellow-50/50 to-emerald-50/50'} animate-pulse`} />
                
                <div className="relative z-10 flex flex-col items-center max-w-md text-center space-y-4">
                  <div className={`relative h-14 w-14 ${isBatchProcessing ? 'bg-red-100 border-red-200' : 'bg-emerald-100 border-emerald-200'} rounded-full flex items-center justify-center border-2 shadow-sm animate-bounce duration-1000`}>
                    {isBatchProcessing ? (
                      <Activity className="h-7 w-7 text-red-600 animate-spin duration-3000" />
                    ) : (
                      <Layers className="h-7 w-7 text-emerald-600 animate-spin" style={{ animationDuration: "3s" }} />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest font-sans flex items-center justify-center">
                      <span>{isBatchProcessing ? 'Đang bóc tách văn bản nghiệp vụ...' : 'Tiền xử lý tập tin tư pháp...'}</span>
                    </h3>
                    <p className={`text-xs font-mono mt-1 font-semibold ${isBatchProcessing ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isBatchProcessing ? batchProgressText : slicingMessage}
                    </p>
                    {isBatchProcessing && processingFile && (
                      <p className="text-[10px] text-slate-500 mt-1">Đang chạy: {processingFile}</p>
                    )}
                  </div>

                  {/* Thanh tiến trình Shimmer */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 relative ${isBatchProcessing ? 'bg-gradient-to-r from-red-600 via-yellow-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-yellow-400'}`}
                      style={{ width: isBatchProcessing ? `${progress}%` : '100%' }}
                    >
                      {isBatchProcessing && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    {isBatchProcessing 
                      ? "*Hệ thống đang nạp tệp và gửi tín hiệu bóc tách văn bản lên Serverless Edge Node tuần tự."
                      : "*Tập tin PDF được bóc tách rời rạc thành từng trang ảnh. Hình ảnh đầu vào tự động nén để triệt tiêu lỗi quá tải tải trọng API."
                    }
                  </p>
                </div>
              </div>
            )}

            {/* DANH SÁCH HÀNG ĐỢI (QUEUE LIST) */}
            {queuedFiles.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    <span>Hàng đợi xử lý ({queuedFiles.length} tệp)</span>
                  </h4>
                  <label className="flex items-center space-x-2 cursor-pointer bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={autoMerge} 
                      onChange={(e) => setAutoMerge(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-emerald-800">Tự động gộp văn bản</span>
                  </label>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {queuedFiles.map(q => (
                    <div key={q.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors">
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-semibold text-slate-800 truncate" title={q.file.name}>{q.file.name}</span>
                         <span className="text-[10px] text-slate-500 mt-0.5">{q.size} {q.slicedPages?.length ? `• ${q.slicedPages.length} trang phân mảnh` : ''}</span>
                       </div>
                       <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                         {q.status === 'error' ? (
                           <XCircle className="h-4 w-4 text-red-500" />
                         ) : q.status === 'done' ? (
                           <CheckCircle2 className="h-4 w-4 text-green-500" />
                         ) : q.status === 'processing' ? (
                           <Activity className="h-4 w-4 text-blue-500 animate-spin" />
                         ) : q.status === 'slicing' ? (
                           <Layers className="h-4 w-4 text-yellow-500 animate-pulse" />
                         ) : (
                           <div className="h-2 w-2 bg-slate-300 rounded-full"></div>
                         )}
                         <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                           q.status === 'waiting' ? 'bg-slate-200 text-slate-600' :
                           q.status === 'slicing' ? 'bg-yellow-100 text-yellow-700' :
                           q.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                           q.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                           q.status === 'done' ? 'bg-green-100 text-green-700' :
                           'bg-red-100 text-red-700'
                         }`}>
                           {q.status === 'waiting' && 'Đang đợi'}
                           {q.status === 'slicing' && 'Đang bóc tách'}
                           {q.status === 'ready' && 'Sẵn sàng'}
                           {q.status === 'processing' && 'Đang trích xuất'}
                           {q.status === 'done' && 'Hoàn thành'}
                           {q.status === 'error' && 'Lỗi'}
                         </span>
                       </div>
                    </div>
                  ))}
                </div>
                
                {autoMerge && (
                  <p className="text-[10px] text-slate-500 italic leading-relaxed pt-2 border-t border-slate-100">
                    *Chế độ Gộp văn bản: Hệ thống sẽ tự động ghép nối kết quả từ tất cả các tệp theo thứ tự hàng đợi, sử dụng chuẩn phân cách hành chính (--- [TRANG KẾ TIẾP] ---).
                  </p>
                )}
              </div>
            )}

          </div>

          {/* CẤU HÌNH HỆ THỐNG (Cột bên phải Desktop) */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
              
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-100 flex items-center mb-4 relative z-10">
                <Settings className="h-4 w-4 mr-1.5 text-slate-100 animate-pulse" />
                <span>⚙️ CẤU HÌNH HỆ THỐNG</span>
              </h4>

              <div className="relative z-10 space-y-4">
                {/* NÚT BẮT ĐẦU TRÍCH XUẤT OCR */}
                <button
                  onClick={startOcrProcess}
                  disabled={queuedFiles.length === 0 || isBatchProcessing || isSlicing}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-red-500/30 transform transition hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-600"
                >
                  <ScanLine className="h-5 w-5" />
                  <span>Bắt đầu trích xuất OCR</span>
                </button>

                <div>
                  <label className="block text-xs font-bold text-slate-100 mb-1.5 uppercase tracking-wide">
                    Phạm vi trích xuất (Page Range)
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="w-1/2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Từ trang"
                        value={fromPage}
                        onChange={(e) => setFromPage(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs font-medium text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                        disabled={queuedFiles.length > 1}
                      />
                    </div>
                    <span className="text-slate-300 text-xs">—</span>
                    <div className="w-1/2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Đến trang"
                        value={toPage}
                        onChange={(e) => setToPage(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs font-medium text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                        disabled={queuedFiles.length > 1}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">*Chỉ khả dụng khi chọn 1 tệp duy nhất.</p>
                </div>

                <div className="flex items-start space-x-3 bg-yellow-50 text-yellow-800 p-3.5 rounded-lg border border-yellow-200 mt-4">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-600 mt-0.5" />
                  <p className="text-[10px] leading-relaxed font-medium">
                    <strong>Chú ý nghiệp vụ:</strong> Phục vụ công tác số hóa tài liệu mật tố tụng, toàn bộ hồ sơ bóc tách được xử lý hoàn toàn stateless trên RAM và tự động xóa sạch khi kết thúc phiên duyệt.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center">
              <h5 className="text-xs font-bold text-slate-700 flex items-center justify-center space-x-1.5">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span>🔒 TIÊU CHUẨN AN TOÀN DỮ LIỆU TỐ TỤNG</span>
              </h5>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Hệ thống đáp ứng tiêu chuẩn Stateless thuần túy. Toàn bộ tiến trình bóc tách diễn ra cô lập trên bộ nhớ đệm RAM đầu cuối.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}