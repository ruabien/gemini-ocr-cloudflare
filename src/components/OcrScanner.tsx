/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { UploadCloud, Settings, Shield, AlertTriangle, Layers, Activity, ScanLine, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { OcrConfig } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { getUserStorageItem, setUserStorageItem } from "../utils/userStorage";
// @ts-ignore
import { loadPdfJs, splitPdfToImages } from "../utils/pdfProcessor";
import { optimizeImageForOcr } from "../utils/imageOptimizer";

interface OcrScannerProps {
  onFileLoaded: (fileData: { name: string; content: string; mimeType: string; selectedFile?: File | File[]; outputMode?: "text" | "structured" }) => void;
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
  pageStates?: Record<number, {
    status: 'idle' | 'processing' | 'success' | 'error';
    text?: string;
    error?: string;
  }>;
  pageFilesArray?: File[];
  optimizedInfo?: {
    originalSize: number;
    optimizedSize: number;
    wasOptimized: boolean;
  };
  pageSizes?: Record<number, {
    originalSize: number;
    optimizedSize: number;
    wasOptimized: boolean;
  }>;
}

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
};

export default function OcrScanner({ onFileLoaded, config, setConfig }: OcrScannerProps) {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [autoMerge, setAutoMerge] = useState(false);
  const [outputMode, setOutputMode] = useState<"text" | "structured">("text");
  
  const [isSlicing, setIsSlicing] = useState(false);
  const [slicingMessage, setSlicingMessage] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState("");
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [editorContent, setEditorContent] = useState("");
  const editorContentRef = useRef("");

  const [useImageOptimization, setUseImageOptimization] = useState(true);
  const [imageOptimizationLevel, setImageOptimizationLevel] = useState<"balanced" | "fast">("balanced");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ---------- Freemium limits & UI ----------
  const [pagesUsedToday, setPagesUsedToday] = useState(0);
  const [limitModal, setLimitModal] = useState<null | {
    type: "batch" | "daily";
    maxAllowed: number;
    requested: number;
    onAccept: () => void;
    onReject: () => void;
  }>(null);
  const [softBanner, setSoftBanner] = useState<string | null>(null);

  const [fileErrors, setFileErrors] = useState<Record<number, string>>({});
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
  const [pageErrorDetail, setPageErrorDetail] = useState<{ pageNum: number; error: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const pageProcessingLockRef = useRef<{ [key: number]: boolean }>({});
  const revocationRefs = useRef<Map<string, string>>(new Map());

  React.useEffect(() => {
    return () => {
      revocationRefs.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      });
      revocationRefs.current.clear();
    };
  }, []);

  // Range State
  const [fromPage, setFromPage] = useState<string>("");
  const [toPage, setToPage] = useState<string>("");

  // NOTE: There are no useEffect blocks in this component that monitor or trigger OCR processes,
  // error handling, or state resets, thereby eliminating any dependency-array-based feedback loops.

