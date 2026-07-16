import './setup-env.js';
import { strict as assert } from 'assert';
import { processOCR } from './ocrService.js';

global.File = class File {
  constructor(parts, name, options) {
    this.name = name;
    this.type = options?.type || '';
  }
};
global.FileReader = class FileReader {
  readAsDataURL() {
    this.result = 'data:image/jpeg;base64,mockbase64';
    setTimeout(() => this.onload(), 0);
  }
};

let fetchCallCount = 0;
let fetchMockBehavior = [];

// Intercept console.log and console.error to check for API keys
let logMessages = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const captureLog = (...args) => logMessages.push(args.join(' '));
console.log = captureLog;
console.error = captureLog;

global.fetch = async (url, options) => {
  fetchCallCount++;
  
  if (url.includes('/api/ocr-space')) {
    const behavior = fetchMockBehavior.shift();
    return {
      ok: true,
      json: async () => ({ text: "OCR Space Text" })
    };
  }

  const behavior = fetchMockBehavior.shift();
  if (!behavior) throw new Error("No fetch mock behavior defined");
  
  // Fake delay if specified
  if (behavior.delay) {
    await new Promise(r => setTimeout(r, behavior.delay));
  }

  // Check if aborted
  if (options && options.signal && options.signal.aborted) {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  }
  
  return {
    ok: behavior.status === 200,
    status: behavior.status,
    json: async () => behavior.json,
    text: async () => JSON.stringify(behavior.json || {})
  };
};

async function simulateScannerPageProcessing(pages, abortController = null) {
  let geminiCalls = 0;
  let ocrSpaceCalls = 0;
  let results = [];
  let error = null;
  let cancelled = false;

  for (let i = 0; i < pages.length; i++) {
    const originalFetchCount = fetchCallCount;
    try {
      if (abortController?.signal?.aborted) {
        throw new Error("Aborted before process"); // simulate check before process
      }
      
      const signal = abortController ? abortController.signal : undefined;
      const result = await processOCR(
        new File([''], 'test.jpg'), 
        'super-secret-api-key-12345', 
        'gemini-1.5-pro',
        { signal }
      );
      results.push(result);
      geminiCalls += (fetchCallCount - originalFetchCount);
    } catch (e) {
      geminiCalls += (fetchCallCount - originalFetchCount);
      if (e.code === 'RECITATION_BLOCKED_AFTER_RETRY' || e.code === 'CONTENT_BLOCKED') {
        const ocrFetchStart = fetchCallCount;
        try {
          const ocrResp = await fetch('/api/ocr-space');
          const ocrData = await ocrResp.json();
          results.push(ocrData.text);
        } catch (fallbackErr) {
          error = fallbackErr;
        }
        ocrSpaceCalls += (fetchCallCount - ocrFetchStart);
      } else {
        error = e;
        if (e.name === 'AbortError') cancelled = true;
        break; // Stop batch on unhandled error (like 503)
      }
    }
  }

  return { geminiCalls, ocrSpaceCalls, results, error, cancelled };
}

