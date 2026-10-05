import { createWorker } from "tesseract.js";
import type { OcrEngine, OcrProgress, OcrRecognizeOptions, OcrResult } from "../types";
import {
  normalizeTesseractLanguage,
  TESSERACT_ASSETS,
  TESSERACT_GZIP,
  TESSERACT_WORKER_BLOB_URL,
} from "./tesseractAssets";

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

function createAbortError(): Error {
  const error = new Error("Đã hủy quá trình bóc tách.");
  error.name = "AbortError";
  return error;
}

export class TesseractOcrEngine implements OcrEngine {
  readonly id = "tesseract" as const;

  private worker: TesseractWorker | null = null;
  private currentAbort: AbortController | null = null;
  private onProgress: ((progress: OcrProgress) => void) | undefined;

  private async ensureWorker(language: string): Promise<TesseractWorker> {
    if (this.worker) {
      return this.worker;
    }

    this.worker = await createWorker(language, undefined, {
      workerPath: TESSERACT_ASSETS.workerPath,
      corePath: TESSERACT_ASSETS.corePath,
      langPath: TESSERACT_ASSETS.langPath,
      gzip: TESSERACT_GZIP,
      workerBlobURL: TESSERACT_WORKER_BLOB_URL,
      logger: ({ status, progress }) => {
        this.onProgress?.({ status, progress });
      },
    });

    return this.worker;
  }

  async recognize(file: File, options: OcrRecognizeOptions): Promise<OcrResult> {
    if (options.signal?.aborted) {
      throw createAbortError();
    }

    const language = normalizeTesseractLanguage(options.language);
    this.onProgress = options.onProgress;
    this.currentAbort = new AbortController();

    const onExternalAbort = () => this.currentAbort?.abort();
    options.signal?.addEventListener("abort", onExternalAbort, { once: true });

    let abortPromise: Promise<never> | undefined;
    if (this.currentAbort.signal.aborted) {
      options.signal?.removeEventListener("abort", onExternalAbort);
      this.currentAbort = null;
      throw createAbortError();
    }

    abortPromise = new Promise<never>((_, reject) => {
      this.currentAbort?.signal.addEventListener(
        "abort",
        () => {
          void this.terminate();
          reject(createAbortError());
        },
        { once: true },
      );
    });

    try {
      const worker = await this.ensureWorker(language);
      const result = await Promise.race([worker.recognize(file), abortPromise]);

      return {
        text: result.data.text,
        pageNumber: options.pageNumber,
      };
    } finally {
      options.signal?.removeEventListener("abort", onExternalAbort);
      this.currentAbort = null;
      this.onProgress = undefined;
    }
  }

  async terminate(): Promise<void> {
    const worker = this.worker;
    this.worker = null;

    if (worker) {
      await worker.terminate();
    }
  }
}