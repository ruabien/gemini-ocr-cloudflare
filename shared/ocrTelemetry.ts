/**
 * LEXOCR benchmark telemetry — shared, environment-agnostic helper.
 *
 * Covers BOTH Gemini execution paths with one implementation:
 *   - client BYOK path (src/components/OcrScanner.tsx, browser)
 *   - server Pages Function path (functions/api/ocr/process.ts, workerd)
 *
 * DESIGN CONTRACT (locked by plan review):
 * - GATED, not always-on: default OFF. Enablement ONLY via explicit
 *   environment configuration (client: VITE_LEXOCR_BENCH_TELEMETRY=true at
 *   build time; server: LEXOCR_BENCH_TELEMETRY=true Pages env). There is NO
 *   query-parameter, header, or any user-controllable enablement.
 * - One gate per run governs BOTH per-attempt events AND the summary event.
 * - Whitelist serialization: only allowlisted fields can reach console.
 * - No OCR text, no prompts, no base64, no file names, no uid/email, no API
 *   keys or key fragments, no credentials. Key identity is a non-secret
 *   ephemeral `keyIndex` (0..n, -1 = OCR.space/none) only.
 * - Telemetry failures must NEVER fail OCR: every emit is try/catch-wrapped.
 * - requestId uses crypto.randomUUID() only. No Math.random fallback.
 *   Correlation-only — never an auth/security identifier.
 * - Sink: structured console JSON lines. No DB, no remote sink, no Firestore.
 */

export interface GeminiUsageMetadata {
  promptTokenCount: number | null;
  candidatesTokenCount: number | null;
  totalTokenCount: number | null;
  cachedContentTokenCount: number | null;
  thoughtsTokenCount: number | null;
}

export type OcrTelemetryNextAction =
  | "success"
  | "retry_same_key"
  | "rotate_key"
  | "fallback"
  | "abort";

export type OcrTelemetryProvider = "gemini" | "ocr-space" | "none";

export interface OcrTelemetryEvent {
  requestId: string | null;
  pageIndex: number;
  pageCount: number;
  provider: OcrTelemetryProvider;
  model: string | null;
  keyIndex: number;
  attempt: number;
  success: boolean;
  errorCategory: string | null;
  nextAction: OcrTelemetryNextAction;
  fallbackUsed: boolean;
  httpStatus: number | null;
  imageSizeBytes: number | null;
  latencyMs: number | null;
  promptTokenCount: number | null;
  candidatesTokenCount: number | null;
  totalTokenCount: number | null;
  cachedContentTokenCount: number | null;
  thoughtsTokenCount: number | null;
}

export interface OcrBenchmarkSummary {
  requestId: string | null;
  pagesProcessed: number;
  successfulPages: number;
  failedPages: number;
  geminiRequests: number;
  retries: number;
  keyRotations: number;
  fallbackCount: number;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  totalTokens: number;
  totalLatencyMs: number;
  avgTokensPerSuccessfulPage: number | null;
  avgLatencyMsPerPage: number | null;
}

const EVENT_PREFIX = "[LEXOCR_BENCH]";
const SUMMARY_PREFIX = "[LEXOCR_BENCH_SUMMARY]";

const ALLOWED_EVENT_KEYS: ReadonlyArray<keyof OcrTelemetryEvent> = [
  "requestId", "pageIndex", "pageCount", "provider", "model", "keyIndex",
  "attempt", "success", "errorCategory", "nextAction", "fallbackUsed",
  "httpStatus", "imageSizeBytes", "latencyMs",
  "promptTokenCount", "candidatesTokenCount", "totalTokenCount",
  "cachedContentTokenCount", "thoughtsTokenCount",
];

const ALLOWED_SUMMARY_KEYS: ReadonlyArray<keyof OcrBenchmarkSummary> = [
  "requestId", "pagesProcessed", "successfulPages", "failedPages",
  "geminiRequests", "retries", "keyRotations", "fallbackCount",
  "totalPromptTokens", "totalCandidatesTokens", "totalTokens",
  "totalLatencyMs", "avgTokensPerSuccessfulPage", "avgLatencyMsPerPage",
];

const FLAG_VALUE = "true";

/**
 * Resolve the benchmark telemetry gate. Default: DISABLED.
 * Only these inputs can enable telemetry:
 *   - client (build time): VITE_LEXOCR_BENCH_TELEMETRY === "true"
 *   - server (per request): LEXOCR_BENCH_TELEMETRY === "true"
 * Tests may pass an explicit env object. Anything else yields false.
 */
export function resolveBenchTelemetryEnabled(runtimeEnv?: unknown): boolean {
  try {
    if (runtimeEnv !== undefined && runtimeEnv !== null) {
      if (typeof runtimeEnv !== "object") return false;
      const rec = runtimeEnv as Record<string, unknown>;
      return rec.LEXOCR_BENCH_TELEMETRY === FLAG_VALUE ||
             rec.VITE_LEXOCR_BENCH_TELEMETRY === FLAG_VALUE;
    }
    const meta = (typeof import.meta !== "undefined"
      ? (import.meta as unknown as { env?: Record<string, unknown> }).env
      : undefined);
    return !!meta && (meta.VITE_LEXOCR_BENCH_TELEMETRY === FLAG_VALUE ||
                      meta.LEXOCR_BENCH_TELEMETRY === FLAG_VALUE);
  } catch {
    return false;
  }
}

function generateRequestId(): string | null {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return null;
  } catch {
    return null;
  }
}

function nowMs(): number {
  return Date.now();
}

function sanitizeTokenCount(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (value < 0) return null;
  return value;
}

