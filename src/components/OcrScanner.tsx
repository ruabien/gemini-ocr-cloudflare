/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { UploadCloud, Settings, Shield, AlertTriangle, Layers, Activity, ScanLine, CheckCircle2, XCircle } from "lucide-react";
import { OcrConfig } from "../types";
// @ts-ignore
import { loadPdfJs, splitPdfToImages } from "../utils/pdfProcessor";

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
  totalPages?: number;
}

export default function OcrScanner({ onFileLoaded, config, setConfig }: OcrScannerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [autoMerge, setAutoMerge] = useState(false);
  
  const [isSlicing, setIsSlicing] = useState(false);
  const [slicingMessage, setSlicingMessage] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState("");
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [editorContent, setEditorContent] = useState("");
  const editorContentRef = useRef("");

  const [fileErrors, setFileErrors] = useState<Record<number, string>>({});
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Range State
  const [fromPage, setFromPage] = useState<string>("");
  const [toPage, setToPage] = useState<string>("");

const handleSelectedFiles = async (files: File[]) => {
  // Validation: allow bulk image uploads, but restrict to a single PDF at a time
  const pdfFilesInSelection = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
  const existingPdfCount = (queuedFiles || []).filter(q => q.file.name.toLowerCase().endsWith('.pdf')).length;
  const totalPdfCount = existingPdfCount + pdfFilesInSelection.length;
  if (pdfFilesInSelection.length > 0 && totalPdfCount > 1) {
    alert("Hệ thống chỉ hỗ trợ xử lý mỗi lần 1 tệp PDF. Vui lòng tải lên từng tệp một để đảm bảo hiệu năng.");
    return;
  }

  const newQueued: QueuedFile[] = files.map(f => ({
    id: Math.random().toString(36).substring(2, 11),
    file: f,
    status: 'waiting',
    size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
    slicedPages: [],
    pagesBase64Array: []
  }));
  
  setQueuedFiles(prev => [...prev, ...newQueued]);

  for (const qFile of newQueued) {
    if (qFile.file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await qFile.file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? {
          ...f,
          message: `PDF: ${numPages} trang`,
          totalPages: numPages
        } : f));
        await pdf.destroy();
      } catch (err) {
        // Safe placeholder
      }
    }
  }
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
    const filesToProcess = (queuedFiles || []).filter(q => q && q.status !== 'done');
    if (!filesToProcess || filesToProcess.length === 0) return;

    setIsBatchProcessing(true);
    setEditorContent("");
    editorContentRef.current = "";
    setFileErrors({});

    const selectedFiles = filesToProcess.map(q => q.file);

    const updateFileStatus = (index: number, status: "processing" | "completed" | "error") => {
      const qFile = filesToProcess[index];
      if (!qFile) return;
      const mappedStatus = status === "completed" ? "done" : status;
      setQueuedFiles(prev => (prev || []).map(f => f.id === qFile.id ? { ...f, status: mappedStatus as any } : f));
    };

 // Retrieve Gemini API keys with round‑robin support
 const rawKeys = localStorage.getItem('vks_gemini_api_keys') || '';
 let keysArray = rawKeys.split(/[\n,]+/).map(k => k.replace(/[\r\n\s]/g, '')).filter(Boolean);
 // Fallback to legacy single‑key storage
 if (keysArray.length === 0) {
   const fallback = localStorage.getItem("apiKey") || localStorage.getItem("gemini_api_key");
   if (fallback) {
     keysArray = [fallback.replace(/[\r\n\s]/g, '')];
   }
 }
 if (keysArray.length === 0) {
   alert('Missing Gemini API Key. Please configure it in Settings.');
   setIsBatchProcessing(false);
   return;
 }
 let activeKeyIndex = 0;
 const getActiveKey = () => {
   const activeKey = keysArray[activeKeyIndex];
   if (!activeKey) return '';
   const cleanKey = activeKey.replace(/[\r\n\s]/g, '');
   return cleanKey;
 };

 const model = (config as any)?.model || localStorage.getItem('ocr_model') || 'gemini-1.5-flash';

    const sendFileToBackend = async (file: File): Promise<void> => {
      let fileType = file.type || '';
      if (!fileType) {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          fileType = 'application/pdf';
        } else if (file.name.toLowerCase().endsWith('.png')) {
          fileType = 'image/png';
        } else {
          fileType = 'image/jpeg';
        }
      }

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const rawBase64 = result.includes(',') ? result.split(',')[1] : result;
          const cleanBase64 = rawBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          resolve(cleanBase64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

 // Helper to perform a Gemini request with a specific key
 const makeRequest = (key: string) => {
   return new Promise<void>((resolve, reject) => {
     const xhr = new XMLHttpRequest();
     const selectedModel = localStorage.getItem("gemini_model_alias") || "gemini-2.5-flash";
     const googleUrl = `https://generativelanguage.googleapis.com/v1/models/${selectedModel}:generateContent?key=${key}`;
     xhr.open("POST", googleUrl, true);
     xhr.setRequestHeader("Content-Type", "application/json");
     
     xhr.upload.onprogress = (e) => {
       if (e.lengthComputable) {
         const percentComplete = Math.round((e.loaded / e.total) * 100);
         setProgress(percentComplete);
       }
     };
     
     xhr.onload = () => {
       if (xhr.status >= 200 && xhr.status < 300) {
         try {
           const rawText = xhr.responseText;
           const cleanJson = JSON.parse(rawText);
           
           const geminiText = cleanJson.candidates?.[0]?.content?.parts?.[0]?.text;
           const actualText = geminiText || cleanJson.text || rawText;
           
           let lines = actualText.split('\n');
           if (lines.length > 0) {
             const firstLine = lines[0].trim();
             const isAiIntro = /^(Dưới đây là|Văn bản đã được|Kết quả|Đây là văn bản)/i.test(firstLine) && firstLine.endsWith(':');
             if (isAiIntro) {
               lines.shift();
             }
           }
           const sanitizedText = lines.join('\n').trim();
           
           setEditorContent((prev) => prev + (prev ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedText);
           editorContentRef.current += (editorContentRef.current ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedText;
           resolve();
         } catch (e) {
           reject(e);
         }
       } else {
         // Extract error information
         let errMsg = `HTTP error ${xhr.status}`;
         try {
           const errJson = JSON.parse(xhr.responseText);
           errMsg = errJson?.error?.message || errJson?.error || errMsg;
         } catch {}
         reject({ status: xhr.status, message: errMsg });
       }
     };
     
     xhr.onerror = () => reject({ status: 0, message: "Network Error" });
     
     const payload = {
       "contents": [{
         "parts": [
           {"text": "Bóc tách toàn bộ văn bản trong ảnh này sang tiếng Việt chuẩn."},
           {"inlineData": {
             "mimeType": fileType.startsWith("image/") ? fileType : "image/jpeg",
             "data": base64Data
           }}
         ]
       }]
     };
     
     xhr.send(JSON.stringify(payload));
   });
 };

 // Retry loop with round‑robin key rotation on quota errors
 const maxAttempts = keysArray.length;
 let attempts = 0;
 while (true) {
   const currentKey = getActiveKey();
   try {
     await makeRequest(currentKey);
     // Success – exit the retry loop
     return;
   } catch (err: any) {
     const msg = err?.message || "";
     const status = err?.status;
     const isQuota = status === 429 || /RESOURCE_EXHAUSTED|Quota exceeded/.test(msg);
     if (isQuota) {
       // Rotate to next key
       if (keysArray.length > 1) {
         activeKeyIndex = (activeKeyIndex + 1) % keysArray.length;
       }
       attempts++;
       if (attempts >= maxAttempts) {
         // All keys exhausted – pause before next retry cycle
         console.warn("Tất cả API keys đã hết hạn ngạch. Hệ thống tạm dừng 5-10 giây trước khi thử lại...");
         await new Promise(r => setTimeout(r, Math.random() * 5000 + 5000));
         attempts = 0;
       }
       continue; // retry with next key
     }
     // Non‑quota error – propagate
     throw err;
   }
 }
    };

    // Inside the true sequential handler
    for (let i = 0; i < filesToProcess.length; i++) {
      const qFile = filesToProcess[i];
      const file = qFile.file;

      // Update UI status for this specific index to "Đang bóc tách"
      updateFileStatus(i, "processing"); 
      setProcessingFile(file.name);

      // Determine if the file is a PDF
      const isPdf = file.name.toLowerCase().endsWith('.pdf');

      // Helper to send a single image/file and handle errors per page
      const processSinglePage = async (pageFile: File, pageIdx: number, totalPages: number) => {
        try {
          await sendFileToBackend(pageFile);
          // Append a heading for successful page extraction
          const heading = `--- KẾT QUẢ TRANG ${pageIdx} ---`;
          setEditorContent((prev) => prev + (prev ? "\n\n" + heading + "\n\n" : heading + "\n\n"));
          editorContentRef.current += (editorContentRef.current ? "\n\n" + heading + "\n\n" : heading + "\n\n");
        } catch (err: any) {
          const errorMsg = `[Lỗi bóc tách]: Vui lòng kiểm tra lại chất lượng tệp tin hoặc cấu hình Key của trang này.`;
          setEditorContent((prev) => prev + (prev ? "\n\n" + errorMsg : errorMsg));
          editorContentRef.current += (editorContentRef.current ? "\n\n" + errorMsg : errorMsg);
        }
      };

      if (isPdf) {
        // Split PDF into images (all pages)
        let pageFiles: File[] = [];
        try {
          pageFiles = await splitPdfToImages(file, () => {});
        } catch (err: any) {
          setFileErrors(prev => ({ ...prev, [i]: "[Lỗi bóc tách]: Vui lòng kiểm tra lại chất lượng tệp tin hoặc cấu hình Key của trang này." }));
          updateFileStatus(i, "error");
          continue; // Skip to next file
        }

        // Resolve page range values
        let startPage = 1;
        let endPage = pageFiles.length;

        if (filesToProcess.length === 1) {
          // Only respect user inputs when a single file is queued
          if (fromPage) {
            const parsedFrom = parseInt(fromPage, 10);
            if (!isNaN(parsedFrom) && parsedFrom >= 1) {
              startPage = Math.max(1, Math.min(parsedFrom, pageFiles.length));
            }
          }
          if (toPage) {
            const parsedTo = parseInt(toPage, 10);
            if (!isNaN(parsedTo) && parsedTo >= 1) {
              endPage = Math.min(pageFiles.length, Math.max(startPage, parsedTo));
            }
          }
        }

        // Process each page within the selected range
        for (let p = startPage; p <= endPage; p++) {
          const pageFile = pageFiles[p - 1]; // zero‑based index
          setBatchProgressText(`Đang bóc tách ${file.name} - Trang ${p}/${endPage}...`);
          await processSinglePage(pageFile, p, endPage);
          // Throttle between pages
          await new Promise((res) => setTimeout(res, 200));
        }

        // Mark as completed if no fatal error occurred
        updateFileStatus(i, "completed");
      } else {
        // Non‑PDF file: process normally with a single request
        try {
          await sendFileToBackend(file);
          updateFileStatus(i, "completed");
        } catch (err: any) {
          setFileErrors(prev => ({
            ...prev,
            [i]: "[Lỗi bóc tách]: Vui lòng kiểm tra lại chất lượng tệp tin hoặc cấu hình Key của trang này."
          }));
          updateFileStatus(i, "error");
        }
      }

      // Explicit safety throttle delay of 200 ms to prevent Gemini Rate Limit
      if (i < filesToProcess.length - 1) {
        await new Promise((res) => setTimeout(res, 200));
      }
    }

    setTimeout(() => {
      setIsBatchProcessing(false);
      setProcessingFile(null);
      setProgress(0);

      const finalContent = editorContentRef.current;
      if (finalContent && finalContent.trim() !== "") {
        const outputMime = filesToProcess.length > 0 ? filesToProcess[0]?.file?.type : "application/pdf";
        onFileLoaded({ 
          name: filesToProcess.length > 1 && autoMerge ? "Hồ Sơ Gộp Nhiều Tài Liệu" : (filesToProcess[0]?.file?.name || "Tài Liệu OCR"), 
          content: finalContent, 
          mimeType: outputMime, 
          selectedFile: filesToProcess.map(f => f.file) 
        });
      }
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
            {(queuedFiles || []).length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    <span>Hàng đợi xử lý ({(queuedFiles || []).length} tệp)</span>
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
                  {(queuedFiles || []).map((q, index) => {
                    if (!q) return null;
                    return (
                    <div key={q.id || Math.random()} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors">
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-semibold text-slate-800 truncate" title={q.file?.name}>{q.file?.name || 'Tệp không xác định'}</span>
                         <span className="text-[10px] text-slate-500 mt-0.5">
                           {q.size || ''} 
                           {(q.slicedPages || []).length > 0 ? ` • ${(q.slicedPages || []).length} trang phân mảnh` : q.message ? ` • ${q.message}` : ''}
                         </span>
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
                         <span 
                           onClick={() => {
                             if (q.status === 'error' && fileErrors[index]) {
                               setErrorModalMsg(`Chi tiết lỗi hệ thống tại trang này: ${fileErrors[index]}`);
                             }
                           }}
                           className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                             q.status === 'error' ? 'cursor-pointer hover:bg-red-200 transition-colors' : ''
                           } ${
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
                           {q.status === 'error' && 'LỖI'}
                         </span>
                       </div>
                    </div>
                    );
                  })}
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
                  disabled={(queuedFiles || []).length === 0 || isBatchProcessing || isSlicing}
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
                        disabled={(queuedFiles || []).length > 1}
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
                        disabled={(queuedFiles || []).length > 1}
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

      {/* ERROR MODAL */}
      {errorModalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Lỗi hệ thống</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {errorModalMsg}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setErrorModalMsg(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