async function runTests() {
  originalConsoleLog("=== RUNNING RETRY TESTS ===");
  let passed = 0;
  let failed = 0;

  const reset = () => {
    fetchCallCount = 0;
    fetchMockBehavior = [];
    logMessages = [];
  };

  // A. 503 rồi success
  try {
    reset();
    fetchMockBehavior.push(
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 200, json: { candidates: [{ content: { parts: [{ text: "Success after 503" }] } }] } }
    );
    const { geminiCalls, results, error } = await simulateScannerPageProcessing([{}]);
    assert.equal(geminiCalls, 2);
    assert.equal(results[0], "Success after 503");
    assert.equal(error, null);
    originalConsoleLog("✅ A. 503 then success -> Retry successful.");
    passed++;
  } catch(e) {
    originalConsoleError("❌ A Failed:", e.message);
    failed++;
  }

  // B. 503, 503 rồi success
  try {
    reset();
    fetchMockBehavior.push(
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 200, json: { candidates: [{ content: { parts: [{ text: "Success after two 503s" }] } }] } }
    );
    const { geminiCalls, results, error } = await simulateScannerPageProcessing([{}]);
    assert.equal(geminiCalls, 3);
    assert.equal(results[0], "Success after two 503s");
    assert.equal(error, null);
    originalConsoleLog("✅ B. 503, 503 then success -> Exponential delays worked.");
    passed++;
  } catch(e) {
    originalConsoleError("❌ B Failed:", e.message);
    failed++;
  }

  // C. 503 sau toàn bộ retry -> dừng, không gọi OCR.space
  try {
    reset();
    fetchMockBehavior.push(
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 503, json: { error: { message: "Service Unavailable" } } } // 4th attempt fails
    );
    const { geminiCalls, ocrSpaceCalls, error } = await simulateScannerPageProcessing([{}]);
    assert.equal(geminiCalls, 4); // 1 initial + 3 retries
    assert.equal(ocrSpaceCalls, 0); // No fallback!
    assert.ok(error.message.includes("Gemini đang tạm thời quá tải. Vui lòng chờ một lát rồi thử lại."));
    originalConsoleLog("✅ C. 503 exhausted -> Returns friendly error, no OCR.space fallback.");
    passed++;
  } catch(e) {
    originalConsoleError("❌ C Failed:", e.message);
    failed++;
  }

  // D. Abort trong lúc chờ -> dừng ngay, không gửi request tiếp
  try {
    reset();
    fetchMockBehavior.push(
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 200, delay: 5000, json: { candidates: [] } } // second request, but we abort it
    );
    const ac = new AbortController();
    
    // Abort after a small delay (during retry wait)
    setTimeout(() => ac.abort(), 500);

    const { geminiCalls, error, cancelled } = await simulateScannerPageProcessing([{}], ac);
    assert.ok(cancelled);
    originalConsoleLog("✅ D. Abort during wait -> stopped immediately.");
    passed++;
  } catch(e) {
    originalConsoleError("❌ D Failed:", e.message);
    failed++;
  }

  // E. HTTP 400/401/403/404 -> không áp dụng retry 503
  try {
    reset();
    fetchMockBehavior.push(
      { status: 400, json: { error: { message: "Bad Request" } } }
    );
    const { geminiCalls, error } = await simulateScannerPageProcessing([{}]);
    assert.equal(geminiCalls, 1);
    assert.ok(error.message.includes("Bad Request"));
    assert.ok(!error.message.includes("quá tải"));
    originalConsoleLog("✅ E. 400 Bad Request -> No retry applied.");
    passed++;
  } catch(e) {
    originalConsoleError("❌ E Failed:", e.message);
    failed++;
  }

  // F. Batch nhiều trang, trang đầu thất bại 503 sau toàn bộ retry -> không tiếp tục các trang còn lại
  try {
    reset();
    // Only 4 behavior items provided. If it continues to page 2, fetch mock will throw Error.
    fetchMockBehavior.push(
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 503, json: { error: { message: "Service Unavailable" } } } 
    );
    const { geminiCalls, error } = await simulateScannerPageProcessing([{}, {}, {}]);
    assert.equal(geminiCalls, 4); // Only page 1 tried
    assert.ok(error.message.includes("tạm thời quá tải"));
    originalConsoleLog("✅ F. Batch stops on exhausted 503 -> Remaining pages untouched.");
    passed++;
  } catch(e) {
    originalConsoleError("❌ F Failed:", e.message);
    failed++;
  }

  // G. Log không chứa chuỗi API Key đầy đủ.
  try {
    reset();
    fetchMockBehavior.push(
      { status: 503, json: { error: { message: "Service Unavailable" } } },
      { status: 200, json: { candidates: [{ content: { parts: [{ text: "OK" }] } }] } }
    );
    await simulateScannerPageProcessing([{}]);
    
    // Check all intercepted logs
    const fullLog = logMessages.join('\n');
    assert.ok(!fullLog.includes('super-secret-api-key-12345'), "API key leaked in logs!");
    assert.ok(fullLog.includes('****2345'), "Sanitized key not found in logs!");
    originalConsoleLog("✅ G. Logs sanitized -> API key not leaked.");
    passed++;
  } catch(e) {
    originalConsoleError("❌ G Failed:", e.message);
    failed++;
  }

  originalConsoleLog(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}

runTests();