export function extractGeminiUsageMetadata(responseData: unknown): GeminiUsageMetadata {
  const empty: GeminiUsageMetadata = {
    promptTokenCount: null,
    candidatesTokenCount: null,
    totalTokenCount: null,
    cachedContentTokenCount: null,
    thoughtsTokenCount: null,
  };
  try {
    if (!responseData || typeof responseData !== "object") return empty;
    const usage = (responseData as Record<string, unknown>).usageMetadata;
    if (!usage || typeof usage !== "object") return empty;
    const rec = usage as Record<string, unknown>;
    return {
      promptTokenCount: sanitizeTokenCount(rec.promptTokenCount),
      candidatesTokenCount: sanitizeTokenCount(rec.candidatesTokenCount),
      totalTokenCount: sanitizeTokenCount(rec.totalTokenCount),
      cachedContentTokenCount: sanitizeTokenCount(rec.cachedContentTokenCount),
      thoughtsTokenCount: sanitizeTokenCount(rec.thoughtsTokenCount),
    };
  } catch {
    return empty;
  }
}

function serializeWhitelisted(
  source: Record<string, unknown>,
  allowedKeys: ReadonlyArray<string>
): Record<string, unknown> | null {
  try {
    if (!source || typeof source !== "object") return null;
    const out: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        out[key] = source[key];
      }
    }
    return out;
  } catch {
    return null;
  }
}

function safeJsonStringify(value: unknown): string | null {
  try { return JSON.stringify(value); } catch { return null; }
}

function emitConsoleLine(prefix: string, payload: Record<string, unknown> | null): boolean {
  try {
    if (!payload) return false;
    const line = safeJsonStringify(payload);
    if (line === null) return false;
    console.log(`${prefix} ${line}`);
    return true;
  } catch {
    return false;
  }
}

export interface CreateBenchmarkRunOptions {
  enabled?: boolean;
  runtimeEnv?: unknown;
}

export interface BenchmarkRun {
  requestId: string | null;
  enabled: boolean;
  recordAttempt: (event: OcrTelemetryEvent) => boolean;
  emitSummary: () => boolean;
  computeSummary: () => OcrBenchmarkSummary;
}

/** Create a per-OCR-run benchmark telemetry accumulator. */
export function createBenchmarkRun(options?: CreateBenchmarkRunOptions): BenchmarkRun {
  const enabled = options && typeof options.enabled === "boolean"
    ? options.enabled
    : resolveBenchTelemetryEnabled(options?.runtimeEnv);

  const requestId = enabled ? generateRequestId() : null;
  const events: OcrTelemetryEvent[] = [];

  const recordAttempt = (event: OcrTelemetryEvent): boolean => {
    if (!enabled) return false;
    try {
      events.push(event);
      const withRunId: OcrTelemetryEvent = { ...event, requestId };
      const payload = serializeWhitelisted(
        withRunId as unknown as Record<string, unknown>,
        ALLOWED_EVENT_KEYS as unknown as ReadonlyArray<string>
      );
      return emitConsoleLine(EVENT_PREFIX, payload);
    } catch {
      return false;
    }
  };

  const computeSummary = (): OcrBenchmarkSummary => {
    const distinctPages = new Set(events.map((e) => e.pageIndex));
    const pagesProcessed = distinctPages.size;
    const failedPages = Array.from(distinctPages).filter((p) => {
      const pageEvents = events.filter((e) => e.pageIndex === p);
      const last = pageEvents[pageEvents.length - 1];
      return !last || !last.success;
    }).length;
    const successfulPages = Math.max(0, pagesProcessed - failedPages);

    const sum = (pick: (e: OcrTelemetryEvent) => number | null): number =>
      events.reduce((acc, e) => acc + (typeof pick(e) === "number" ? (pick(e) as number) : 0), 0);

    const geminiRequests = events.filter((e) => e.provider === "gemini").length;
    const retries = events.filter((e) => e.nextAction === "retry_same_key").length;
    const keyRotations = events.filter((e) => e.nextAction === "rotate_key").length;
    const fallbackCount = events.filter(
      (e) => e.fallbackUsed || e.provider === "ocr-space"
    ).length;
    const totalPromptTokens = sum((e) => e.promptTokenCount);
    const totalCandidatesTokens = sum((e) => e.candidatesTokenCount);
    const totalTokens = sum((e) => e.totalTokenCount);
    const totalLatencyMs = sum((e) => e.latencyMs);

    return {
      requestId,
      pagesProcessed,
      successfulPages,
      failedPages,
      geminiRequests,
      retries,
      keyRotations,
      fallbackCount,
      totalPromptTokens,
      totalCandidatesTokens,
      totalTokens,
      totalLatencyMs,
      avgTokensPerSuccessfulPage: successfulPages > 0 && totalTokens > 0
        ? Math.round((totalTokens / successfulPages) * 100) / 100
        : null,
      avgLatencyMsPerPage: pagesProcessed > 0 && totalLatencyMs > 0
        ? Math.round((totalLatencyMs / pagesProcessed) * 100) / 100
        : null,
    };
  };

  const emitSummary = (): boolean => {
    if (!enabled) return false;
    try {
      const summary = computeSummary();
      const payload = serializeWhitelisted(
        summary as unknown as Record<string, unknown>,
        ALLOWED_SUMMARY_KEYS as unknown as ReadonlyArray<string>
      );
      return emitConsoleLine(SUMMARY_PREFIX, payload);
    } catch {
      return false;
    }
  };

  return { requestId, enabled, recordAttempt, emitSummary, computeSummary };
}

export function telemetryNow(): number {
  return nowMs();
}


