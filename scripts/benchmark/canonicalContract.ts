/**
 * LEXOCR OCR model benchmark — canonical OCR contract (single source of truth).
 *
 * This file freezes the PRIMARY production OCR contract from
 * `src/components/OcrScanner.tsx` (the `makeRequest` function) so the
 * benchmark compares `gemini-2.5-flash` vs `gemini-2.5-flash-lite` with ONLY
 * the model identifier differing.
 *
 * The drift guard in `canonicalContract.test.ts` asserts byte-equality of these
 * constants against the production source file. If the production contract
 * changes, that test fails and the harness refuses to run (PR_CONTRACT_DRIFT).
 *
 * IMPORTANT: the PRIMARY path does NOT use `systemInstruction` and does NOT
 * use `responseMimeType`. The benchmark must not add them.
 */
import type { CanonicalContract } from "./types";

/** Endpoint URL template. `{modelName}` is substituted at request time. */
export const CANONICAL_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models/{modelName}:generateContent?key={apiKey}";

/** Initial prompt text — byte-identical to `OcrScanner.tsx` line 1166. */
export const CANONICAL_PROMPT_INITIAL =
  "Trích xuất chính xác 100% toàn bộ nội dung văn bản có trong hình ảnh này sang tiếng Việt. Giữ nguyên định dạng, không thêm bớt bất kỳ từ ngữ hay lời giải thích nào.";

/**
 * Recitation-retry prompt prefix — byte-identical to `OcrScanner.tsx`
 * lines 1168–1169 (the two lines prepended to the initial prompt).
 */
export const CANONICAL_PROMPT_RECITATION_PREFIX =
  "Chỉ trích xuất văn bản nhìn thấy trong hình ảnh/tài liệu. Không bổ sung, không suy luận, không tái tạo nội dung ngoài ảnh. Nếu không chắc, giữ nguyên ký tự quan sát được.\n" +
  "Only extract visible text from the provided image/document. Do not add, infer, or reproduce any content outside the image. If unsure, keep the observed characters exactly as they are.\n";

/** generationConfig — byte-identical to `OcrScanner.tsx` lines 1183–1187. */
export const CANONICAL_GENERATION_CONFIG = {
  temperature: 0.0,
  topP: 0.95,
  candidateCount: 1,
} as const;

/**
 * safetySettings — byte-identical to `OcrScanner.tsx` lines 1188–1205.
 * All four categories use BLOCK_NONE.
 */
export const CANONICAL_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
] as const;

/**
 * AI-intro line strip regex — equivalent to `OcrScanner.tsx` line 1062.
 * The first line is removed only when it matches this pattern AND ends with ':'.
 */
export const CANONICAL_AI_INTRO_REGEX =
  /^(Dưới đây là|Văn bản đã được|Kết quả|Đây là văn bản)/i;

/** Transient-error retry budget, mirrors `OcrScanner.tsx` (maxRetries=1 for generic, 3 for 503). */
export const CANONICAL_MAX_TRANSIENT_RETRIES = 3;
export const CANONICAL_TRANSIENT_DELAY_BASE_MS = 2500;
export const CANONICAL_RATE_LIMIT_MAX_RETRIES = 1;
export const CANONICAL_RATE_LIMIT_DELAY_BASE_MS = 2500;

/** Response contract field — mirrors `OcrScanner.tsx` line 1056. */
export const CANONICAL_RESPONSE_TEXT_PATH = "candidates[0].content.parts[0].text";

/**
 * The locked canonical contract as a single object. Consumed by the harness
 * to build the request body and to strip post-processing artifacts exactly as
 * production does.
 */
export const CANONICAL_CONTRACT: CanonicalContract = {
  endpoint: CANONICAL_ENDPOINT,
  promptInitial: CANONICAL_PROMPT_INITIAL,
  promptRecitationPrefix: CANONICAL_PROMPT_RECITATION_PREFIX,
  generationConfig: CANONICAL_GENERATION_CONFIG,
  safetySettings: CANONICAL_SAFETY_SETTINGS as CanonicalContract["safetySettings"],
  aiIntroRegex: CANONICAL_AI_INTRO_REGEX,
  maxTransientRetries: CANONICAL_MAX_TRANSIENT_RETRIES,
  transientDelayBaseMs: CANONICAL_TRANSIENT_DELAY_BASE_MS,
  maxRateLimitRetries: CANONICAL_RATE_LIMIT_MAX_RETRIES,
  rateLimitDelayBaseMs: CANONICAL_RATE_LIMIT_DELAY_BASE_MS,
};

/**
 * Build the canonical request body. ONLY the model identifier differs between
 * the two benchmarked models; everything else is byte-identical.
 */
export function buildCanonicalRequestBody(
  base64Data: string,
  mimeType: string,
  opts?: { useRecitationPrompt?: boolean }
): Record<string, unknown> {
  const promptText = opts?.useRecitationPrompt
    ? CANONICAL_PROMPT_RECITATION_PREFIX + CANONICAL_PROMPT_INITIAL
    : CANONICAL_PROMPT_INITIAL;

  return {
    contents: [
      {
        parts: [
          { text: promptText },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: { ...CANONICAL_GENERATION_CONFIG },
    safetySettings: CANONICAL_SAFETY_SETTINGS.map((s) => ({ ...s })),
  };
}

/**
 * Substitute the model name and API key into the canonical endpoint template.
 */
export function buildCanonicalEndpoint(modelName: string, apiKey: string): string {
  return CANONICAL_ENDPOINT
    .replace("{modelName}", encodeURIComponent(modelName))
    .replace("{apiKey}", apiKey);
}

/**
 * Strip the AI-intro first line exactly as production does (`OcrScanner.tsx`
 * lines 1059–1067): the first line is dropped when it matches
 * `CANONICAL_AI_INTRO_REGEX` AND ends with ':'.
 */
export function stripAiIntroLine(text: string): string {
  const lines = text.split("\n");
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    const isAiIntro =
      CANONICAL_AI_INTRO_REGEX.test(firstLine) && firstLine.endsWith(":");
    if (isAiIntro) {
      lines.shift();
    }
  }
  return lines.join("\n").trim();
}