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
import { classifyGeminiResponse } from "../utils/geminiResponseClassifier";
import { getActiveModel, autoResolveModel, MODEL_MODES } from "../utils/geminiModelResolver";
import { optimizeImageForOcr } from "../utils/imageOptimizer";

interface OcrScannerProps {
  onFileLoaded: (fileData: { name: string; content: string; mimeType: string; selectedFile?: File | File[]; outputMode?: "text" | "structured" }) => void;
  config: OcrConfig;
  setConfig: React.Dispatch<React.SetStateAction<OcrConfig>>;
  setActiveTab?: (tab: string) => void;
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

const sanitizeError = (message: string): string => {
  if (!message) return "";
  return message
    .replace(/key=[a-zA-Z0-9_\-]+/g, (match) => {
      const parts = match.split('=');
      const val = parts[1] || '';
      return `key=****${val.slice(-4)}`;
    })
    .replace(/AIzaSy[a-zA-Z0-9_\-]+/g, (match) => {
      return `****${match.slice(-4)}`;
    });
};

export default function OcrScanner({ onFileLoaded, config, setConfig, setActiveTab }: OcrScannerProps) {
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
  const cancelOcrRef = useRef<AbortController | null>(null);

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
  const [errorModalMsg, setErrorModalMsg] = useState<string | React.ReactNode | null>(null);
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

  const controller = new AbortController();
  cancelOcrRef.current = controller;
  const signal = controller.signal;

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
  setErrorModalMsg(
    <span>
      Chưa có Gemini API Key?{" "}
      <a
        href="/knowledge/huong-dan-tao-gemini-api-key"
        onClick={(e) => {
          e.preventDefault();
          window.history.pushState({}, '', '/knowledge/huong-dan-tao-gemini-api-key');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
        className="text-blue-600 hover:underline font-semibold"
      >
        Xem hướng dẫn tạo trong 3 phút.
      </a>
    </span>
  );
  setIsBatchProcessing(false);
  isProcessingRef.current = false;
  return;
}
let activeKeyIndex = 0;
const rateLimitedProjects = new Set<string>();
const keyToProjectMap = new Map<string, string>();


    const sendFileToBackend = async (file: File, pageNumParam: number = 1): Promise<string> => {
      const pageNum = pageNumParam; // or dynamic page index variable
      if (pageProcessingLockRef.current[pageNum]) {
        return "";
      }
      pageProcessingLockRef.current[pageNum] = true;

      // @ts-ignore
      if (import.meta.env.DEV) console.info(`--- EXECUTING SINGLE OCR RUN FOR ${file.type?.startsWith("image/") ? `Image_1_${file.name || "unknown"}` : `Page_${pageNum}`} ---`);
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
            const logSuccess = (val: string) => {
              console.log("[FALLBACK] Result: success");
              resolveFallback(val);
            };
            const logFailure = (err: Error) => {
              console.log("[FALLBACK] Result: failed", err.message);
              rejectFallback(err);
            };

            setBatchProgressText(`Gemini quá tải, chuyển sang OCR dự phòng - Trang ${pageNum}...`);
            
            fetch("/api/ocr")
              .then(res => {
                if (!res.ok) {
                  throw new Error("Failed to retrieve OCR.space credentials from API gateway");
                }
                return res.json();
              })
              .then((data: any) => {
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
                
                if (ocrKeys.length === 0) {
                  logFailure(new Error("OCR.space API Key không được cấu hình."));
                  return;
                }
                
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
                  
                  downscaledCanvas.toBlob((blob) => {
                    if (!blob) {
                      logFailure(new Error("Canvas toBlob failed - asset is empty!"));
                      return;
                    }

                    const diagnosticFormData = new FormData();
                    diagnosticFormData.append('apikey', ocrKeys[0]);
                    diagnosticFormData.append('language', 'auto');
                    diagnosticFormData.append('isOverlayRequired', 'false');
                    diagnosticFormData.append('OcrEngine', '2');
                    diagnosticFormData.append('file', blob, 'page6.jpg');
                    
                    fetch("https://api.ocr.space/parse/image", {
                      method: "POST",
                      body: diagnosticFormData
                    })
                    .then(async res => {
                      const txt = await res.text();
                      if (!res.ok) {
                        if (res.status === 429) {
                          const retryAfter = res.headers.get("retry-after") || "3600";
                          const minutes = Math.ceil(parseInt(retryAfter, 10) / 60);
                          const msg = `Công cụ OCR dự phòng đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau khoảng ${minutes} phút.`;
                          setEditorContent((prev) => prev + (prev ? "\n\n" : "") + msg);
                          editorContentRef.current += (editorContentRef.current ? "\n\n" : "") + msg;
                          logFailure(new Error(msg));
                          return;
                        }
                        const sanitizedTxt = sanitizeError(txt);
                        setEditorContent((prev) => prev + (prev ? "\n\n" : "") + `OCR.space Error ${res.status}: ${sanitizedTxt}`);
                        editorContentRef.current += (editorContentRef.current ? "\n\n" : "") + `OCR.space Error ${res.status}: ${sanitizedTxt}`;
                        logFailure(new Error(`OCR.space HTTP error ${res.status}`));
                        return;
                      }
                      let data;
                      try {
                        data = JSON.parse(txt);
                      } catch {
                        const finalText = txt.trim();
                        const sanitizedFinalText = sanitizeError(finalText);
                        setEditorContent((prev) => prev + (prev ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedFinalText);
                        editorContentRef.current += (editorContentRef.current ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedFinalText;
                        logSuccess(sanitizedFinalText);
                        return;
                      }
                      if (data.IsErroredOnProcessing || data.OCRExitCode > 1) {
                        const errMsgs = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : (data.ErrorMessage || '');
                        const errorInfo = sanitizeError(errMsgs || "OCR.space processing error");
                        setEditorContent((prev) => prev + (prev ? "\n\n" : "") + `OCR.space Processing Error: ${errorInfo}`);
                        editorContentRef.current += (editorContentRef.current ? "\n\n" : "") + `OCR.space Processing Error: ${errorInfo}`;
                        logFailure(new Error(errorInfo));
                        return;
                      }
                      let extractedText = "";
                      if (data.ParsedResults?.[0]?.ParsedText) {
                        extractedText = data.ParsedResults[0].ParsedText;
                      } else if (data.text) {
                        extractedText = data.text;
                      } else {
                        const msg = "Không nhận dạng được văn bản nào từ phản hồi của OCR.space.";
                        setEditorContent((prev) => prev + (prev ? "\n\n" : "") + msg);
                        editorContentRef.current += (editorContentRef.current ? "\n\n" : "") + msg;
                        logFailure(new Error(msg));
                        return;
                      }
                      const finalText = extractedText.trim();
                      const sanitizedFinalText = sanitizeError(finalText);
                      setEditorContent((prev) => prev + (prev ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedFinalText);
                      editorContentRef.current += (editorContentRef.current ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedFinalText;
                      logSuccess(sanitizedFinalText);
                    })
                    .catch(err => {
                      const errorMsg = sanitizeError(err?.message || "Unknown fetch error");
                      setEditorContent((prev) => prev + (prev ? "\n\n" : "") + `Fetch error: ${errorMsg}`);
                      editorContentRef.current += (editorContentRef.current ? "\n\n" : "") + `Fetch error: ${errorMsg}`;
                      logFailure(new Error(errorMsg));
                    });
                  }, 'image/jpeg', 0.85);
                };
                img.onerror = () => {
                  logFailure(new Error("Không thể tải ảnh cấu hình canvas để nén cho OCR.space."));
                };
                img.src = URL.createObjectURL(file);
              })
              .catch(err => {
                logFailure(new Error(sanitizeError(err?.message || "Unknown error during OCR.space fallback")));
              });
          });
        };

        const makeRequest = (activeKey: string, retryAttempt: number = 0, isRecitationRetry: boolean = false): Promise<string> => {
          return new Promise<string>((resolve, reject) => {
            if (signal?.aborted) {
              reject({ type: "ABORTED", message: "Đã hủy quá trình bóc tách." });
              return;
            }

            // @ts-ignore
            if (import.meta.env.DEV) {
              console.info("[OCR ENGINE] Gemini");
              const model = getActiveModel(user?.uid, activeKey);
              console.info("[GEMINI CONFIG] Key index:", activeKeyIndex);
              console.info("[GEMINI CONFIG] Key suffix:", `${activeKey.slice(-4)}`);
              console.info("[GEMINI CONFIG] Model:", model);
            }
            // @ts-ignore
            if (import.meta.env.DEV) console.info(`[OCR ${file.type?.startsWith("image/") ? `Image_1_${file.name || "unknown"}` : `Page_${pageNum}`} START] ${Date.now()}`);
            
            if (retryAttempt > 0) {
              setBatchProgressText(`Gemini đang tạm thời quá tải. Hệ thống sẽ tự động thử lại... (Lần thử ${retryAttempt}/3)`);
            } else {
              setBatchProgressText(`Đang thử Gemini key ${activeKeyIndex + 1}/${geminiKeyPool.length} - Trang ${pageNum}...`);
            }

            const xhr = new XMLHttpRequest();
            const selectedModel = getActiveModel(user?.uid, activeKey);
            let finalCleanKey = activeKey.replace(/[\[\]"']/g, '').trim();
            const googleUrl = `https://generativelanguage.googleapis.com/v1/models/${selectedModel}:generateContent?key=${finalCleanKey}`;
            xhr.open("POST", googleUrl, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            
            const onAbort = () => {
              try {
                xhr.abort();
              } catch (e) {}
              reject({ type: "ABORTED", message: "Đã hủy quá trình bóc tách." });
            };
            signal?.addEventListener('abort', onAbort);

            const cleanup = () => {
              signal?.removeEventListener('abort', onAbort);
            };

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                setProgress(percentComplete);
              }
            };
            
            xhr.onload = () => {
              cleanup();
              if (signal?.aborted) return;

              let shouldFallback = false;
              let errorCode = xhr.status;
              let errorStatus = "";
              let errorMessage = "";

              if (xhr.status < 200 || xhr.status >= 300) {
                try {
                  const jsonBody = JSON.parse(xhr.responseText);
                  if (jsonBody && jsonBody.error) {
                    errorCode = jsonBody.error.code !== undefined ? jsonBody.error.code : xhr.status;
                    errorStatus = jsonBody.error.status || "";
                    errorMessage = jsonBody.error.message || "";
                  } else {
                    errorMessage = xhr.responseText || xhr.statusText || "";
                  }
                } catch (e) {
                  errorMessage = xhr.responseText || xhr.statusText || "";
                }

                // @ts-ignore
                if (import.meta.env.DEV) {
                  console.error("[GEMINI ERROR]", {
                    httpStatus: errorCode,
                    apiStatus: errorStatus,
                    message: errorMessage,
                    selectedModel: selectedModel
                  });
                }
              }

              let errorType = "SERVER_ERROR";
              if (errorCode === 429 || errorStatus === "RESOURCE_EXHAUSTED") {
                errorType = "RATE_LIMITED";
              } else if (errorCode === 404 || errorStatus === "NOT_FOUND") {
                errorType = "MODEL_NOT_AVAILABLE";
              } else if (errorCode === 403 || errorStatus === "PERMISSION_DENIED") {
                errorType = "KEY_PERMISSION_ERROR";
              } else if (errorCode >= 400 && errorCode < 500) {
                errorType = "CLIENT_ERROR";
              }

              const isTransientError = xhr.status === 408 || xhr.status === 500 || xhr.status === 502 || xhr.status === 503 || xhr.status === 504;

              if (errorType === "RATE_LIMITED" || errorType === "MODEL_NOT_AVAILABLE" || errorType === "KEY_PERMISSION_ERROR" || errorType === "CLIENT_ERROR" || xhr.status === 401) {
                reject({
                  status: errorCode,
                  type: errorType,
                  code: errorCode,
                  apiStatus: errorStatus,
                  message: errorMessage
                });
                return;
              } else if (isTransientError || xhr.status === 0) { // status 0 can be network error/timeout
                const maxRetries = xhr.status === 503 ? 3 : 1;
                if (retryAttempt < maxRetries) {
                  let delay = 2500;
                  if (xhr.status === 503) {
                    delay = retryAttempt === 0 ? 2500 : retryAttempt === 1 ? 5000 : 10000;
                  }
                  delay += Math.floor(Math.random() * 1000); // jitter 0 to 1000 ms
                  
                  const nextAttempt = retryAttempt + 1;
                  const errorName = xhr.status === 503 ? "Gemini đang tạm thời quá tải" : (xhr.status === 0 ? "Lỗi kết nối mạng" : `Gemini gặp lỗi tạm thời (${xhr.status})`);
                  
                  if (xhr.status === 503) {
                    setBatchProgressText(`Gemini đang tạm thời quá tải. Hệ thống sẽ tự động thử lại... (Lần thử ${nextAttempt}/3)`);
                  } else {
                    setBatchProgressText(`${errorName}, đang thử lại - Trang ${pageNum}...`);
                  }

                  setTimeout(() => {
                    if (signal?.aborted) {
                      reject({ type: "ABORTED", message: "Đã hủy quá trình bóc tách." });
                      return;
                    }
                    makeRequest(activeKey, nextAttempt, isRecitationRetry).then(resolve).catch(reject);
                  }, delay);
                  return;
                } else {
                  if (xhr.status === 503 || xhr.status === 0) {
                    reject({ 
                      type: xhr.status === 503 ? "503_EXHAUSTED" : "TRANSIENT_EXHAUSTED", 
                      message: xhr.status === 503 
                        ? "Gemini đang tạm thời quá tải. Vui lòng chờ một lát rồi thử lại." 
                        : "Lỗi kết nối mạng hoặc dịch vụ quá tải. Vui lòng thử lại sau."
                    });
                    return;
                  }
                  shouldFallback = true;
                }
              }

              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const rawText = xhr.responseText;
                  const cleanJson = JSON.parse(rawText);
                  
                  const blockReason = cleanJson.promptFeedback?.blockReason;
                  const candidate = cleanJson.candidates?.[0];
                  const finishReason = candidate?.finishReason;
                  const safetyRatings = candidate?.safetyRatings || [];

                  const geminiText = candidate?.content?.parts?.[0]?.text;
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
                  const hasUsableText = Boolean(sanitizedText);

                  if (hasUsableText) {
                    // @ts-ignore
                    if (import.meta.env.DEV) console.info(`[OCR ${file.type?.startsWith("image/") ? `Image_1_${file.name || "unknown"}` : `Page_${pageNum}`} END] ${Date.now()}`);
                    const sanitizedFinalText = sanitizeError(sanitizedText);
                    setEditorContent((prev) => prev + (prev ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedFinalText);
                    editorContentRef.current += (editorContentRef.current ? "\n\n--- [TRANG KẾ TIẾP] ---\n\n" : "") + sanitizedFinalText;
                    resolve(sanitizedFinalText);
                    return;
                  }

                  const failureCategory = (() => {
                    if (finishReason === "RECITATION") return "RECITATION_BLOCKED";
                    return classifyGeminiResponse(cleanJson);
                  })();

                  // @ts-ignore
                  if (import.meta.env.DEV) {
                    const savedSelectedModel = localStorage.getItem("selected_gemini_model") || "auto";
                    const modeLog = savedSelectedModel === "auto" ? "auto" : "manual";
                    const resolvedModelLog = cleanJson.modelName || selectedModel || "unknown";
                    const keysStr = localStorage.getItem("gemini_api_keys");
                    let activeKeySuffix = "unknown";
                    if (keysStr) {
                      try {
                        const keys = JSON.parse(keysStr);
                        if (Array.isArray(keys) && keys.length > 0) {
                          const activeKey = keys[activeKeyIndex % keys.length];
                          if (activeKey) activeKeySuffix = activeKey.slice(-4);
                        }
                      } catch (e) {}
                    }

                    console.info("[OCR MODEL]");
                    console.info(`Mode: ${modeLog}`);
                    console.info(`Resolved model: ${resolvedModelLog}`);
                    console.info(`Key suffix: ****${activeKeySuffix}`);
                    console.info("\n[GEMINI RESULT]");
                    console.info(`HTTP status: ${xhr.status}`);
                    console.info(`Has usable text: ${hasUsableText}`);
                    console.info(`Finish reason: ${finishReason || "None"}`);
                    console.info(`Failure category: ${failureCategory || "None"}`);
                  }

                  if (failureCategory) {
                    let friendlyMsg = "Lỗi xử lý hình ảnh từ AI.";
                    if (failureCategory === "RECITATION_BLOCKED") friendlyMsg = "Lỗi sao chép văn bản (RECITATION).";
                    else if (failureCategory === "CONTENT_BLOCKED") friendlyMsg = "Nội dung bị chặn do vi phạm chính sách.";
                    else if (failureCategory === "SAFETY_BLOCKED") friendlyMsg = "Nội dung bị chặn vì lý do an toàn.";
                    else if (failureCategory === "PROMPT_BLOCKED") friendlyMsg = "Yêu cầu bị chặn (Prompt blocked).";
                    reject({ type: failureCategory, message: friendlyMsg });
                    return;
                  }

                  reject({ type: "EMPTY_RESPONSE", message: "Không tìm thấy nội dung văn bản trong ảnh." });
                  return;
                } catch (e) {
                  reject({ type: "PARSE_ERROR", message: "Gemini response parse error" });
                  return;
                }
              } else {
                if (shouldFallback) {
                  reject({ type: "TRANSIENT_FAILED", message: `Gemini HTTP ${xhr.status} (Transient error failed after retries)` });
                } else {
                  reject({ status: xhr.status, message: `Gemini HTTP ${xhr.status}` });
                }
                return;
              }
            };
            
              xhr.onerror = () => {
                cleanup();
                if (signal?.aborted) return;

                const maxRetries = 1;
                if (retryAttempt < maxRetries) {
                  const delay = 2500 + Math.floor(Math.random() * 1000);
                  setBatchProgressText(`Lỗi kết nối mạng, đang thử lại - Trang ${pageNum}...`);
                  setTimeout(() => {
                    if (signal?.aborted) {
                      reject({ type: "ABORTED", message: "Đã hủy quá trình bóc tách." });
                      return;
                    }
                    makeRequest(activeKey, retryAttempt + 1, isRecitationRetry).then(resolve).catch(reject);
                  }, delay);
                } else {
                  reject({ type: "NETWORK", message: "Lỗi kết nối mạng khi gửi yêu cầu tới Gemini." });
                }
              };
            
            let promptText = "Trích xuất chính xác 100% toàn bộ nội dung văn bản có trong hình ảnh này sang tiếng Việt. Giữ nguyên định dạng, không thêm bớt bất kỳ từ ngữ hay lời giải thích nào.";
            if (isRecitationRetry) {
              promptText = "Chỉ trích xuất văn bản nhìn thấy trong hình ảnh/tài liệu. Không bổ sung, không suy luận, không tái tạo nội dung ngoài ảnh. Nếu không chắc, giữ nguyên ký tự quan sát được.\n" +
                "Only extract visible text from the provided image/document. Do not add, infer, or reproduce any content outside the image. If unsure, keep the observed characters exactly as they are.\n" +
                promptText;
            }

            const payload = {
              "contents": [{
                "parts": [
                  {"text": promptText},
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

        let hasRetriedAuto404 = false;
        while (true) {
          if (signal?.aborted) {
            throw { type: "ABORTED", message: "Đã hủy quá trình bóc tách." };
          }
          let currentKey = geminiKeyPool[activeKeyIndex];
          while (currentKey) {
            const pid = keyToProjectMap.get(currentKey);
            if (pid && rateLimitedProjects.has(pid)) {
              activeKeyIndex++;
              currentKey = geminiKeyPool[activeKeyIndex];
            } else {
              break;
            }
          }
          if (!currentKey) {
            throw new Error("API key đã chạm hạn mức Gemini của project. Hãy chờ hạn mức được làm mới hoặc bật thanh toán trong Google AI Studio.");
          }

          const modelMode = getUserStorageItem(user?.uid, 'gemini_model_mode') || 'auto';
          if (modelMode === 'auto') {
            const resolved = getUserStorageItem(user?.uid, 'gemini_resolved_model');
            if (!resolved) {
              try {
                setBatchProgressText(`Đang tự động chọn model cho Trang ${pageNum}...`);
                await autoResolveModel(user?.uid, currentKey, false);
              } catch (resErr: any) {
                let errText = "Không tìm thấy model Gemini phù hợp với API Key này.";
                if (resErr.message === "INVALID_KEY") errText = "Gemini API Key không hợp lệ.";
                else if (resErr.message === "RATE_LIMIT") errText = "Gemini API Key hiện đã đạt giới hạn sử dụng. Vui lòng thử lại sau.";
                else if (resErr.message === "NETWORK") errText = "Không thể kiểm tra danh sách model. Vui lòng kiểm tra kết nối mạng.";
                throw new Error(errText);
              }
            }
          }

          try {
            const text = await makeRequest(currentKey);
            return text;
          } catch (e: any) {
            if (e?.type === "ABORTED" || e?.type === "503_EXHAUSTED") {
              throw e;
            }
            if (e?.type === "MODEL_NOT_AVAILABLE") {
              const currentMode = getUserStorageItem(user?.uid, 'gemini_model_mode') || 'auto';
              if (currentMode === 'auto' && !hasRetriedAuto404) {
                hasRetriedAuto404 = true;
                try {
                  setBatchProgressText(`Model không khả dụng, đang dò tìm model mới cho Trang ${pageNum}...`);
                  await autoResolveModel(user?.uid, currentKey, true);
                  continue;
                } catch (resErr: any) {
                  throw new Error("Mô hình không khả dụng và không thể tự động tìm thấy mô hình thay thế.");
                }
              }
              if (currentMode === 'manual') {
                throw new Error("Mô hình này không khả dụng với Gemini API Key hiện tại. Vui lòng chọn model khác hoặc chuyển sang chế độ Tự động.");
              }
              throw new Error(e?.message || "Mô hình không khả dụng.");
            }

            if (e?.type === "RATE_LIMITED") {
              const match = e?.message?.match(/for\s+project\s+['"]?([a-zA-Z0-9_-]+)/i);
              if (match && match[1]) {
                const projectId = match[1];
                rateLimitedProjects.add(projectId);
                keyToProjectMap.set(currentKey, projectId);
              } else {
                const dummyProj = `unknown_proj_${activeKeyIndex}`;
                rateLimitedProjects.add(dummyProj);
                keyToProjectMap.set(currentKey, dummyProj);
              }
              activeKeyIndex++;
              continue;
            }

            if (e?.type === "RECITATION_BLOCKED") {
              console.log("[OCR PATH]\nHandler: startOcrProcess\nRequest function: makeRequest");
              console.log("[RECITATION]\nInitial: blocked\nRetry attempted: true");
              try {
                setBatchProgressText(`Phát hiện lỗi sao chép văn bản (RECITATION), đang thử lại với cấu hình nghiêm ngặt...`);
                const retryText = await makeRequest(currentKey, 0, true);
                console.log("[RECITATION]\nRetry result: success");
                console.log("[FALLBACK]\nCalled: false\nReason: none");
                return retryText;
              } catch (retryErr: any) {
                if (retryErr?.type === "RECITATION_BLOCKED") {
                  console.log("[RECITATION]\nRetry result: blocked");
                  console.log("[FALLBACK]\nCalled: true\nReason: RECITATION_BLOCKED_AFTER_RETRY");
                  setBatchProgressText(`Gemini không thể chép nguyên văn trang này. Hệ thống đang thử công cụ OCR dự phòng...`);
                  try {
                    const fallbackText = await runOcrSpaceFallback();
                    return fallbackText;
                  } catch (fallbackErr: any) {
                    throw { 
                      type: "RECITATION_FALLBACK_FAILED", 
                      message: fallbackErr.message || "Gemini không thể chép nguyên văn trang này và công cụ OCR dự phòng hiện chưa khả dụng." 
                    };
                  }
                }
                throw retryErr;
              }
            }

            if (e?.type === "CONTENT_BLOCKED" || e?.type === "SAFETY_BLOCKED" || e?.type === "PROMPT_BLOCKED") {
              console.log("[OCR PATH]\nHandler: startOcrProcess\nRequest function: makeRequest");
              console.log(`[FALLBACK]\nCalled: true\nReason: ${e.type}`);
              setBatchProgressText(`Nội dung bị chặn (${e.type}). Hệ thống đang thử công cụ OCR dự phòng...`);
              try {
                const fallbackText = await runOcrSpaceFallback();
                return fallbackText;
              } catch (fallbackErr: any) {
                throw {
                  type: "FALLBACK_FAILED",
                  message: `Nội dung bị chặn và OCR dự phòng thất bại: ${fallbackErr.message || "Lỗi OCR.space"}`
                };
              }
            }

            if (e?.type === "KEY_PERMISSION_ERROR" || e?.status === 401) {
              activeKeyIndex++;
              continue;
            }

            if (e?.type === "CLIENT_ERROR") {
              throw new Error(e?.message || "Đã xảy ra lỗi từ Gemini API.");
            }

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
          const sanitizedMsg = sanitizeError(errorMsgObj);
          updatePageStatus(qFile.id, pageIdx, 'error', undefined, sanitizedMsg);
          const errorMsg = `[Lỗi bóc tách Trang ${pageIdx}]: ${sanitizedMsg}`;
          setEditorContent((prev) => prev + (prev ? "\n\n" + errorMsg : errorMsg));
          editorContentRef.current += (editorContentRef.current ? "\n\n" + errorMsg : errorMsg);
          throw err;
        } finally {
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
            continue;
          }
        }

        let startPage = 1;
        let endPage = pageFiles.length;

        if (filesToProcess.length === 1) {
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

        for (let p = startPage; p <= endPage; p++) {
          if (signal?.aborted) {
            throw { type: "ABORTED", message: "Đã hủy quá trình bóc tách." };
          }
          const pageFile = pageFiles[p - 1];
          setBatchProgressText(`Đang bóc tách ${file.name} - Trang ${p}/${endPage}...`);
          try {
            await processSinglePage(pageFile, p, endPage);
          } catch (e: any) {
            if (e?.type === "503_EXHAUSTED" || e?.type === "ABORTED") {
              updateFileStatus(i, "error");
              setFileErrors(prev => ({
                ...prev,
                [i]: sanitizeError(e.message || "Gemini đang tạm thời quá tải. Vui lòng chờ một lát rồi thử lại.")
              }));
              throw e;
            }
            throw e;
          }
          if (p < endPage) {
            await new Promise((res) => setTimeout(res, 2500));
          }
        }

        updateFileStatus(i, "completed");
      } else {
        try {
          await processSinglePage(file, 1, 1);
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
          if (err?.type === "503_EXHAUSTED" || err?.type === "ABORTED") {
            updateFileStatus(i, "error");
            setFileErrors(prev => ({
              ...prev,
              [i]: sanitizeError(err.message || "Gemini đang tạm thời quá tải. Vui lòng chờ một lát rồi thử lại.")
            }));
            throw err;
          }
          setFileErrors(prevErrs => ({
            ...prevErrs,
            [i]: "[Lỗi bóc tách]: Vui lòng kiểm tra lại chất lượng tệp tin hoặc cấu hình Key của trang này."
          }));
          updateFileStatus(i, "error");
          throw err;
        }
      }

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
  } catch (error: any) {
    console.error("OCR process error:", error);
    if (error?.type === "503_EXHAUSTED") {
      setErrorModalMsg("Gemini đang tạm thời quá tải. Vui lòng chờ một lát rồi thử lại.");
    } else if (error?.type === "ABORTED") {
      setErrorModalMsg("Đã hủy quá trình bóc tách.");
    } else {
      setErrorModalMsg(sanitizeError(error?.message || "Đã xảy ra lỗi trong quá trình xử lý."));
    }
    setIsBatchProcessing(false);
    setProcessingFile(null);
    setProgress(0);
    isProcessingRef.current = false;
  } finally {
    setIsBatchProcessing(false);
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
            <button 
              onClick={() => {
                if (setActiveTab) {
                  setActiveTab("upgrade");
                }
              }}
              className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded transition-colors"
            >
              Xem gói PRO
            </button>
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
            <div className="flex flex-col items-center justify-center w-full space-y-4">
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

              {isBatchProcessing && (
                <div className="w-full sm:w-[320px] p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 flex flex-col items-center space-y-2.5 shadow-md">
                  <div className="flex items-center space-x-2.5 text-xs font-semibold text-center">
                    <Activity className="h-3.5 w-3.5 text-red-500 animate-spin flex-shrink-0" />
                    <span className="leading-tight">{batchProgressText}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelOcrRef.current?.abort()}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold uppercase rounded border border-slate-700 transition-colors shadow-inner"
                  >
                    Hủy bóc tách
                  </button>
                </div>
              )}
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
                        <span className="text-xs font-bold">Chuyển File → Text/Word</span>
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
                <div className="flex flex-col space-y-2">
                  {(!fromPage && !toPage) ? (
                    <button 
                      onClick={limitModal.onAccept}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Xử lý 20 trang đầu
                    </button>
                  ) : null}
                  <button 
                    onClick={limitModal.onReject}
                    className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition-colors border border-slate-200"
                  >
                    Quay lại chọn phạm vi
                  </button>
                </div>
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
              <button 
                onClick={() => {
                  setLimitModal(null);
                  if (setActiveTab) {
                    setActiveTab("upgrade");
                  }
                }}
                className={`w-full px-4 py-2 text-center text-sm font-semibold rounded-lg transition-colors ${limitModal.type === "daily" && limitModal.maxAllowed <= 0 ? "bg-red-600 hover:bg-red-700 text-white" : "text-red-600 bg-red-50 hover:bg-red-100"}`}
              >
                Khám phá LexOCR PRO
              </button>
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
              {typeof errorModalMsg === "string" && errorModalMsg.includes("hạn mức miễn phí") && (
                <button 
                  onClick={() => {
                    setErrorModalMsg(null);
                    if (setActiveTab) {
                      setActiveTab("upgrade");
                    }
                  }}
                  className="w-full px-4 py-2 text-center text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Xem gói PRO
                </button>
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