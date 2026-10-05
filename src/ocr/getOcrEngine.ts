import type { OcrEngine, OcrEngineId } from "./types";
import { TesseractOcrEngine } from "./tesseract/TesseractOcrEngine";

const engines: Partial<Record<OcrEngineId, OcrEngine>> = {};

export function getOcrEngine(id: OcrEngineId): OcrEngine {
  if (id === "tesseract") {
    if (!engines.tesseract) {
      engines.tesseract = new TesseractOcrEngine();
    }
    return engines.tesseract;
  }
  throw new Error(
    `Engine "${id}" chưa được đăng ký ở bước A. ` +
    `Gemini sẽ được nối ở bước B.`,
  );
}