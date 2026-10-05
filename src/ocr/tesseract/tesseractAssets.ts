export const TESSERACT_ASSETS = {
  workerPath: "/tesseract/worker/worker.min.js",
  corePath: "/tesseract/core/tesseract-core-simd-lstm.wasm.js",
  langPath: "/tesseract/best",
} as const;

export const TESSERACT_GZIP = false;
export const TESSERACT_WORKER_BLOB_URL = false;

// Language code normalization: chấp nhận "vi" hoặc "vie" từ config,
// nhưng khi gọi Tesseract thì luôn dùng "vie".
export function normalizeTesseractLanguage(input: string): string {
  const map: Record<string, string> = {
    vi: "vie",
    vie: "vie",
    en: "eng",
    eng: "eng",
  };
  const normalized = map[input.toLowerCase()];
  if (!normalized) {
    throw new Error(`Ngôn ngữ không được hỗ trợ cho Tesseract Free: ${input}`);
  }
  return normalized;
}