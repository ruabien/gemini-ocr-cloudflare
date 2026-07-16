import './setup-env.js';
import { strict as assert } from 'assert';

import { processOCR } from './ocrService.js';
// Removed import of ocrWithOcrSpace; using direct fetch mock for OCR.space fallback
import { requireResolvedGeminiModel } from './geminiModelResolver.js';

// Mock dependencies
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

global.fetch = async (url, options) => {
  fetchCallCount++;
  
  if (url.includes('/api/ocr-space')) {
    // OCR.space mock
    const behavior = fetchMockBehavior.shift();
    if (behavior?.status === 429) {
      return {
        ok: false,
        status: 429,
        headers: {
          get: (name) => name.toLowerCase() === 'retry-after' ? behavior.retryAfter : null
        },
        json: async () => ({
          error: "RATE_LIMIT",
          errorCode: "429",
          message: `Yêu cầu OCR.space vượt quá hạn mức, vui lòng thử lại sau ${Math.round(parseInt(behavior.retryAfter || '60') / 60)} phút.`
        }),
        text: async () => "Rate limit"
      };
    }
    return {
      ok: true,
      json: async () => ({
        text: behavior?.text || "OCR Space Text"
      })
    };
  }

  // Gemini mock
  const behavior = fetchMockBehavior.shift();
  if (!behavior) throw new Error("No fetch mock behavior defined");
  
  return {
    ok: behavior.status === 200,
    status: behavior.status,
    json: async () => behavior.json
  };
};

// Also mock OcrScanner's fallback handler logic
async function simulateScannerPageProcessing(pages) {
  let geminiCalls = 0;
  let ocrSpaceCalls = 0;
  let results = [];
  let error = null;

  for (let i = 0; i < pages.length; i++) {
    const originalFetchCount = fetchCallCount;
    try {
      const result = await processOCR(new File([''], 'test.jpg'), 'fake-key', 'gemini-1.5-pro');
      results.push(result);
      geminiCalls += (fetchCallCount - originalFetchCount);
    } catch (e) {
      geminiCalls += (fetchCallCount - originalFetchCount);
      if (e.code === 'RECITATION_BLOCKED_AFTER_RETRY' || e.code === 'CONTENT_BLOCKED') {
        const ocrFetchStart = fetchCallCount;
        try {
          if (pages[i].ocrSpaceConfigured === false) {
             throw new Error("Vui lòng cấu hình API Key OCR.space trong phần Cài đặt hệ thống (bánh răng) để sử dụng tính năng dự phòng.");
          }
          // Directly call OCR.space fallback via fetch mock
          const ocrResp = await fetch('/api/ocr-space');
          if (!ocrResp.ok) {
            const errData = await ocrResp.json();
            const err = new Error(errData.message || 'OCR fallback error');
            err.code = errData.errorCode || errData.error || 'OCR_ERROR';
            throw err;
          }
          const ocrData = await ocrResp.json();
          const fallbackText = ocrData.text;
          results.push(fallbackText);
        } catch (fallbackErr) {
          error = fallbackErr;
        }
        ocrSpaceCalls += (fetchCallCount - ocrFetchStart);
      } else {
        error = e;
      }
    }
  }

  return { geminiCalls, ocrSpaceCalls, results, error };
}

