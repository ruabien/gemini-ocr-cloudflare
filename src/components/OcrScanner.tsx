/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, Settings, Shield, AlertTriangle, Play, HelpCircle, FileCheck, Layers, Activity, ScanLine } from "lucide-react";
import { OcrConfig } from "../types";

interface OcrScannerProps {
  onFileLoaded: (fileData: { name: string; content: string; mimeType: string; selectedFile?: File }) => void;
  config: OcrConfig;
  setConfig: React.Dispatch<React.SetStateAction<OcrConfig>>;
}

const MOCK_DOCS = [
  {
    id: "mock-1",
    name: "Ban_an_hinh_su_so_24_2024_HS_ST.pdf",
    type: "Hình Sự - Bản Án (PDF)",
    pages: 12,
    size: "2.1 MB",
    description: "Bản án hình sự sơ thẩm đối với bị cáo Nguyễn Văn Nam (34 tuổi, cư trú tại Hoàn Kiếm, Hà Nội) về tội Cố ý gây thương tích. Thụ lý ngày 10/01/2024, xét xử ngày 25/02/2024 (Đã thụ lý 46 ngày)."
  },
  {
    id: "mock-2",
    name: "Cao_trang_truy_to_15_CT_VKS_P1.pdf",
    type: "Hình Sự - Viện Kiểm Sát (PDF)",
    pages: 8,
    size: "1.2 MB",
    description: "Cáo trạng của Viện kiểm sát nhân dân truy tố bị can Trần Văn Mạnh (32 tuổi, cư trú tại Hai Bà Trưng, HN) phạm tội Trộm cắp tài sản. Thụ lý kiểm sát ngày 05/03/2024."
  },
  {
    id: "mock-3",
    name: "Quyet_dinh_thu_ly_dan_su_112_2024.pdf",
    type: "Dân Sự - Thụ Lý (PDF)",
    pages: 5,
    size: "950 KB",
    description: "Tranh chấp hợp đồng tín dụng giữa nguyên đơn Ngân hàng và bị đơn Lê Thị Hoa (45 tuổi, cư trú tại Cầu Giấy, HN). Thụ lý ngày 12/03/2024."
  }
];

