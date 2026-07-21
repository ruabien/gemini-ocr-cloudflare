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
async function simulateScannerPageProcessing(pages, keys = ['fake-key']) {
  let geminiCalls = 0;
  let ocrSpaceCalls = 0;
  let results = [];
  let error = null;

  let activeKeyIndex = 0;

  const runOcrSpaceFallback = async (pageIndex) => {
    const ocrFetchStart = fetchCallCount;
    try {
      if (pages[pageIndex].ocrSpaceConfigured === false) {
        throw new Error("Vui lòng cấu hình API Key OCR.space trong phần Cài đặt hệ thống (bánh răng) để sử dụng tính năng dự phòng.");
      }
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
  };

  for (let i = 0; i < pages.length; i++) {
    let pageProcessed = false;
    while (!pageProcessed) {
      const currentKey = keys[activeKeyIndex];
      if (!currentKey) {
        // Fallback to OCR.Space
        await runOcrSpaceFallback(i);
        pageProcessed = true;
        break;
      }

      const originalFetchCount = fetchCallCount;
      try {
        // First try
        const result = await processOCR(new File([''], 'test.jpg'), currentKey, 'gemini-1.5-pro');
        results.push(result);
        geminiCalls += (fetchCallCount - originalFetchCount);
        pageProcessed = true;
      } catch (e) {
        geminiCalls += (fetchCallCount - originalFetchCount);
        // If RECITATION_BLOCKED (or RECITATION_BLOCKED_AFTER_RETRY in mock)
        if (e.code === 'RECITATION_BLOCKED_AFTER_RETRY' || e.code === 'CONTENT_BLOCKED') {
          // In the real code, makeRequest threw RECITATION_BLOCKED, then it tries strict retry with same key.
          // Wait, mock processOCR already does the strict retry!
          // But if the strict retry fails:
          // Under our new requirements, if the error is RATE_LIMITED / 429, we do NOT enter OCR.Space.
          // Instead, we switch keys.
          // Let's see what mock processOCR throws when strict retry fails.
          // Actually, mock processOCR in recitation.test.js responds to fetch behavior.
          // Let's look at the fetch mock behavior we configure in tests.
          // For RECITATION, we configure the fetch behaviors to match our test expectations.
          
          // Wait, let's see if the error thrown by processOCR is a key-switchable one, or RECITATION persistence.
          const isKeySwitchable = e.code === 'QUOTA_EXCEEDED' || e.status === 429 || e.code === 'INVALID_KEY' || e.status === 401 || e.code === 'MODEL_NOT_AVAILABLE';
          if (isKeySwitchable) {
            activeKeyIndex++;
            continue; // Retry processing the same page with next key
          }

          // If RECITATION still persists after all retries on this key, or safety block:
          // Wait, does it immediately call OCR.space? Only if it's the last key!
          // Under our requirements: "Do NOT call OCR.Space immediately after a strict retry fails with a key-switchable error. Increment activeKeyIndex, continue Gemini processing, Do NOT enter OCR.Space."
          // But if RECITATION persists (RECITATION_BLOCKED_AFTER_RETRY or CONTENT_BLOCKED), does it switch key?
          // Requirement: "OCR.Space should only be reached when: every Gemini key has already been exhausted OR RECITATION/content blocking still persists after all Gemini keys have been tried."
          // Wait! Does a RECITATION block count as key-switchable? No, RECITATION is content-based, so trying a new key won't change the content, but we try all Gemini keys first just in case, OR fallback to OCR.Space immediately?
          // Let's read requirement 3:
          // "OCR.Space should only be reached when: every Gemini key has already been exhausted OR RECITATION/content blocking still persists after all Gemini keys have been tried."
          // This means: if it fails with RECITATION, it can fallback to OCR.Space immediately OR only after all keys are tried.
          // Actually, let's look at OcrScanner.tsx implementation:
          // If e.type === "RECITATION_BLOCKED", it tries to strict retry with the same key. If that retry fails with RECITATION_BLOCKED, it falls back to OCR.Space immediately.
          // If it fails with another error, or if we have key exhaustion, it goes to OCR.space.
          // Let's check Scenario 1 from task:
          // Key1 -> RECITATION -> strict retry -> 429 -> Key2 -> success
          // Expected: OCR continues on page N. OCR.Space is NOT called.
          // Scenario 2:
          // All Gemini keys exhausted after RECITATION retries
          // Expected: OCR.Space is invoked exactly once.
          
          // In Scenario 1, the strict retry with Key 1 fails with 429.
          // Since 429 is a key-switchable error, it should increment activeKeyIndex, and try processing Page N with Key 2.
          // Key 2 succeeds, so OCR continues on page N, and OCR.Space is NOT called.
          
          // In Scenario 2, if all Gemini keys fail (e.g. strict retry fails with 429 on Key 1, then Key 2 also fails), OCR.Space is called exactly once.
          
          // Let's check how our catch block handles this:
          // If e.code === 'RECITATION_BLOCKED_AFTER_RETRY' (which processOCR throws when strict retry fails with recitation block):
          // In the real code:
          // try {
          //   const fallbackText = await runOcrSpaceFallback();
          //   return fallbackText;
          // }
          // This falls back immediately for RECITATION_BLOCKED_AFTER_RETRY.
          // But wait, if processOCR throws a key-switchable error (like 429), it goes to the catch block where we increment key index.
          // Let's trace simulateScannerPageProcessing.
          
          if (e.code === 'RECITATION_BLOCKED_AFTER_RETRY' || e.code === 'CONTENT_BLOCKED') {
            await runOcrSpaceFallback(i);
            pageProcessed = true;
          } else {
            error = e;
            pageProcessed = true;
          }
        } else {
          // Other errors (like 429, key permission, etc.)
          const isKeySwitchable = e.code === 'QUOTA_EXCEEDED' || e.status === 429 || e.code === 'INVALID_KEY' || e.status === 401 || e.code === 'MODEL_NOT_AVAILABLE';
          if (isKeySwitchable) {
            activeKeyIndex++;
            // continue loop to try next key for this page
          } else {
            error = e;
            pageProcessed = true;
          }
        }
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
    fetchMockBehavior.push(
      {
        status: 429,
        json: { error: { message: "Quota exceeded" } }
      },
      {
        status: 429,
        json: { error: { message: "Quota exceeded" } }
      }
    );
    
    const { geminiCalls, ocrSpaceCalls, results, error } = await simulateScannerPageProcessing([{}]);
    // Expect Gemini calls (including internal retry) and then OCR.Space fallback
    assert.equal(geminiCalls, 2);
    assert.equal(ocrSpaceCalls, 1);
    assert.ok(results[0].includes("OCR Space"));
    assert.equal(error, null);
    console.log("✅ R7. Gemini RATE_LIMIT -> falls back to OCR.Space after keys exhausted.");
    passed++;
  } catch (e) {
    console.error("❌ R7 Failed:", e.message);
    failed++;
  }

  // Scenario 8: Key1 -> RECITATION -> strict retry -> 429 -> Key2 -> success
  try {
    reset();
    fetchMockBehavior.push(
      // Key 1
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }, // Key 1: RECITATION on initial try
      { status: 429, json: { error: { message: "Quota exceeded" } } }, // Key 1: 429 on strict retry
      // Key 2
      { status: 200, json: { candidates: [{ content: { parts: [{ text: "Key 2 Success Text" }] } }] } } // Key 2: success
    );

    const { geminiCalls, ocrSpaceCalls, results } = await simulateScannerPageProcessing([{}], ['Key1', 'Key2']);
    assert.equal(geminiCalls, 3); // 2 on Key 1 (initial + strict retry), 1 on Key 2
    assert.equal(ocrSpaceCalls, 0); // No OCR.Space calls!
    assert.equal(results[0], "Key 2 Success Text");
    console.log("✅ Scenario 8. Key1 RECITATION -> strict retry 429 -> Key2 Success -> OCR.space is NOT called.");
    passed++;
  } catch (e) {
    console.error("❌ Scenario 8 Failed:", e.message);
    failed++;
  }

  // Scenario 9: All Gemini keys exhausted after RECITATION retries
  try {
    reset();
    fetchMockBehavior.push(
      // Key 1
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }, // Key 1: RECITATION on initial try
      { status: 429, json: { error: { message: "Quota exceeded" } } }, // Key 1: 429 on strict retry (first attempt)
      { status: 429, json: { error: { message: "Quota exceeded" } } }, // Key 1: 429 on strict retry (second attempt after internal retry)
      // Key 2
      { status: 200, json: { candidates: [{ finishReason: "RECITATION" }] } }, // Key 2: RECITATION on initial try
      { status: 429, json: { error: { message: "Quota exceeded" } } }, // Key 2: 429 on strict retry (first)
      { status: 429, json: { error: { message: "Quota exceeded" } } }, // Key 2: 429 on strict retry (second)
      // OCR Space fallback
      { status: 200, text: "OCR Space Fallback Text" }
    );
    
    const { geminiCalls, ocrSpaceCalls, results } = await simulateScannerPageProcessing([{}], ['Key1', 'Key2']);
    assert.equal(geminiCalls, 6); // 3 on Key 1 (recitation + two 429 attempts), 3 on Key 2
    assert.equal(ocrSpaceCalls, 1); // OCR.Space called exactly once
    assert.equal(results[0], "OCR Space Fallback Text");
    console.log("✅ Scenario 9. All Gemini keys exhausted -> OCR.space is invoked exactly once.");
    passed++;
  } catch (e) {
    console.error("❌ Scenario 9 Failed:", e.message);
    failed++;
  }

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
}

runTests();