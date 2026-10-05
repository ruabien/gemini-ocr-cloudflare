export type OcrEngineId = "tesseract" | "gemini";

export interface OcrProgress {
  status: string;
  progress: number; // 0.0 → 1.0
}

export interface OcrRecognizeOptions {
  language: string; // "vie", "eng", v.v.
  pageNumber: number;
  signal?: AbortSignal;
  onProgress?: (progress: OcrProgress) => void;
}

export interface OcrResult {
  text: string;
  pageNumber: number;
}

export interface OcrEngine {
  readonly id: OcrEngineId;
  recognize(file: File, options: OcrRecognizeOptions): Promise<OcrResult>;
  terminate(): Promise<void>;
}