const handleSelectedFiles = async (files: File[]) => {
  // Validation: allow bulk image uploads, but restrict to a single PDF at a time
  const pdfFilesInSelection = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
  const existingPdfCount = (queuedFiles || []).filter(q => q.file.name.toLowerCase().endsWith('.pdf')).length;
  const totalPdfCount = existingPdfCount + pdfFilesInSelection.length;
  if (pdfFilesInSelection.length > 0 && totalPdfCount > 1) {
    alert("Hệ thống chỉ hỗ trợ xử lý mỗi lần 1 tệp PDF. Vui lòng tải lên từng tệp một để đảm bảo hiệu năng.");
    return;
  }

  const newQueued: QueuedFile[] = files.map(f => {
    const isPdf = f.name.toLowerCase().endsWith('.pdf');
    const id = Math.random().toString(36).substring(2, 11);
    if (!isPdf) {
      const previewUrl = URL.createObjectURL(f);
      revocationRefs.current.set(`${id}-1`, previewUrl);
      return {
        id,
        file: f,
        status: 'waiting',
        size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
        slicedPages: [{
          index: 1,
          dataUrl: previewUrl,
          size: `${(f.size / 1024).toFixed(0)} KB`
        }],
        pagesBase64Array: [],
        totalPages: 1,
        pageStates: { 1: { status: 'idle' as const } },
        pageFilesArray: [f],
        pageSizes: {
          1: {
            originalSize: f.size,
            optimizedSize: f.size,
            wasOptimized: false
          }
        }
      };
    } else {
      return {
        id,
        file: f,
        status: 'waiting',
        size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
        slicedPages: [],
        pagesBase64Array: []
      };
    }
  });
  
  setQueuedFiles(prev => [...prev, ...newQueued]);

  for (const qFile of newQueued) {
    if (qFile.file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pageFiles = await splitPdfToImages(qFile.file, () => {});
        const numPages = pageFiles.length;
        const initialPageSizes: Record<number, any> = {};
        const sliced = pageFiles.map((pFile, idx) => {
          const url = URL.createObjectURL(pFile);
          revocationRefs.current.set(`${qFile.id}-${idx + 1}`, url);
          initialPageSizes[idx + 1] = {
            originalSize: pFile.size,
            optimizedSize: pFile.size,
            wasOptimized: false
          };
          return {
            index: idx + 1,
            dataUrl: url,
            size: `${(pFile.size / 1024).toFixed(0)} KB`
          };
        });
        // Initialize page states as idle for each page immediately after loading PDF
        const initialPageStates: Record<number, any> = {};
        for (let p = 1; p <= numPages; p++) {
          initialPageStates[p] = { status: 'idle' };
        }
        setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? {
          ...f,
          message: `PDF: ${numPages} trang`,
          totalPages: numPages,
          pageStates: initialPageStates,
          slicedPages: sliced,
          pageFilesArray: pageFiles,
          pageSizes: initialPageSizes
        } : f));
      } catch (err) {
        console.error("Lỗi phân tách PDF khi tải tệp:", err);
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

  const deleteQueuedFile = (id: string, fileName: string) => {
    if (isBatchProcessing) {
      alert("Không thể xóa khi đang OCR");
      return;
    }
    
    // Revoke URLs associated with this file ID
    revocationRefs.current.forEach((url, key) => {
      if (key.startsWith(`${id}-`)) {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error("Error revoking URL:", e);
        }
        revocationRefs.current.delete(key);
      }
    });

    setQueuedFiles(prev => prev.filter(f => f.id !== id));
  };

  const resetAll = () => {
    if (isBatchProcessing) {
      alert("Không thể xóa khi đang OCR");
      return;
    }
    
    if (queuedFiles.length === 0) return;
    
    const confirmReset = window.confirm("Bạn có chắc chắn muốn xóa tất cả danh sách và làm lại từ đầu?");
    if (!confirmReset) return;

    // Revoke all object URLs
    revocationRefs.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore
      }
    });
    revocationRefs.current.clear();

    // Reset states
    setQueuedFiles([]);
    setEditorContent("");
    editorContentRef.current = "";
    setProgress(0);
    setFileErrors({});
    setBatchProgressText("");
    setProcessingFile(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

const startOcrProcess = async () => {
  // LOCK THE RUNTIME PROCESSING FUNCTION WITH A DEFENSIVE LOADING GUARD
  if (isProcessingRef.current || isBatchProcessing || isSlicing) return;

  // ---- Pre‑flight usage checks for FREE users ----
  let isPro = false;
  let currentUsage = 0;
  if (user?.uid) {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const checkRes = await fetch("/api/usage/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : "",
        },
      });
      if (checkRes.ok) {
        const data = await checkRes.json();
        isPro = data.isPro;
        currentUsage = data.pagesUsedToday;
        setPagesUsedToday(currentUsage);
        const remaining = data.remainingPages;
        if (!isPro && remaining <= 10) {
          setSoftBanner(
            `Hôm nay bạn đã sử dụng ${currentUsage} / 50 trang miễn phí. Bạn còn ${remaining} trang. Nâng cấp LexOCR PRO để xử lý không giới hạn.`
          );
        } else {
          setSoftBanner(null);
        }
      }
    } catch (e) {
      console.error("Failed to check usage:", e);
    }
  }

  // Count requested pages
  const filesToProcess = (queuedFiles || []).filter(q => q && q.status !== 'done');
  if (!filesToProcess || filesToProcess.length === 0) {
    return;
  }

  if (!isPro) {
    let totalRequestedPages = 0;
    for (const q of filesToProcess) {
      if (q.totalPages) {
        // PDF – respect range
        const start = fromPage ? parseInt(fromPage, 10) : 1;
        const end = toPage ? parseInt(toPage, 10) : q.totalPages;
        totalRequestedPages += Math.min(end, q.totalPages) - Math.max(start, 1) + 1;
      } else {
        totalRequestedPages += 1;
      }
    }

    // 1. Check daily limit first
    if (currentUsage >= 50) {
      setLimitModal({
        type: "daily",
        maxAllowed: 0,
        requested: totalRequestedPages,
        onAccept: () => setLimitModal(null),
        onReject: () => setLimitModal(null),
      });
      return;
    }

    if (currentUsage + totalRequestedPages > 50) {
      const remainingPages = 50 - currentUsage;
      setLimitModal({
        type: "daily",
        maxAllowed: remainingPages,
        requested: totalRequestedPages,
        onAccept: () => setLimitModal(null), // Just close, user must reduce range manually
        onReject: () => setLimitModal(null),
      });
      return;
    }

    // 2. Check per-run limit of 20 pages
    if (totalRequestedPages > 20) {
      setLimitModal({
        type: "batch",
        maxAllowed: 20,
        requested: totalRequestedPages,
        onAccept: async () => {
          // "Tiếp tục với 20 trang đầu": set range 1-20
          setLimitModal(null);
          setFromPage("1");
          setToPage("20");
          // Re-trigger start with the updated state in next cycle
          setTimeout(() => {
            const btn = document.querySelector(".start-ocr-btn-selector");
            if (btn) (btn as HTMLElement).click();
          }, 100);
        },
        onReject: () => {
          setLimitModal(null);
        },
      });
      return;
    }
  }

  isProcessingRef.current = true;

  try {

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

/* Build a deduplicated, trimmed pool of Gemini API keys */
const rawKeys = getUserStorageItem(user?.uid, 'gemini_keys') || '';
let parsedKeyStrings: string[] = [];
try {
  const parsed = JSON.parse(rawKeys);
  if (Array.isArray(parsed)) {
    parsedKeyStrings = parsed.map(k => String(k));
  } else {
    parsedKeyStrings = rawKeys.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
  }
} catch {
  parsedKeyStrings = rawKeys.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
}
/* Legacy single‑key fallback */
if (parsedKeyStrings.length === 0) {
  const fallback = localStorage.getItem("apiKey") || localStorage.getItem("gemini_api_key");
  if (fallback) parsedKeyStrings = [fallback.trim()];
}
/* Final pool – remove empty, null, undefined and duplicates */
const geminiKeyPool = Array.from(
  new Set(
    parsedKeyStrings
      .map(k => k?.trim())
      .filter(Boolean)
  )
);
if (geminiKeyPool.length === 0) {
  alert('Missing Gemini API Key. Please configure it in Settings.');
  setIsBatchProcessing(false);
  isProcessingRef.current = false;
  return;
}
let activeKeyIndex = 0;

    const model = (config as any)?.model || localStorage.getItem('ocr_model') || 'gemini-1.5-flash';

    const sendFileToBackend = async (file: File, pageNumParam: number = 1): Promise<string> => {
      const pageNum = pageNumParam; // or dynamic page index variable
if (pageProcessingLockRef.current[pageNum]) {
    // Development info removed for production
    return "";
}
      pageProcessingLockRef.current[pageNum] = true;

// @ts-ignore
if (import.meta.env.DEV) console.info(`--- EXECUTING SINGLE OCR RUN FOR ${file.type?.startsWith("image/") ? `Image_1_${file.name || "unknown"}` : `Page_${pageNum}` } ---`);
      try {
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

      const runOcrSpaceFallback = (): Promise<string> => {
        return new Promise<string>((resolveFallback, rejectFallback) => {
          // Update progress text with the fallback status
          setBatchProgressText(`Gemini quá tải, chuyển sang OCR dự phòng - Trang ${pageNum}...`);
          
          // 1. Fetch backend keys from the lightweight secure token gateway
          fetch("/api/ocr")
            .then(res => {
              if (!res.ok) {
                throw new Error("Failed to retrieve OCR.space credentials from API gateway");
              }
              return res.json();
            })
            .then((data: any) => {
              // Ensure it correctly logs and checks data.primary and data.backup
              
              const fetchedKeys = data || {};
              const cleanKey = (key: any) => {
                if (!key) return "";
                const s = String(key).trim();
                if (s === "undefined" || s === "null" || s === "") return "";
                return s;
              };

              const primaryKey = cleanKey((data?.primary && data.primary !== "true" && data.primary !== true) ? data.primary : (localStorage.getItem("ocr_space_api_key") || ""));
              const secondaryKey = cleanKey((data?.backup && data.backup !== "true" && data.backup !== true) ? data.backup : (localStorage.getItem("ocr_space_api_key_1") || ""));
              const ocrKeys: string[] = [];
              if (primaryKey) ocrKeys.push(primaryKey);
              if (secondaryKey) ocrKeys.push(secondaryKey);
              
              // Remove any premature blocking check that throws a string alert
              if (ocrKeys.length === 0) {
// Development info removed for production
                ocrKeys.push("helloworld"); // fallback to public test key instead of breaking
              }
              
              // 2. Compress/downscale using canvas to ensure efficient base64 ingestion on the frontend client
              const img = new Image();
              img.onload = () => {
                URL.revokeObjectURL(img.src);
                let width = img.width;
                let height = img.height;
                const maxDimension = 1200;
                
                if (width > maxDimension || height > maxDimension) {
                  if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                  } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                  }
                }
                
                const downscaledCanvas = document.createElement("canvas");
                downscaledCanvas.width = width;
                downscaledCanvas.height = height;
                
                const ctx = downscaledCanvas.getContext("2d");
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                }
                
                // 3. Use standard canvas.toBlob to avoid corrupted manual Base64 manipulation
                downscaledCanvas.toBlob((blob) => {
                  if (!blob) {
                    console.error("Canvas toBlob failed - asset is empty!");
                    rejectFallback(new Error("Canvas toBlob failed - asset is empty!"));
                    return;
                  }

                  const diagnosticFormData = new FormData();
diagnosticFormData.append('apikey', 'helloworld'); // Explicitly bypass our restricted environment tokens
diagnosticFormData.append('language', 'auto');
diagnosticFormData.append('isOverlayRequired', 'false');
diagnosticFormData.append('OcrEngine', '2');
diagnosticFormData.append('file', blob, 'page6.jpg'); // Valid native browser-generated binary asset
// Log request params before OCR.space fallback
                  
                  fetch("https://api.ocr.space/parse/image", {
                    method: "POST",
                    body: diagnosticFormData
                  })
                  .then(async res => {
                    const txt = await res.text();
                    if (!res.ok) {
                      // Show raw error text in UI for debugging
                      setEditorContent((prev) => prev + (prev ? "\n\n" : "") + `OCR.space Error ${res.status}: ${txt}`);
                      editorContentRef.current += (editorContentRef.current ? "\n\n" : "") + `OCR.space Error ${res.status}: ${txt}`;
                      rejectFallback(new Error(`OCR.space HTTP error ${res.status}`));
                      return;
                    }
                    // Parse JSON safely
                    let data;
                    try {
                      data = JSON.parse(txt);
                    } catch {
                      // If not JSON, just return raw text
                      const finalText = txt.trim();
                      setEditorContent((prev) => prev + (prev ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + finalText);
                      editorContentRef.current += (editorContentRef.current ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + finalText;
                      resolveFallback(finalText);
                      return;
                    }
                    // Handle potential error fields
                    if (data.IsErroredOnProcessing || data.OCRExitCode > 1) {
                      const errMsgs = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : (data.ErrorMessage || '');
                      const errorInfo = errMsgs || "OCR.space processing error";
                      setEditorContent((prev) => prev + (prev ? "\n\n" : "") + `OCR.space Processing Error: ${errorInfo}`);
                      editorContentRef.current += (editorContentRef.current ? "\n\n" : "") + `OCR.space Processing Error: ${errorInfo}`;
                      rejectFallback(new Error(errorInfo));
                      return;
                    }
                    // Extract text
                    let extractedText = "";
                    if (data.ParsedResults?.[0]?.ParsedText) {
                      extractedText = data.ParsedResults[0].ParsedText;
                    } else if (data.text) {
                      extractedText = data.text;
                    } else {
                      const msg = "Không nhận dạng được văn bản nào từ phản hồi của OCR.space.";
                      setEditorContent((prev) => prev + (prev ? "\n\n" : "") + msg);
                      editorContentRef.current += (editorContentRef.current ? "\n\n" : "") + msg;
                      rejectFallback(new Error(msg));
                      return;
                    }
                    const finalText = extractedText.trim();
                    setEditorContent((prev) => prev + (prev ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + finalText);
                    editorContentRef.current += (editorContentRef.current ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + finalText;
                    resolveFallback(finalText);
                  })
                  .catch(err => {
                    // Network or unexpected error
                    const errorMsg = err?.message || "Unknown fetch error";
                    setEditorContent((prev) => prev + (prev ? "\n\n" : "") + `Fetch error: ${errorMsg}`);
                    editorContentRef.current += (editorContentRef.current ? "\n\n" : "") + `Fetch error: ${errorMsg}`;
                    rejectFallback(err);
                  });
                }, 'image/jpeg', 0.85);
              };
              img.onerror = () => {
                rejectFallback(new Error("Không thể tải ảnh cấu hình canvas để nén cho OCR.space."));
              };
              img.src = URL.createObjectURL(file);
            })
            .catch(err => {
              rejectFallback(err);
            });
        });
      };

      // Helper to perform a Gemini request with a specific key
      const makeRequest = (activeKey: string, isRetry: boolean = false): Promise<string> => {
        return new Promise<string>((resolve, reject) => {
// @ts-ignore
if (import.meta.env.DEV) console.info(`[OCR ${file.type?.startsWith("image/") ? `Image_1_${file.name || "unknown"}` : `Page_${pageNum}`} START] ${Date.now()}`);
          setBatchProgressText(`Đang thử Gemini key ${activeKeyIndex + 1}/${geminiKeyPool.length} - Trang ${pageNum}...`);
          const xhr = new XMLHttpRequest();
const selectedModel = getUserStorageItem(user?.uid, 'ocr_model') || "gemini-2.5-flash";
          let finalCleanKey = activeKey.replace(/[\[\]"']/g, '').trim();
          const googleUrl = `https://generativelanguage.googleapis.com/v1/models/${selectedModel}:generateContent?key=${finalCleanKey}`;
          xhr.open("POST", googleUrl, true);
          xhr.setRequestHeader("Content-Type", "application/json");
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setProgress(percentComplete);
            }
          };
          
          xhr.onload = () => {
            let shouldFallback = false;
            const isTransientError = xhr.status === 500 || xhr.status === 502 || xhr.status === 503 || xhr.status === 504;
            
if (xhr.status === 429) {
  // Gemini quota exceeded – move to next key
  // @ts-ignore
  if (import.meta.env.DEV) console.info(`Gemini key ${activeKeyIndex + 1}/${geminiKeyPool.length} received 429, switching key`);
  setBatchProgressText(`Gemini key ${activeKeyIndex + 1} quá tải, thử key ${activeKeyIndex + 2}/${geminiKeyPool.length} - Trang ${pageNum}...`);
  reject({ status: 429 });
  return;
} else if (xhr.status === 401 || xhr.status === 403) {
  // Auth error – skip this key
  // @ts-ignore
  if (import.meta.env.DEV) console.info(`Gemini key ${activeKeyIndex + 1}/${geminiKeyPool.length} received ${xhr.status}, skipping`);
  setBatchProgressText(`Gemini key ${activeKeyIndex + 1} không hợp lệ (${xhr.status}), thử key ${activeKeyIndex + 2}/${geminiKeyPool.length} - Trang ${pageNum}...`);
  reject({ status: xhr.status });
  return;
} else if (isTransientError) {
              if (!isRetry) {
                console.warn(`[OCR WARN] Transient error HTTP ${xhr.status} at page ${pageNum}. Retrying once in 2.5s...`);
                setBatchProgressText(`Gemini gặp lỗi tạm thời (${xhr.status}), đang thử lại - Trang ${pageNum}...`);
                setTimeout(() => {
                  makeRequest(activeKey, true).then(resolve).catch(reject);
                }, 2500);
                return;
              } else {
                shouldFallback = true;
              }
            } else if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const rawText = xhr.responseText;
                const cleanJson = JSON.parse(rawText);
                
                const finishReason = cleanJson.candidates?.[0]?.finishReason;
                const geminiText = cleanJson.candidates?.[0]?.content?.parts?.[0]?.text;
                const actualText = geminiText || cleanJson.text || "";
                
                let lines = actualText.split('\n');
                if (lines.length > 0) {
                  const firstLine = lines[0].trim();
                  const isAiIntro = /^(Dưới đây là|Văn bản đã được|Kết quả|Đây là văn bản)/i.test(firstLine) && firstLine.endsWith(':');
                  if (isAiIntro) {
                    lines.shift();
                  }
                }
                const sanitizedText = lines.join('\n').trim();
                
                if (finishReason === "RECITATION" || !sanitizedText) {
                  shouldFallback = true;
                } else {
// @ts-ignore
if (import.meta.env.DEV) console.info(`[OCR ${file.type?.startsWith("image/") ? `Image_1_${file.name || "unknown"}` : `Page_${pageNum}`} END] ${Date.now()}`);
                  setEditorContent((prev) => prev + (prev ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedText);
                  editorContentRef.current += (editorContentRef.current ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedText;
                  resolve(sanitizedText);
                  return;
                }
              } catch (e) {
                shouldFallback = true;
              }
            } else {
              shouldFallback = true;
            }

            if (shouldFallback) {
              runOcrSpaceFallback().then(resolve).catch(reject);
            }
          };
          
          xhr.onerror = () => {
            if (!isRetry) {
              console.warn(`[OCR WARN] Network error at page ${pageNum}. Retrying once in 2.5s...`);
              setBatchProgressText(`Lỗi kết nối mạng, đang thử lại - Trang ${pageNum}...`);
              setTimeout(() => {
                makeRequest(activeKey, true).then(resolve).catch(reject);
              }, 2500);
            } else {
              runOcrSpaceFallback().then(resolve).catch(reject);
            }
          };
          
          const payload = {
            "contents": [{
              "parts": [
                {"text": "Trích xuất chính xác 100% toàn bộ nội dung văn bản có trong hình ảnh này sang tiếng Việt. Giữ nguyên định dạng, không thêm bớt bất kỳ từ ngữ hay lời giải thích nào."},
                {"inlineData": {
                  "mimeType": fileType.startsWith("image/") ? fileType : "image/jpeg",
                  "data": base64Data
                }}
              ]
            }],
            "generationConfig": {
              "temperature": 0.0,
              "topP": 0.95,
              "candidateCount": 1
            },
            "safetySettings": [
              {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
              },
              {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE"
              },
              {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"
              },
              {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"
              }
            ]
          };
          
          xhr.send(JSON.stringify(payload));
        });
      };

/* Try each Gemini key in order – only fall back to OCR.space when all keys are exhausted */
while (true) {
  const currentKey = geminiKeyPool[activeKeyIndex];
  if (!currentKey) {
    // No more keys – use OCR.space fallback
    // @ts-ignore
    if (import.meta.env.DEV) console.info('All Gemini keys exhausted, falling back to OCR.space');
    setBatchProgressText(`Tất cả Gemini key quá tải, chuyển sang OCR dự phòng - Trang ${pageNum}...`);
    return await runOcrSpaceFallback();
  }
  try {
    const text = await makeRequest(currentKey);
    return text; // successful response
  } catch (e: any) {
    // If the request was rejected because of quota (429) or auth error (401/403),
    // move to the next key and try again.
    if (e?.status === 429 || e?.status === 401 || e?.status === 403) {
      activeKeyIndex++;
      continue; // try next key
    }
    // Other errors (network, server) are handled inside makeRequest
    // and will either retry once or fall back as appropriate.
    throw e;
  }
}
      } finally {
        pageProcessingLockRef.current[pageNum] = false;
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

      // Helper to update a specific page's status in the grid
      const updatePageStatus = (fileId: string, pageNum: number, status: 'idle' | 'processing' | 'success' | 'error', text?: string, error?: string) => {
        setQueuedFiles(prev => prev.map(f => {
          if (f.id === fileId) {
            const newPageStates = { ...(f.pageStates || {}) };
            newPageStates[pageNum] = { status, text, error };
            return { ...f, pageStates: newPageStates };
          }
          return f;
        }));
      };

      // Helper to send a single image/file and handle errors per page
      const processSinglePage = async (pageFile: File, pageIdx: number, totalPages: number) => {
        updatePageStatus(qFile.id, pageIdx, 'processing');
        try {
          let fileToSend = pageFile;
          if (!isPdf) {
            if (useImageOptimization) {
              const optResult = await optimizeImageForOcr(pageFile, {
                maxDimension: imageOptimizationLevel === "fast" ? 1600 : 2200,
                jpegQuality: imageOptimizationLevel === "fast" ? 0.8 : 0.85,
              });
              fileToSend = optResult.wasOptimized ? optResult.optimizedFile : pageFile;
              // Save optimization info on the queued file
              setQueuedFiles(prev => prev.map(f => 
                f.id === qFile.id ? {
                  ...f,
                  optimizedInfo: {
                    originalSize: optResult.originalSize,
                    optimizedSize: optResult.optimizedSize,
                    wasOptimized: optResult.wasOptimized
                  },
                  pageSizes: {
                    ...(f.pageSizes || {}),
                    [pageIdx]: {
                      originalSize: optResult.originalSize,
                      optimizedSize: optResult.optimizedSize,
                      wasOptimized: optResult.wasOptimized
                    }
                  }
                } : f
              ));
            } else {
              fileToSend = pageFile;
              setQueuedFiles(prev => prev.map(f => 
                f.id === qFile.id ? {
                  ...f,
                  optimizedInfo: {
                    originalSize: pageFile.size,
                    optimizedSize: pageFile.size,
                    wasOptimized: false
                  },
                  pageSizes: {
                    ...(f.pageSizes || {}),
                    [pageIdx]: {
                      originalSize: pageFile.size,
                      optimizedSize: pageFile.size,
                      wasOptimized: false
                    }
                  }
                } : f
              ));
            }
          }
          const extractedText = await sendFileToBackend(fileToSend, pageIdx);
          updatePageStatus(qFile.id, pageIdx, 'success', extractedText);
        } catch (err: any) {
          const errorMsgObj = typeof err === 'object' && err?.message ? err.message : String(err);
          updatePageStatus(qFile.id, pageIdx, 'error', undefined, errorMsgObj);
          const errorMsg = `[Lỗi bóc tách Trang ${pageIdx}]: ${errorMsgObj}`;
          setEditorContent((prev) => prev + (prev ? "\n\n" + errorMsg : errorMsg));
          editorContentRef.current += (editorContentRef.current ? "\n\n" + errorMsg : errorMsg);
        } finally {
          // Free resource from memory
          const key = `${qFile.id}-${pageIdx}`;
          const url = revocationRefs.current.get(key);
          if (url) {
            try {
              URL.revokeObjectURL(url);
            } catch (e) {
              // ignore
            }
            revocationRefs.current.delete(key);
          }
        }
      };

      if (isPdf) {
        // Split PDF into images (all pages) if not already split
        let pageFiles: File[] = qFile.pageFilesArray || [];
        if (pageFiles.length === 0) {
          try {
            pageFiles = await splitPdfToImages(file, () => {});
            const initialPageSizes: Record<number, any> = {};
            const sliced = pageFiles.map((pFile, idx) => {
              const url = URL.createObjectURL(pFile);
              revocationRefs.current.set(`${qFile.id}-${idx + 1}`, url);
              initialPageSizes[idx + 1] = {
                originalSize: pFile.size,
                optimizedSize: pFile.size,
                wasOptimized: false
              };
              return {
                index: idx + 1,
                dataUrl: url,
                size: `${(pFile.size / 1024).toFixed(0)} KB`
              };
            });
            const initialPageStates: Record<number, any> = {};
            for(let p = 1; p <= pageFiles.length; p++) {
              initialPageStates[p] = { status: 'idle' };
            }
            setQueuedFiles(prev => prev.map(f => f.id === qFile.id ? { 
              ...f, 
              pageStates: initialPageStates, 
              totalPages: pageFiles.length,
              slicedPages: sliced,
              pageFilesArray: pageFiles,
              pageSizes: initialPageSizes
            } : f));
          } catch (err: any) {
            setFileErrors(prev => ({ ...prev, [i]: "[Lỗi bóc tách]: Vui lòng kiểm tra lại chất lượng tệp tin hoặc cấu hình Key của trang này." }));
            updateFileStatus(i, "error");
            continue; // Skip to next file
          }
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

        // Reset target pages to idle state
        setQueuedFiles(prev => prev.map(f => {
          if (f.id === qFile.id) {
            const updatedStates = { ...(f.pageStates || {}) };
            for (let p = startPage; p <= endPage; p++) {
              updatedStates[p] = { status: 'idle' };
            }
            return { ...f, pageStates: updatedStates };
          }
          return f;
        }));

        // Process each page within the selected range
        for (let p = startPage; p <= endPage; p++) {
          const pageFile = pageFiles[p - 1]; // zero‑based index
          setBatchProgressText(`Đang bóc tách ${file.name} - Trang ${p}/${endPage}...`);
          await processSinglePage(pageFile, p, endPage);
          // Throttle between pages
          await new Promise((res) => setTimeout(res, 2500));
        }

        // Mark as completed if no fatal error occurred
        updateFileStatus(i, "completed");
      } else {
        // Non‑PDF file: process normally with a single request
        try {
          await processSinglePage(file, 1, 1);
          // Check if page state indicates error after processing
          setQueuedFiles(prev => {
            const currentFile = prev.find(f => f.id === qFile.id);
            if (currentFile?.pageStates?.[1]?.status === 'error') {
              updateFileStatus(i, "error");
              setFileErrors(errs => ({
                ...errs,
                [i]: "[Lỗi bóc tách]: Vui lòng kiểm tra lại chất lượng tệp tin hoặc cấu hình Key của trang này."
              }));
            } else {
              updateFileStatus(i, "completed");
            }
            return prev;
          });
        } catch (err: any) {
          setFileErrors(prevErrs => ({
            ...prevErrs,
            [i]: "[Lỗi bóc tách]: Vui lòng kiểm tra lại chất lượng tệp tin hoặc cấu hình Key của trang này."
          }));
          updateFileStatus(i, "error");
        }
      }

      // Explicit safety throttle delay of 2500 ms to prevent Gemini Rate Limit
      if (i < filesToProcess.length - 1) {
        await new Promise((res) => setTimeout(res, 2500));
      }
    }

    setTimeout(async () => {
      setIsBatchProcessing(false);
      setProcessingFile(null);
      setProgress(0);
      isProcessingRef.current = false;

      // -------------------------------------------------
      // Record successful page usage (FREE users only)
      // -------------------------------------------------
      if (!isPro && user?.uid) {
        try {
          // Count successful pages from the final queuedFiles state
          let successfulPages = 0;
          queuedFiles.forEach(q => {
            if (q.pageStates) {
              Object.values(q.pageStates).forEach(state => {
                if (state.status === "success") successfulPages += 1;
              });
            } else if (q.status === "done") {
              // Single‑image file counted as one successful page
              successfulPages += 1;
            }
          });

          if (successfulPages > 0) {
            const idToken = await auth.currentUser?.getIdToken();
            const response = await fetch("/api/usage/commit", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": idToken ? `Bearer ${idToken}` : "",
              },
              body: JSON.stringify({ successfulPages }),
            });

            let data;
            try {
              data = await response.json();
            } catch (e) {
              data = null;
            }

            if (!response.ok || !data || !data.success) {
              const code = data?.code || data?.error;
              if (code === "quota_exceeded") {
                 setErrorModalMsg("Kết quả OCR đã hoàn tất, nhưng hạn mức miễn phí hôm nay đã được sử dụng đồng thời ở phiên khác.");
                 setPagesUsedToday(data?.pagesUsed || 50);
                 const remaining = data?.remainingPages || 0;
                 if (remaining <= 0) {
                   setSoftBanner("Bạn đã sử dụng hết hạn mức miễn phí hôm nay. Nâng cấp LexOCR PRO để xử lý không giới hạn.");
                 } else {
                   setSoftBanner(`Hôm nay bạn đã sử dụng ${data?.pagesUsed} / 50 trang miễn phí. Bạn còn ${remaining} trang. Nâng cấp LexOCR PRO để xử lý không giới hạn.`);
                 }
              } else if (code === "transaction_failed" || code === "server_error") {
                 console.error("Usage commit failed safely.", data?.message || "server error");
                 setSoftBanner("Kết quả OCR đã hoàn tất nhưng hệ thống chưa thể cập nhật hạn mức sử dụng. Vui lòng thử lại sau.");
              } else if (response.status === 400) {
                 setErrorModalMsg(data?.message || "Dữ liệu không hợp lệ. Kết quả OCR vẫn được giữ nguyên.");
              } else {
                 setSoftBanner("Kết quả OCR đã hoàn tất nhưng hệ thống chưa thể cập nhật hạn mức sử dụng. Vui lòng thử lại sau.");
              }
            } else {
              // success
              const pagesUsed = data.pagesUsed;
              const remaining = data.remainingPages;
              setPagesUsedToday(pagesUsed);
              if (!data.isPro && remaining <= 10) {
                 setSoftBanner(`Hôm nay bạn đã sử dụng ${pagesUsed} / 50 trang miễn phí. Bạn còn ${remaining} trang. Nâng cấp LexOCR PRO để xử lý không giới hạn.`);
              } else {
                 setSoftBanner(null);
              }
            }
          }
        } catch (e) {
          console.error("Network or parsing error on commit:", e);
          setSoftBanner("Kết quả OCR đã hoàn tất nhưng hệ thống chưa thể cập nhật hạn mức sử dụng. Vui lòng thử lại sau.");
        }
      }

      const finalContent = editorContentRef.current;
      if (finalContent && finalContent.trim() !== "") {
        const outputMime = filesToProcess.length > 0 ? filesToProcess[0]?.file?.type : "application/pdf";
        onFileLoaded({ 
          name: filesToProcess.length > 1 && autoMerge ? "Hồ Sơ Gộp Nhiều Tài Liệu" : (filesToProcess[0]?.file?.name || "Tài Liệu OCR"), 
          content: finalContent, 
          mimeType: outputMime, 
          selectedFile: filesToProcess.map(f => f.file),
          outputMode
        });
      }
    }, 1000);
  } catch (error) {
    console.error("OCR process error:", error);
    setIsBatchProcessing(false);
    setProcessingFile(null);
    setProgress(0);
    isProcessingRef.current = false;
  }
};

  return (
    <div id="ocr-scanner-tab" className="flex flex-col space-y-4 pb-12 bg-slate-50">
      
        {/* SOFT WARNING BANNER */}
        {softBanner && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium text-amber-800">
                {softBanner}
              </span>
            </div>
            <a href="/pricing" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded transition-colors">
              Xem gói PRO
            </a>
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <span>Số hóa & Trích xuất hồ sơ vụ án chuyên sâu</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Tải tài liệu tố tụng định dạng PDF, JPEG, PNG. Hỗ trợ <strong>tải lên hàng loạt nhiều tệp</strong> (Bulk Image OCR) và tự động gộp văn bản xuất chuẩn.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* CẤU HÌNH OCR VÀ DROPZONE CHÍNH (Chiếm 2 cột trên màn hình Desktop) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* DROPZONE */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
              className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer min-h-[145px] transition-all duration-200 ${
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
              <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-2 border border-red-100">
                <UploadCloud className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                Kéo thả nhiều tài liệu vào đây hoặc click để duyệt từ máy tính
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xl">
                Hỗ trợ chọn nhiều tệp tin cùng lúc. Bản quét sẽ được tự động phân lớp, đưa vào hàng đợi và bóc tách nội dung tuần tự.
              </p>
              
              <div className="mt-2.5 flex items-center justify-center space-x-2 text-[10px] text-slate-400 font-semibold font-mono bg-slate-50 border border-slate-150 rounded px-2.5 py-0.5">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>MẬT MÃ HOÁ TRÊN THIẾT BỊ ĐẦU CUỐI</span>
              </div>
            </div>

            {/* NÚT BẮT ĐẦU TRÍCH XUẤT OCR */}
            <div className="flex justify-center w-full">
              <button
                onClick={startOcrProcess}
                disabled={(queuedFiles || []).length === 0 || isBatchProcessing || isSlicing}
                className="start-ocr-btn-selector w-full sm:w-[320px] bg-red-600 hover:bg-red-700 text-white font-extrabold py-4 px-8 rounded-lg shadow-lg shadow-red-500/30 transform transition hover:scale-102 flex items-center justify-center space-x-2.5 text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-600"
              >
                {isBatchProcessing || isSlicing ? (
                  <Activity className="h-6 w-6 animate-spin" />
                ) : (
                  <ScanLine className="h-6 w-6" />
                )}
                <span>
                  {isBatchProcessing 
                    ? "Đang bóc tách hồ sơ..." 
                    : isSlicing 
                      ? "Đang phân tách PDF..." 
                      : "Bắt đầu bóc tách hồ sơ"}
                </span>
              </button>
            </div>

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
                {/* CHỌN MỤC ĐÍCH XỬ LÝ */}
                <div className="space-y-2 border-b border-slate-800 pb-4">
                  <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">🎯 Chọn mục đích xử lý</span>
                  <div className="space-y-2">
                    <label className={`block p-2.5 rounded-lg border cursor-pointer transition-all ${
                      outputMode === 'text' 
                        ? 'border-red-600 bg-red-950/40 text-white' 
                        : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-800/80'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="outputMode"
                          value="text"
                          checked={outputMode === "text"}
                          onChange={() => setOutputMode("text")}
                          className="text-red-600 focus:ring-red-500 h-4 w-4 bg-slate-800 border-slate-600"
                        />
                        <span className="text-xs font-bold">Văn bản dài → TXT/DOCX/Ẩn danh</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-relaxed">
                        Dành cho Bản án, Cáo trạng, Kết luận điều tra, Biên bản ghi lời khai.
                      </p>
                    </label>

                    <label className={`block p-2.5 rounded-lg border cursor-pointer transition-all ${
                      outputMode === 'structured' 
                        ? 'border-red-600 bg-red-950/40 text-white' 
                        : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-800/80'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="outputMode"
                          value="structured"
                          checked={outputMode === "structured"}
                          onChange={() => setOutputMode("structured")}
                          className="text-red-600 focus:ring-red-500 h-4 w-4 bg-slate-800 border-slate-600"
                        />
                        <span className="text-xs font-bold">Trích xuất dữ liệu → Excel</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-relaxed">
                        Dành cho Thông báo thụ lý, Quyết định khởi tố bị can và các biểu mẫu cần xuất bảng.
                      </p>
                    </label>
                  </div>
                </div>

                {/* PHẠM VI TRÍCH XUẤT (PAGE RANGE) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
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
                  <p className="text-[9px] text-slate-400 mt-1.5">*Chỉ khả dụng khi chọn 1 tệp duy nhất.</p>
                </div>

                {/* ACCORDION FOR ADVANCED OPTIONS */}
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-300 hover:text-slate-100 focus:outline-none transition-colors"
                  >
                    <span>{showAdvanced ? "▼ Tùy chọn nâng cao" : "▶ Tùy chọn nâng cao"}</span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      {/* TỐI ƯU ẢNH TRƯỚC OCR */}
                      <div>
                        <label className="flex items-center space-x-2 text-slate-100 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={useImageOptimization}
                            onChange={(e) => setUseImageOptimization(e.target.checked)}
                            className="form-checkbox h-4 w-4 text-emerald-600 rounded"
                          />
                          <span className="text-xs font-bold uppercase tracking-wide">Tối ưu ảnh trước OCR</span>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          Giúp OCR nhanh hơn với ảnh chụp dung lượng lớn. Nếu ảnh bị mờ hoặc kết quả OCR kém, hãy tắt tùy chọn này.
                        </p>
                      </div>

                      {useImageOptimization && (
                        <div className="flex items-center space-x-2">
                          <label className="text-[10px] uppercase tracking-wide font-bold text-slate-300">Mức nén:</label>
                          <select
                            value={imageOptimizationLevel}
                            onChange={(e) => setImageOptimizationLevel(e.target.value as "balanced" | "fast")}
                            className="bg-slate-800 text-slate-100 border border-slate-700 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            <option value="balanced">Cân bằng</option>
                            <option value="fast">Nhanh</option>
                          </select>
                        </div>
                      )}

                      <div className="flex items-start space-x-2.5 bg-slate-800 text-slate-300 p-3 rounded-lg border border-slate-700">
                        <Shield className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                        <p className="text-[10px] leading-relaxed font-medium">
                          Toàn bộ tài liệu được xử lý theo kiến trúc Stateless. Hệ thống không lưu hồ sơ sau khi kết thúc OCR.
                        </p>
                      </div>

                      {/* SECURITY BADGES */}
                      <div className="border-t border-slate-850 pt-4 flex flex-wrap justify-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-emerald-500/20">
                          🛡️ Không lưu hồ sơ
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-emerald-500/20">
                          🛡️ Stateless
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-emerald-500/20">
                          🛡️ Xử lý an toàn
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* PAGE GRID VIEW - Full Width Responsive Grid for Page Cards */}
        {queuedFiles.some(f => f.pageStates) && (() => {
          const totalPages = queuedFiles.filter(f => f.pageStates).reduce((acc, curr) => acc + (curr.totalPages || 0), 0);

          // Flat list of all page entries across all queued files
          const allPageItems = queuedFiles.flatMap(q => {
            if (!q.pageStates) return [];
            return Object.entries(q.pageStates).map(([pageNumStr, state]) => {
              const pageNum = Number(pageNumStr);
              return {
                fileId: q.id,
                fileName: q.file.name,
                totalPages: q.totalPages || 1,
                pageNum,
                state: state as any,
                slicedPage: q.slicedPages?.find(sp => sp.index === pageNum),
                q,
              };
            });
          });

          if (allPageItems.length === 0) return null;

          // Calculate statistics for the summary bar
          let totalOriginalBytes = 0;
          let totalOptimizedBytes = 0;
          let hasOptimizedPages = false;

          allPageItems.forEach(({ q, pageNum }) => {
            const sizeInfo = q.pageSizes?.[pageNum];
            if (sizeInfo) {
              totalOriginalBytes += sizeInfo.originalSize;
              if (sizeInfo.wasOptimized) {
                totalOptimizedBytes += sizeInfo.optimizedSize;
                hasOptimizedPages = true;
              } else {
                totalOptimizedBytes += sizeInfo.originalSize;
              }
            } else {
              // Fallback based on original files
              totalOriginalBytes += q.file.size / (q.totalPages || 1);
              totalOptimizedBytes += q.file.size / (q.totalPages || 1);
            }
          });

          return (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-150 pb-3 mb-4">
                <h5 className="font-bold text-slate-850 text-sm sm:text-base flex flex-wrap items-center gap-2">
                  <span>Trang tài liệu rời rạc đã phân tách & tự động nén ({totalPages} trang)</span>                  
                </h5>
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={isBatchProcessing}
                  className="mt-2 sm:mt-0 inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-650 hover:text-red-650 hover:bg-red-50 bg-slate-100 rounded-lg transition-colors border border-slate-200 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isBatchProcessing ? "Không thể xóa khi đang OCR" : "Làm lại"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa tất cả</span>
                </button>
              </div>

              {/* OVERALL DOCUMENT STATISTICS SUMMARY */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4 mb-5 text-sm font-semibold text-slate-700">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="flex items-center">
                    <span className="text-slate-800">📄 {totalPages} trang</span>
                  </div>
                  <div className="h-4 w-px bg-slate-300 hidden sm:block" />
                  <div className="flex items-center">
                    <span className="text-slate-800">💾 {formatSize(totalOriginalBytes)}</span>
                  </div>
                  {useImageOptimization && hasOptimizedPages && (
                    <>
                      <div className="h-4 w-px bg-slate-300 hidden sm:block" />
                      <div className="flex items-center text-emerald-600">
                        <span>📉 Tiết kiệm: {Math.max(0, 100 - Math.round((totalOptimizedBytes / totalOriginalBytes) * 100))}%</span>
                      </div>
                    </>
                  )}
                </div>
                {isBatchProcessing && (
                  <div className="flex items-center space-x-1.5 text-blue-600 font-bold bg-blue-50/50 px-2.5 py-1 rounded border border-blue-150 text-xs">
                    <Activity className="h-3.5 w-3.5 animate-spin" />
                    <span>⚡ Ước tính OCR: ~{Math.ceil((totalPages - allPageItems.filter(p => p.state.status === 'success' || p.state.status === 'error').length) * 3)} giây</span>
                  </div>
                )}
              </div>

              <div 
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "16px",
                  alignItems: "start"
                }}
              >
                {allPageItems.map(({ fileId, fileName, totalPages, pageNum, state, slicedPage, q }) => {
                  const { status, text, error } = state;
                  const bgClass = status === 'idle' ? 'bg-slate-50/50 border-slate-200' :
                                  status === 'processing' ? 'bg-blue-50/40 border-blue-200 animate-pulse' :
                                  status === 'success' ? 'bg-emerald-50/30 border-emerald-200' :
                                  status === 'error' ? 'bg-rose-50/30 border-rose-200' : 'bg-slate-50/50 border-slate-200';

                  const pageImgUrl = slicedPage?.dataUrl;
                  const pageSizeInfo = q.pageSizes?.[pageNum];

                  return (
                    <div 
                      key={`${fileId}-page-${pageNum}`} 
                      className={`relative bg-white border rounded-lg overflow-hidden flex flex-col group hover:shadow-md transition-all duration-200 ${bgClass}`}
                    >
                      {/* Header Label: top-left black ribbon badge showing page numbers context */}
                      <div className="absolute top-0 left-0 z-10 bg-slate-950 text-white text-[10px] font-bold px-2 py-0.5 rounded-br shadow-sm">
                        Trang {pageNum}/{totalPages}
                      </div>

                      {/* Delete button: top-right corner */}
                      <button
                        type="button"
                        onClick={() => deleteQueuedFile(fileId, fileName)}
                        disabled={isBatchProcessing}
                        className="absolute top-1 right-1 z-20 p-1.5 rounded-md bg-white/70 hover:bg-red-100 hover:text-red-650 text-slate-600 transition-colors shadow-sm backdrop-blur-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isBatchProcessing ? "Không thể xóa khi đang OCR" : "Xóa khỏi danh sách"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Live Visual Image Canvas */}
                      <div className="relative aspect-[3/4] bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-150">
                        {pageImgUrl ? (
                          <img 
                            src={pageImgUrl} 
                            alt={`Trang ${pageNum}`} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5 p-4">
                            <Layers className="h-6 w-6 stroke-1 animate-pulse" />
                            <span className="text-[9px] text-center text-slate-500">Đang chuẩn bị trang...</span>
                          </div>
                        )}
                      </div>

                      {/* Progress & Info Container */}
                      <div className="p-2.5 flex-grow flex flex-col justify-between">
                        {/* File Name inside the Card */}
                        <div className="mb-2">
                          <p className="text-[11px] font-bold text-slate-700 truncate" title={fileName}>
                            {fileName}
                          </p>
                        </div>

                        {/* Progress Timeline & Status */}
                        <div className="w-full mb-2">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                status === 'idle' ? 'bg-slate-300 w-0' :
                                status === 'processing' ? 'bg-blue-500' :
                                status === 'success' ? 'bg-emerald-500 w-full' :
                                'bg-rose-500 w-0'
                              }`} 
                              style={{ 
                                width: status === 'success' ? '100%' :
                                       status === 'processing' ? `${progress}%` :
                                       '0%' 
                              }} 
                            />
                          </div>
                          
                          <div className="flex items-center justify-between mt-1.5">
                            {/* Colorful badges with status */}
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              status === 'idle' ? 'bg-slate-100 text-slate-650 border border-slate-200' :
                              status === 'processing' ? 'bg-blue-100 text-blue-700 border border-blue-200 animate-pulse' :
                              status === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                              'bg-rose-100 text-rose-700 border border-rose-200'
                            }`}>
                              {status === 'idle' && '🟡 ĐANG CHỜ'}
                              {status === 'processing' && '🔵 ĐANG OCR'}
                              {status === 'success' && '🟢 HOÀN THÀNH'}
                              {status === 'error' && '🔴 LỖI'}
                            </span>

                            {/* Action/Status Icon */}
                            <div className="flex items-center">
                              {status === 'success' && (
                                <span className="text-emerald-600 font-extrabold text-[11px]" title="Thành công">✓</span>
                              )}
                              {status === 'error' && (
                                <button
                                  type="button"
                                  onClick={() => setPageErrorDetail({ pageNum, error: error || "Lỗi không xác định" })}
                                  className="text-rose-600 hover:text-rose-800 font-extrabold text-[11px] focus:outline-none p-0.5 cursor-pointer transition-colors"
                                  title="Xem chi tiết lỗi"
                                >
                                  X
                                </button>
                              )}
                              {status === 'processing' && (
                                <Activity className="h-3 w-3 text-blue-500 animate-spin" />
                              )}
                              {status === 'idle' && (
                                <span className="h-1.5 w-1.5 bg-slate-350 rounded-full" title="Chờ trích xuất"></span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer Metadata Row with Compression Ratio */}
                        <div className="flex flex-col space-y-0.5 border-t border-slate-100 pt-2 mt-1 text-[10px] text-slate-500 font-mono">
                          {pageSizeInfo ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">Gốc:</span>
                                <span className="font-semibold text-slate-700">{formatSize(pageSizeInfo.originalSize)}</span>
                              </div>
                              {pageSizeInfo.wasOptimized ? (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400 font-sans">Sau nén:</span>
                                    <span className="font-semibold text-emerald-650">{formatSize(pageSizeInfo.optimizedSize)}</span>
                                  </div>
                                  <div className="flex justify-between text-emerald-700 font-bold">
                                    <span className="font-sans">Tiết kiệm:</span>
                                    <span>
                                      {Math.max(0, 100 - Math.round((pageSizeInfo.optimizedSize / pageSizeInfo.originalSize) * 100))}%
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex justify-between">
                                  <span className="text-slate-400 font-sans">Sau nén:</span>
                                  <span className="font-semibold text-slate-500">Không nén</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-sans">Gốc:</span>
                              <span className="font-semibold text-slate-700">{slicedPage?.size || "—"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {/* LIMIT MODAL */}
      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Giới hạn sử dụng</h3>
            </div>
            <div className="text-slate-600 text-sm mb-6 leading-relaxed space-y-3">
              {limitModal.type === "daily" ? (
                <>
                  {limitModal.maxAllowed <= 0 ? (
                    <p>Bạn đã sử dụng hết 50 trang miễn phí hôm nay.<br/><br/>Bạn có thể quay lại vào ngày mai hoặc nâng cấp LexOCR PRO để tiếp tục xử lý ngay.</p>
                  ) : (
                    <p>Hôm nay bạn còn <strong>{limitModal.maxAllowed}</strong> trang miễn phí.<br/><br/>Hãy giảm phạm vi xử lý xuống tối đa {limitModal.maxAllowed} trang hoặc nâng cấp LexOCR PRO.</p>
                  )}
                </>
              ) : (
                <p>
                  Gói Free hỗ trợ xử lý tối đa 20 trang trong mỗi lần OCR.<br/><br/>
                  Bạn có thể chọn một phạm vi tối đa 20 trang, ví dụ 1–20 hoặc 21–40, để tiếp tục sử dụng miễn phí.<br/><br/>
                  Nâng cấp LexOCR PRO để xử lý toàn bộ tài liệu trong một lần.
                </p>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              {limitModal.type === "batch" && (
                <>
                  <button 
                    onClick={limitModal.onAccept}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Tiếp tục với 20 trang đầu
                  </button>
                  <button 
                    onClick={limitModal.onReject}
                    className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition-colors"
                  >
                    Quay lại chọn phạm vi
                  </button>
                </>
              )}
              {limitModal.type === "daily" && limitModal.maxAllowed > 0 && (
                <button 
                  onClick={limitModal.onAccept}
                  className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition-colors"
                >
                  Đóng
                </button>
              )}
              {(limitModal.type === "daily" && limitModal.maxAllowed <= 0) && (
                <button 
                  onClick={limitModal.onReject}
                  className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition-colors"
                >
                  Đóng
                </button>
              )}
              <a 
                href="/pricing"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setLimitModal(null)}
                className={`w-full px-4 py-2 text-center text-sm font-semibold rounded-lg transition-colors ${limitModal.type === "daily" && limitModal.maxAllowed <= 0 ? "bg-red-600 hover:bg-red-700 text-white" : "text-red-600 bg-red-50 hover:bg-red-100"}`}
              >
                Khám phá LexOCR PRO
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ERROR MODAL */}
      {errorModalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Thông báo</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {errorModalMsg}
            </p>
            <div className="flex flex-col space-y-2">
              {errorModalMsg.includes("hạn mức miễn phí") && (
                <a 
                  href="/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setErrorModalMsg(null)}
                  className="w-full px-4 py-2 text-center text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Xem gói PRO
                </a>
              )}
              <button 
                onClick={() => setErrorModalMsg(null)}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE ERROR DETAIL MODAL */}
      {pageErrorDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-lg font-bold">Chi tiết lỗi - Trang {pageErrorDetail.pageNum}</h3>
              </div>
              <button 
                onClick={() => setPageErrorDetail(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-5 max-h-[300px] overflow-y-auto">
              <p className="text-sm font-mono text-rose-800 break-words whitespace-pre-wrap">
                {pageErrorDetail.error}
              </p>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Gợi ý khắc phục:</strong> Để chạy lại trang này, bạn có thể thiết lập <strong>Từ trang: {pageErrorDetail.pageNum}</strong> và <strong>Đến trang: {pageErrorDetail.pageNum}</strong> ở bảng <em>Phạm vi trích xuất (Page Range)</em> bên phải và nhấn Bắt đầu lại.
              </p>
            </div>

            <div className="flex justify-end mt-5">
              <button 
                onClick={() => setPageErrorDetail(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}