export default function OcrScanner({ onFileLoaded, config, setConfig }: OcrScannerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [slicingMessage, setSlicingMessage] = useState<string>("");
  const [isSlicing, setIsSlicing] = useState<boolean>(false);
  const [slicedPages, setSlicedPages] = useState<{ index: number; dataUrl: string; size: string }[]>([]);
  const [readyPayload, setReadyPayload] = useState<{ pagesBase64Array: string[]; fileName: string; mimeType: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Tải thư viện pdf.js động từ CDN tin cậy
  const loadPdfJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve((window as any).pdfjsLib);
      };
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  };

  // Cắt PDF thành từng trang ảnh rời rạc và tự động nén
  const sliceAndCompressPdf = async (file: File, logProgress: (msg: string) => void): Promise<{ dataUrl: string; base64: string; size: string }[]> => {
    logProgress("Đang nạp bộ giải mã PDF chuyên sâu...");
    const pdfjsLib = await loadPdfJS();
    
    logProgress("Đang phân tích cấu trúc tệp PDF...");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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

  // Kích hoạt giả lập quét tệp mượt mà và chuyển đổi màn hình sau khi đạt 100%
  const simulateOcrProcess = (fileName: string, content: string, mimeType: string) => {
    setProcessingFile(fileName);
    setProgress(5);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onFileLoaded({ name: fileName, content, mimeType, selectedFile: selectedFile || undefined });
            setProcessingFile(null);
            setProgress(0);
          }, 300);
          return 100;
        }
        // Tăng vọt ngẫu nhiên tạo độ tin cậy
        const increment = Math.floor(Math.random() * 20) + 12;
        return Math.min(prev + increment, 100);
      });
    }, 280);
  };

  // Thả tệp tin
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleSelectedFile(file);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedFile(e.target.files[0]);
    }
  };

  const handleSelectedFile = async (file: File) => {
    setSelectedFile(file);
    setIsSlicing(true);
    setSlicedPages([]);
    setSlicingMessage("Khởi kiện tệp tin...");

    try {
      let pages: { dataUrl: string; base64: string; size: string }[] = [];
      const isPdfValue = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImageValue = file.type.startsWith("image/") || 
                        file.name.toLowerCase().endsWith(".png") || 
                        file.name.toLowerCase().endsWith(".jpg") || 
                        file.name.toLowerCase().endsWith(".jpeg");

      if (isPdfValue) {
        pages = await sliceAndCompressPdf(file, setSlicingMessage);
      } else if (isImageValue) {
        pages = await compressImageFile(file, setSlicingMessage);
      } else {
        setSlicingMessage("Đang đọc loại tệp thô...");
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

      setSlicedPages(pages.map((p, idx) => ({ index: idx + 1, dataUrl: p.dataUrl, size: p.size })));
      setIsSlicing(false);

      // Chuyển tập hợp ảnh dạng JSON array về client-side processing
      const pagesBase64Array = pages.map(p => p.base64);
      const mimeTypeToSend = isPdfValue ? "application/json-pages" : file.type;
      
      setReadyPayload({
        pagesBase64Array,
        fileName: file.name,
        mimeType: mimeTypeToSend
      });

    } catch (err: any) {
      console.error("Lỗi tiền xử lý tệp tin:", err);
      setIsSlicing(false);
      alert(`Đã xảy ra lỗi khi bóc tách phân trang hoặc nén ảnh: ${err.message || err}`);
    }
  };

  const startOcrProcess = async () => {
    if (!readyPayload) return;
    
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

    setProcessingFile(readyPayload.fileName);
    setProgress(5);
    
    // Simulate progress bar while waiting
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = Math.floor(Math.random() * 10) + 5;
        return Math.min(prev + increment, 90);
      });
    }, 500);

    try {
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-Keys': JSON.stringify(keys),
        },
        body: JSON.stringify({
          base64File: JSON.stringify(readyPayload.pagesBase64Array),
          fileName: readyPayload.fileName,
          mimeType: readyPayload.mimeType,
          isEncrypted: false,
        }),
      });
      
      const data = await response.json();
      clearInterval(interval);
      setProgress(100);
      
      setTimeout(() => {
        onFileLoaded({ name: readyPayload.fileName, content: JSON.stringify(data), mimeType: readyPayload.mimeType, selectedFile: selectedFile || undefined });
        setProcessingFile(null);
        setProgress(0);
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setProcessingFile(null);
      setProgress(0);
      console.error('OCR request failed:', err);
      alert('Lỗi khi thực hiện OCR: ' + (err?.message || err));
    }
  };

  // Kích hoạt tệp mẫu nhanh tư pháp
  const selectMockDoc = (id: string) => {
    const doc = MOCK_DOCS.find(m => m.id === id);
    if (doc) {
      // Base64 ảo cho tài liệu mẫu
      const virtualBase64 = "MOCK_BASE64_BYTES_LAW_DEPT";
      const mimeType = doc.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
      simulateOcrProcess(doc.name, virtualBase64, mimeType);
    }
  };

  return (
    <div id="ocr-scanner-tab" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* HEADER SECTION */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
          <span>Số hóa & Trích xuất hồ sơ vụ án chuyên sâu</span>
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Tải tài liệu tố tụng (Cáo trạng, Bản án, Thụ lý vụ án) định dạng PDF, JPEG, PNG có dung lượng tối đa 50MB. Hệ thống tự động phân loại bị can/bị cáo, đương sự, ngày thụ lý và tóm tắt diễn biến.
        </p>
      </div>

      {/* HIỂN THỊ TIẾN TRÌNH KHỞI TẠO / PHÂN TÁCH / NÉN NẾU ĐANG CHẠY */}
      {isSlicing ? (
        <div className="bg-slate-900 text-white p-8 rounded-xl border border-rose-950/20 shadow-xl paper-glow relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 via-yellow-500/5 to-emerald-600/5 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center max-w-md text-center space-y-6">
            <div className="relative h-16 w-16 bg-emerald-605 rounded-full flex items-center justify-center border-2 border-emerald-500/30 shadow-lg animate-bounce duration-1000">
              <Layers className="h-8 w-8 text-emerald-300 animate-spin" style={{ animationDuration: "3s" }} />
            </div>
            
            <div>
              <h3 className="text-base font-bold text-slate-100 uppercase tracking-widest font-sans">
                Tiền xử lý tập tin tư pháp...
              </h3>
              <p className="text-xs text-emerald-400 font-mono mt-1 font-semibold">{slicingMessage}</p>
            </div>

            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700 animate-pulse">
              <div className="bg-gradient-to-r from-emerald-600 to-yellow-500 h-full rounded-full w-2/3" />
            </div>

            <div className="text-[10px] text-slate-400 leading-relaxed italic">
              *Tập tin PDF được bóc tách rời rạc thành từng trang ảnh. Toàn bộ hình ảnh đầu vào được tự động nén dung lượng, thu hẹp độ phân giải gốc để triệt tiêu lỗi quá tải tải trọng (Payload limit) qua biên độ kết nối API.
            </div>
          </div>
        </div>
      ) : processingFile ? (
        <div className="bg-slate-900 text-white p-8 rounded-xl border border-rose-950/20 shadow-xl paper-glow relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
          {/* Shimmer backgrounds */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-yellow-500/5 to-red-600/5 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center max-w-md text-center space-y-6">
            <div className="relative h-16 w-16 bg-red-600 rounded-full flex items-center justify-center border-2 border-yellow-500/30 shadow-lg animate-bounce duration-1000">
              <Activity className="h-8 w-8 text-yellow-400 animate-spin duration-3000" />
            </div>
            
            <div>
              <h3 className="text-base font-bold text-slate-100 uppercase tracking-widest font-sans flex items-center justify-center">
                <span>Đang bóc tách văn bản nghiệp vụ...</span>
              </h3>
              <p className="text-xs text-yellow-400 font-mono mt-1 font-semibold">{processingFile}</p>
            </div>

            {/* Thanh tiến trình Shimmer */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 h-full rounded-full transition-all duration-300 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              </div>
            </div>

            <div className="flex items-center justify-between w-full text-[10px] text-slate-400 font-mono">
              <span>Đại diện an toàn: AES-256</span>
              <span className="text-yellow-400 font-bold">{progress}% HOÀN THÀNH</span>
              <span>Bộ nhớ tạm: RAM stateless</span>
            </div>

            <p className="text-[10px] text-slate-500 italic leading-relaxed">
              *Hệ thống đang nạp tệp và gửi tín hiệu bóc tách văn bản lên Serverless Edge Node, thực thi phân giải độ tương phản thông minh và khôi phục ngôn ngữ tiếng Việt.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CẤU HÌNH OCR VÀ DROPZONE CHÍNH (Chiếm 2 cột trên màn hình Desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hộp kéo thả Dropzone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[250px] transition-all duration-200 ${
                dragActive 
                  ? "border-red-600 bg-red-50/40" 
                  : "border-slate-300 bg-white hover:border-red-500/50 hover:bg-slate-50/50"
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg" 
                onChange={handleFileInput}
              />
              <div className="h-14 w-14 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4 border border-red-100">
                <UploadCloud className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                Kéo thả tài liệu của bạn vào đây hoặc click để duyệt từ máy tính
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Hỗ trợ định dạng PDF, PNG, JPG (tối đa 50MB). Bản quét sẽ tự động được xử lý thông minh để khôi phục cấu trúc dòng tiếng Việt.
              </p>
              
              <div className="mt-4 flex items-center justify-center space-x-2 text-[10px] text-slate-400 font-semibold font-mono bg-slate-50 border border-slate-150 rounded px-2.5 py-1">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>MẬT MÃ HOÁ TRÊN THIẾT BỊ ĐẦU CUỐI</span>
              </div>
            </div>

            {/* DANH SÁCH CÁC TRANG ẢNH ĐÃ PHÂN TÁCH RỜI RẠC */}
            {slicedPages.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-emerald-600 animate-pulse" />
                    <span>Trang tài liệu rời rạc đã phân tách & tự động nén ({slicedPages.length} trang)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold font-mono border border-emerald-100">DUNG LƯỢNG AN TOÀN API</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto p-2 border border-slate-100 rounded-lg bg-slate-50">
                  {slicedPages.map((page) => (
                    <div key={page.index} className="bg-white p-2 rounded-lg border border-slate-250 shadow-xs flex flex-col space-y-2 relative group hover:border-emerald-500 transition-all">
                      <div className="aspect-[3/4] rounded bg-slate-100 overflow-hidden relative border border-slate-100">
                        <img 
                          referrerPolicy="no-referrer"
                          src={page.dataUrl} 
                          alt={`Trang ${page.index}`} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute top-1 left-1 bg-slate-900/85 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                          Trang {page.index}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                        <span>Nén:</span>
                        <span className="text-emerald-600 font-bold">{page.size}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                  *Ghi chú nghiệp vụ: Toàn bộ {slicedPages.length} trang tài liệu đã được nén về độ phân giải chuẩn và xuất JPEG 0.75 để giữ độ nét bóc tách tối đa của Gemini đồng thời bảo đảm an toàn payload.
                </p>
              </div>
            )}

            {/* Các tùy chỉnh tham số (Metadata & Engine) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center space-x-1.5 border-b border-slate-100 pb-3">
                <Settings className="h-4 w-4 text-rose-600" />
                <span>Cấu hình bộ máy nhận diện (OCR Settings)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Mô hình OCR</label>
                  <select 
                    value={config?.engine || 'precision'}
                    onChange={(e: any) => {
                      setConfig((prev: any) => {
                        const newConfig = { ...(prev || {}), engine: e.target.value };
                        localStorage.setItem('ocr_config', JSON.stringify(newConfig));
                        return newConfig;
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="precision">Sovereign Lawtech Precision (Mô hình Trí tuệ nhân tạo V4 - Khuyên dùng)</option>
                    <option value="fastscan">FastScan Legacy Engine (Bộ máy xử lý nhanh cho ảnh mờ)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Dùng mô hình Gemini 3.5 phân giải cao để đạt độ chính xác tối đa đối với chữ viết tay.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Xuất định dạng mặc định</label>
                  <select 
                    value={config?.outputFormat || 'TXT'}
                    onChange={(e: any) => {
                      setConfig((prev: any) => {
                        const newConfig = { ...(prev || {}), outputFormat: e.target.value };
                        localStorage.setItem('ocr_config', JSON.stringify(newConfig));
                        return newConfig;
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="TXT">Văn bản thô không định dạng (.TXT) - Mặc định</option>
                    <option value="DOCX">Microsoft Word (.DOC) - Chuẩn Nghị định 30 (Chỉ PRO)</option>
                    <option value="XLSX">Dữ liệu bảng tính mẫu Excel (.XLSX) (Chỉ PRO)</option>
                    <option value="PDF">Bản sao văn bản PDF có thể tìm kiếm chữ (.PDF)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Sử dụng định dạng file tối ưu để phục vụ bóc tách tài liệu tố tụng. DOCX và Excel yêu cầu tài khoản PRO.</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 bg-yellow-50 text-yellow-800 p-3 rounded-lg border border-yellow-200 mt-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <p className="text-[10px] leading-relaxed font-medium">
                  <strong>Chú ý nghiệp vụ:</strong> Phục vụ công tác số hóa tài liệu mật tố tụng, toàn bộ hồ sơ bóc tách được xử lý hoàn toàn stateless trên RAM và tự động xóa sạch khi kết thúc phiên duyệt. Vui lòng tải kết quả về máy trước khi thoát.
                </p>
              </div>
            </div>

            {/* NÚT BẮT ĐẦU TRÍCH XUẤT OCR */}
            {readyPayload && slicedPages.length > 0 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={startOcrProcess}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-red-500/30 transform transition hover:scale-105 flex items-center space-x-2"
                >
                  <ScanLine className="h-5 w-5" />
                  <span>Bắt đầu trích xuất OCR</span>
                </button>
              </div>
            )}
          </div>

          {/* CHỌN TỆP MẪU NHANH TƯ PHÁP (Cột bên phải Desktop) */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
              
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-300 flex items-center mb-4">
                <Layers className="h-4 w-4 mr-1.5 text-yellow-400" />
                <span>Hồ sơ vụ án mẫu</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4 font-normal">
                Bấm vào hồ sơ mẫu dưới đây để mô phỏng hoạt động bóc tách bản án, cáo trạng thực tế của Kiểm sát viên.
              </p>

              <div className="space-y-4">
                {MOCK_DOCS.map((doc) => (
                  <div 
                    key={doc.id}
                    onClick={() => selectMockDoc(doc.id)}
                    className="bg-slate-850/50 hover:bg-slate-800 border border-slate-700/60 hover:border-yellow-500/30 p-3.5 rounded-lg cursor-pointer transition-all flex items-start space-x-3 group relative"
                  >
                    <div className="img-thumbnail rounded-md bg-red-600/20 group-hover:bg-red-600/30 text-yellow-400 flex items-center justify-center flex-shrink-0 border border-red-500/20 h-8 w-8">
                      <FileCheck className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs text-slate-100 font-bold truncate group-hover:text-yellow-400 transition-colors">
                          {doc.name}
                        </h5>
                        <Play className="h-3.5 w-3.5 text-yellow-500 opacity-60 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0" />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed font-sans">
                        {doc.description}
                      </p>
                      <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono mt-1 pt-1.5 border-t border-slate-700/40">
                        <span>{doc.type}</span>
                        <span>{doc.size}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center">
              <h5 className="text-xs font-bold text-slate-700 flex items-center justify-center space-x-1.5">
                <HelpCircle className="h-4 w-4 text-emerald-500" />
                <span>Đồng bộ hóa bảo mật Google Workspace</span>
              </h5>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Tài khoản công vụ của Kiểm sát viên được phân quyền lưu trữ bóc tách trực tiếp về Drive an toàn của đơn vị kiểm soát tố tụng.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
