/**
 * Tests for the LEXOCR benchmark telemetry helper.
 * Covers the locked contract from the plan review:
 *   - default OFF; only VITE_LEXOCR_BENCH_TELEMETRY / LEXOCR_BENCH_TELEMETRY
 *     can enable; NO query/header enablement.
 *   - whitelist serialization (no extra fields, no key fragments).
 *   - requestId from crypto.randomUUID() only.
 *   - telemetry failures never fail the caller.
 *   - summary aggregates are correct.
 *   - extractGeminiUsageMetadata only reads documented fields.
 * Run with: npx tsx shared/ocrTelemetry.test.ts
 */
import {
  createBenchmarkRun,
  extractGeminiUsageMetadata,
  resolveBenchTelemetryEnabled,
  type OcrTelemetryEvent,
} from "./ocrTelemetry";

let pass = 0;
let fail = 0;
const failures: string[] = [];
function assert(condition: unknown, name: string): void {
  if (condition) { pass++; return; }
  fail++; failures.push(name); console.error(`FAIL: ${name}`);
}
function eq(actual: unknown, expected: unknown, name: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  fail++; failures.push(name);
  console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`);
}

const captured: string[] = [];
const origLog = console.log;
console.log = (msg: unknown, ...rest: unknown[]) => {
  if (typeof msg === "string") captured.push(msg);
  else captured.push(JSON.stringify(msg));
  void rest;
};

// ---------- resolveBenchTelemetryEnabled (Tests 15-17, 19) ----------
{
  eq(resolveBenchTelemetryEnabled(undefined), false, "Test 15: default with no env is OFF");
  eq(resolveBenchTelemetryEnabled({}), false, "Test 15b: empty env object is OFF");
  eq(resolveBenchTelemetryEnabled({ LEXOCR_BENCH_TELEMETRY: "TRUE" }), false, "Test 16: case-sensitive (not 'TRUE')");
  eq(resolveBenchTelemetryEnabled({ LEXOCR_BENCH_TELEMETRY: "1" }), false, "Test 16b: only literal 'true' enables");
  eq(resolveBenchTelemetryEnabled({ LEXOCR_BENCH_TELEMETRY: "true" }), true, "Test 16c: server env enables");
  eq(resolveBenchTelemetryEnabled({ VITE_LEXOCR_BENCH_TELEMETRY: "true" }), true, "Test 17: client env enables");
  eq(resolveBenchTelemetryEnabled("not-an-object"), false, "Test 17b: non-object runtime env is OFF");
  eq(resolveBenchTelemetryEnabled(null), false, "Test 17c: null runtime env is OFF");
  eq(
    resolveBenchTelemetryEnabled({
      "x-enable-telemetry": "true", "telemetry": "true", "?enable=1": "true", "authorization": "Bearer xyz",
    }),
    false,
    "Test 19: no user-controllable key can enable telemetry"
  );
}

// ---------- extractGeminiUsageMetadata (Test 1) ----------
{
  eq(extractGeminiUsageMetadata(null), {
    promptTokenCount: null, candidatesTokenCount: null, totalTokenCount: null,
    cachedContentTokenCount: null, thoughtsTokenCount: null,
  }, "Test 1a: null input yields all-null");
  eq(extractGeminiUsageMetadata({ usageMetadata: null }), {
    promptTokenCount: null, candidatesTokenCount: null, totalTokenCount: null,
    cachedContentTokenCount: null, thoughtsTokenCount: null,
  }, "Test 1b: null usageMetadata yields all-null");
  eq(
    extractGeminiUsageMetadata({ usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 34, totalTokenCount: 46, cachedContentTokenCount: 7, thoughtsTokenCount: 3 } }),
    { promptTokenCount: 12, candidatesTokenCount: 34, totalTokenCount: 46, cachedContentTokenCount: 7, thoughtsTokenCount: 3 },
    "Test 1c: full usageMetadata is parsed"
  );
  eq(
    extractGeminiUsageMetadata({ usageMetadata: { promptTokenCount: 5, SECRET_KEY: "AIzaSyABC", text: "leaked-ocr-text" } }),
    { promptTokenCount: 5, candidatesTokenCount: null, totalTokenCount: null, cachedContentTokenCount: null, thoughtsTokenCount: null },
    "Test 1d: only documented fields read; junk ignored"
  );
  eq(
    extractGeminiUsageMetadata({ usageMetadata: { promptTokenCount: -1, candidatesTokenCount: "x" } }),
    { promptTokenCount: null, candidatesTokenCount: null, totalTokenCount: null, cachedContentTokenCount: null, thoughtsTokenCount: null },
    "Test 1e: invalid token values become null"
  );
  eq(
    extractGeminiUsageMetadata({ usageMetadata: { totalTokenCount: 0 } }),
    { promptTokenCount: null, candidatesTokenCount: null, totalTokenCount: 0, cachedContentTokenCount: null, thoughtsTokenCount: null },
    "Test 1f: zero is kept"
  );
}

// ---------- createBenchmarkRun disabled (Test 2) ----------
{
  captured.length = 0;
  const run = createBenchmarkRun({ enabled: false });
  eq(run.enabled, false, "Test 2a: enabled=false propagated");
  eq(run.requestId, null, "Test 2b: disabled run has null requestId (lazy)");
  const ev: OcrTelemetryEvent = {
    requestId: null, pageIndex: 1, pageCount: 1, provider: "gemini",
    model: "gemini-2.5-flash", keyIndex: 0, attempt: 1, success: true,
    errorCategory: null, nextAction: "success", fallbackUsed: false,
    httpStatus: 200, imageSizeBytes: 1024, latencyMs: 100,
    promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30,
    cachedContentTokenCount: 0, thoughtsTokenCount: 0,
  };
  eq(run.recordAttempt(ev), false, "Test 2c: recordAttempt false when disabled");
  eq(run.emitSummary(), false, "Test 2d: emitSummary false when disabled");
  eq(captured.length, 0, "Test 2e: no console output when disabled");
}

// ---------- createBenchmarkRun enabled (Tests 3-5) ----------
{
  captured.length = 0;
  const run = createBenchmarkRun({ enabled: true });
  eq(run.enabled, true, "Test 3a: enabled=true propagated");
  assert(
    typeof run.requestId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(run.requestId),
    "Test 3b: requestId is a UUID from crypto.randomUUID()"
  );
  const ev: OcrTelemetryEvent = {
    requestId: run.requestId, pageIndex: 1, pageCount: 2, provider: "gemini",
    model: "gemini-2.5-flash", keyIndex: 0, attempt: 1, success: true,
    errorCategory: null, nextAction: "success", fallbackUsed: false,
    httpStatus: 200, imageSizeBytes: 1024, latencyMs: 120,
    promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30,
    cachedContentTokenCount: 0, thoughtsTokenCount: 0,
  };
  eq(run.recordAttempt(ev), true, "Test 4a: recordAttempt true on success");
  eq(captured.length, 1, "Test 4b: one line emitted");
  assert(captured[0].startsWith("[LEXOCR_BENCH] "), "Test 4c: event prefix correct");
  const parsed = JSON.parse(captured[0].replace("[LEXOCR_BENCH] ", ""));
  eq(parsed.requestId, run.requestId, "Test 4d: requestId present in payload");
  eq(parsed.keyIndex, 0, "Test 4e: keyIndex present (non-secret)");
  eq(parsed.model, "gemini-2.5-flash", "Test 4f: model present");
  const allowed = new Set([
    "requestId","pageIndex","pageCount","provider","model","keyIndex",
    "attempt","success","errorCategory","nextAction","fallbackUsed",
    "httpStatus","imageSizeBytes","latencyMs",
    "promptTokenCount","candidatesTokenCount","totalTokenCount",
    "cachedContentTokenCount","thoughtsTokenCount",
  ]);
  const extra = Object.keys(parsed).filter((k) => !allowed.has(k));
  eq(extra, [], "Test 5: only allowlisted keys appear in serialized event");
}

// ---------- Whitelist strips secrets/keys/text (Test 6) ----------
{
  captured.length = 0;
  const run = createBenchmarkRun({ enabled: true });
  const dirty = {
    requestId: run.requestId, pageIndex: 1, pageCount: 1, provider: "gemini" as const,
    model: "gemini-2.5-flash", keyIndex: 0, attempt: 1, success: true,
    errorCategory: null, nextAction: "success" as const, fallbackUsed: false,
    httpStatus: 200, imageSizeBytes: 1024, latencyMs: 100,
    promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30,
    cachedContentTokenCount: 0, thoughtsTokenCount: 0,
    apiKey: "AIzaSyABCDEFG", keyFragment: "ABCDEFG", text: "SENSITIVE_OCR_TEXT",
    base64: "AAAA", fileName: "secret.pdf", uid: "u123", email: "a@b.c",
    prompt: "PROMPT_LEAK", raw: "RAW", authorization: "Bearer x",
  } as unknown as OcrTelemetryEvent;
  run.recordAttempt(dirty);
  const parsed = JSON.parse(captured[0].replace("[LEXOCR_BENCH] ", ""));
  const forbidden = ["apiKey","keyFragment","text","base64","fileName","uid","email","prompt","raw","authorization"];
  for (const f of forbidden) {
    assert(!(f in parsed), `Test 6: forbidden field "${f}" is NOT in serialized output`);
  }
}

// ---------- Summary aggregates (Test 7) ----------
{
  const run = createBenchmarkRun({ enabled: true });
  const base: Omit<OcrTelemetryEvent, "pageIndex"|"attempt"|"nextAction"|"success"|"latencyMs"|"promptTokenCount"|"candidatesTokenCount"|"totalTokenCount"|"provider"> = {
    requestId: null, pageCount: 2, model: "gemini-2.5-flash", keyIndex: 0,
    errorCategory: null, fallbackUsed: false, httpStatus: 200, imageSizeBytes: 1024,
    cachedContentTokenCount: 0, thoughtsTokenCount: 0,
  };
  run.recordAttempt({ ...base, pageIndex: 1, provider: "gemini", attempt: 1, success: false, nextAction: "retry_same_key", latencyMs: 100, promptTokenCount: 5, candidatesTokenCount: 0, totalTokenCount: 5, httpStatus: 503, errorCategory: "transient" });
  run.recordAttempt({ ...base, pageIndex: 1, provider: "gemini", attempt: 2, success: true, nextAction: "success", latencyMs: 200, promptTokenCount: 5, candidatesTokenCount: 10, totalTokenCount: 15, httpStatus: 200 });
  run.recordAttempt({ ...base, pageIndex: 1, provider: "ocr-space", keyIndex: -1, attempt: 1, success: true, nextAction: "success", latencyMs: 300, promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0, httpStatus: 200 });
  run.recordAttempt({ ...base, pageIndex: 2, provider: "gemini", attempt: 1, success: false, nextAction: "rotate_key", latencyMs: 50, promptTokenCount: 1, candidatesTokenCount: 0, totalTokenCount: 1, httpStatus: 429, errorCategory: "rate_limited" });
  run.recordAttempt({ ...base, pageIndex: 2, provider: "gemini", keyIndex: 1, attempt: 1, success: true, nextAction: "success", latencyMs: 150, promptTokenCount: 2, candidatesTokenCount: 4, totalTokenCount: 6, httpStatus: 200 });

  const summary = run.computeSummary();
  eq(summary.pagesProcessed, 2, "Test 7a: pagesProcessed = 2");
  eq(summary.successfulPages, 2, "Test 7b: successfulPages = 2");
  eq(summary.failedPages, 0, "Test 7c: failedPages = 0");
  eq(summary.geminiRequests, 4, "Test 7d: 4 gemini events");
  eq(summary.retries, 1, "Test 7e: 1 retry_same_key");
  eq(summary.keyRotations, 1, "Test 7f: 1 rotate_key");
  eq(summary.fallbackCount, 1, "Test 7g: 1 ocr-space event");
  eq(summary.totalPromptTokens, 13, "Test 7h: totalPromptTokens = 13");
  eq(summary.totalCandidatesTokens, 14, "Test 7i: totalCandidatesTokens = 14");
  eq(summary.totalTokens, 27, "Test 7j: totalTokens = 27");
  eq(summary.totalLatencyMs, 800, "Test 7k: totalLatencyMs = 800");
  eq(summary.avgTokensPerSuccessfulPage, 13.5, "Test 7l: avgTokensPerSuccessfulPage");
  eq(summary.avgLatencyMsPerPage, 400, "Test 7m: avgLatencyMsPerPage");
}

// ---------- Summary emit (Test 8) ----------
{
  captured.length = 0;
  const run = createBenchmarkRun({ enabled: true });
  const ev: OcrTelemetryEvent = {
    requestId: null, pageIndex: 1, pageCount: 1, provider: "gemini",
    model: "gemini-2.5-flash", keyIndex: 0, attempt: 1, success: true,
    errorCategory: null, nextAction: "success", fallbackUsed: false,
    httpStatus: 200, imageSizeBytes: 1, latencyMs: 50,
    promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2,
    cachedContentTokenCount: 0, thoughtsTokenCount: 0,
  };
  run.recordAttempt(ev);
  eq(run.emitSummary(), true, "Test 8a: emitSummary true on success");
  eq(captured.length, 2, "Test 8b: 1 event + 1 summary");
  assert(captured[1].startsWith("[LEXOCR_BENCH_SUMMARY] "), "Test 8c: summary prefix correct");
  const parsed = JSON.parse(captured[1].replace("[LEXOCR_BENCH_SUMMARY] ", ""));
  eq(parsed.requestId, run.requestId, "Test 8d: summary requestId matches run");
  eq(parsed.pagesProcessed, 1, "Test 8e: summary pagesProcessed = 1");
}

// ---------- Telemetry failure must not throw (Test 18) ----------
{
  const run = createBenchmarkRun({ enabled: true });
  const circular: any = {};
  circular.self = circular;
  const bad = { ...circular, requestId: run.requestId, pageIndex: 1, pageCount: 1,
    provider: "gemini", model: "x", keyIndex: 0, attempt: 1, success: true,
    errorCategory: null, nextAction: "success", fallbackUsed: false,
    httpStatus: 200, imageSizeBytes: 1, latencyMs: 1, promptTokenCount: 1,
    candidatesTokenCount: 1, totalTokenCount: 1, cachedContentTokenCount: 0, thoughtsTokenCount: 0,
  } as unknown as OcrTelemetryEvent;
  let ok = false;
  try { run.recordAttempt(bad); ok = true; } catch { ok = false; }
  assert(ok, "Test 18: recordAttempt never throws on garbage input");
}

console.log = origLog;
console.log(`\nPASS ${pass}`);
console.log(`FAIL ${fail}`);
if (fail > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(" - " + f);
  process.exit(1);
}
process.exit(0);