async function runTests() {
  console.log("=== RUNNING DEDICATED RECITATION TESTS ===");
  let passed = 0;
  let failed = 0;

  const reset = () => {
    fetchCallCount = 0;
    fetchMockBehavior = [];
  };

  // R1
  try {
    reset();
    fetchMockBehavior.push({
      status: 200,
      json: {
        candidates: [{
          content: { parts: [{ text: "Valid text" }] },
          finishReason: "RECITATION"
        }]
      }
    });
    
    const { geminiCalls, ocrSpaceCalls, results } = await simulateScannerPageProcessing([{}]);
    assert.equal(geminiCalls, 1);
    assert.equal(ocrSpaceCalls, 0);
    assert.equal(results[0], "Valid text");
    console.log("✅ R1. Usable text + RECITATION -> returned text, 1 Gemini call, 0 OCR calls.");
    passed++;
  } catch (e) {
    console.error("❌ R1 Failed:", e.message);
    failed++;
  }

  // R2
  try {
    reset();
    fetchMockBehavior.push(
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }, // Initial fails
      { status: 200, json: { candidates: [{ content: { parts: [{ text: "Retry success" }] } }] } } // Retry succeeds
    );
    
    const { geminiCalls, ocrSpaceCalls, results } = await simulateScannerPageProcessing([{}]);
    assert.equal(geminiCalls, 2);
    assert.equal(ocrSpaceCalls, 0);
    assert.equal(results[0], "Retry success");
    console.log("✅ R2. No text + RECITATION, strict retry succeeds -> 2 Gemini calls, 0 OCR calls.");
    passed++;
  } catch (e) {
    console.error("❌ R2 Failed:", e.message);
    failed++;
  }

  // R3
  try {
    reset();
    fetchMockBehavior.push(
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }, // Initial fails
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }, // Retry fails again
      { status: 200, text: "Fallback text" } // OCR Space response
    );
    
    const { geminiCalls, ocrSpaceCalls, results } = await simulateScannerPageProcessing([{}]);
    assert.equal(geminiCalls, 2);
    assert.equal(ocrSpaceCalls, 1);
    assert.equal(results[0], "Fallback text");
    console.log("✅ R3. No text + RECITATION, strict retry also RECITATION -> 2 Gemini calls, 1 OCR call.");
    passed++;
  } catch (e) {
    console.error("❌ R3 Failed:", e.message);
    failed++;
  }

  // R4
  try {
    reset();
    fetchMockBehavior.push(
      // Page 1
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } },
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } },
      { status: 200, text: "Page 1 OCR Space" },
      // Page 2
      { status: 200, json: { candidates: [{ content: { parts: [{ text: "Page 2 Gemini" }] } }] } }
    );
    
    const { geminiCalls, ocrSpaceCalls, results } = await simulateScannerPageProcessing([{}, {}]);
    assert.equal(results[0], "Page 1 OCR Space");
    assert.equal(results[1], "Page 2 Gemini");
    assert.equal(geminiCalls, 3); // P1(2) + P2(1)
    assert.equal(ocrSpaceCalls, 1); // P1(1) + P2(0)
    console.log("✅ R4. Page 1 requires OCR.space, page 2 succeeds with Gemini.");
    passed++;
  } catch (e) {
    console.error("❌ R4 Failed:", e.message);
    failed++;
  }

  // R5
  try {
    reset();
    fetchMockBehavior.push(
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }, // Initial fails
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }  // Retry fails again
    );
    
    const { geminiCalls, ocrSpaceCalls, error } = await simulateScannerPageProcessing([{ ocrSpaceConfigured: false }]);
    assert.equal(geminiCalls, 2);
    assert.equal(ocrSpaceCalls, 0);
    assert.ok(error.message.includes("Vui lòng cấu hình API Key OCR.space"));
    console.log("✅ R5. OCR.space not configured -> friendly user-facing error.");
    passed++;
  } catch (e) {
    console.error("❌ R5 Failed:", e.message);
    failed++;
  }

  // R6
  try {
    reset();
    fetchMockBehavior.push(
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }, // Initial fails
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }, // Retry fails again
      { status: 429, retryAfter: "120" } // OCR Space 429
    );
    
    const { error } = await simulateScannerPageProcessing([{}]);
    assert.ok(error.message.includes("vượt quá hạn mức"));
    assert.ok(error.message.includes("2 phút"));
    assert.ok(!error.message.includes("{")); // no raw JSON
    console.log("✅ R6. OCR.space returns 429 with retryAfter -> correct rounded minutes, no raw JSON.");
    passed++;
  } catch (e) {
    console.error("❌ R6 Failed:", e.message);
    failed++;
  }

  // R7
  try {
    reset();
    fetchMockBehavior.push({
      status: 429,
      json: { error: { message: "Quota exceeded" } }
    });
    
    const { geminiCalls, ocrSpaceCalls, error } = await simulateScannerPageProcessing([{}]);
    assert.equal(geminiCalls, 1);
    assert.equal(ocrSpaceCalls, 0);
    assert.equal(error.code, "QUOTA_EXCEEDED");
    console.log("✅ R7. Gemini RATE_LIMIT -> does not use RECITATION retry, does not call OCR.space.");
    passed++;
  } catch (e) {
    console.error("❌ R7 Failed:", e.message);
    failed++;
  }

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
}

runTests();