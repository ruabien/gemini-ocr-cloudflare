import { strict as assert } from 'assert';

/**
 * Re-implementation of the exact fallback logic from OcrScanner.tsx for testing.
 * This simulates makeRequest's xhr.onload and the error catching block.
 */

import { classifyGeminiResponse } from './geminiResponseClassifier.ts';

async function simulateOcrProcess(mockXhrStatus, mockResponseText) {
  let fallbackCalled = 0;
  let nextKeyCalled = 0;
  let finalResult = null;
  let finalError = null;
  
  // Mock fallback
  const runOcrSpaceFallback = async () => {
    fallbackCalled++;
    return "Fallback Text";
  };

  const makeRequest = (isRetry = false) => {
    return new Promise((resolve, reject) => {
      const xhr = {
        status: mockXhrStatus,
        responseText: mockResponseText,
      };

      let shouldFallback = false;
      const isTransientError = xhr.status === 500 || xhr.status === 502 || xhr.status === 503 || xhr.status === 504;
      
      if (xhr.status === 429) {
        reject({ status: 429 });
        return;
      } else if (xhr.status === 401 || xhr.status === 403) {
        reject({ status: xhr.status });
        return;
      } else if (isTransientError) {
        if (!isRetry) {
          // Simulate retry
          makeRequest(true).then(resolve).catch(reject);
          return;
        } else {
          shouldFallback = true;
        }
      }
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const rawText = xhr.responseText;
          const cleanJson = JSON.parse(rawText);
          
          const candidate = cleanJson.candidates?.[0];
          const geminiText = candidate?.content?.parts?.[0]?.text;
          const actualText = geminiText || cleanJson.text || "";
          
          let lines = actualText.split('\n');
          if (lines.length > 0) {
            const firstLine = lines[0].trim();
            const isAiIntro = /^(Dưới đây là|Văn bản đã được|Kết quả|Đây là văn bản)/i.test(firstLine) && firstLine.endsWith(':');
            if (isAiIntro) {
              lines.shift();
            }
          }
          const sanitizedText = lines.join('\n').trim();
          
          if (sanitizedText) {
            resolve(sanitizedText);
            return;
          }

          const failureCategory = classifyGeminiResponse(cleanJson);

          if (failureCategory) {
            reject({ type: failureCategory, message: `Gemini failure: ${failureCategory}` });
            return;
          }

          reject({ type: "EMPTY_RESPONSE", message: "Gemini returned empty response" });
          return;
        } catch (e) {
          reject({ type: "PARSE_ERROR", message: "Gemini response parse error" });
          return;
        }
      } else {
        reject({ status: xhr.status, message: `Gemini HTTP ${xhr.status}` });
        return;
      }
    });
  };

  try {
    const text = await makeRequest();
    finalResult = text;
  } catch (e) {
    if (e?.type === "CONTENT_BLOCKED") {
      try {
        finalResult = await runOcrSpaceFallback();
      } catch (err) {
        finalError = err;
      }
    } else if (e?.status === 429 || e?.status === 401 || e?.status === 403) {
      nextKeyCalled++;
      finalError = e; // End of loop mock
    } else {
      finalError = e;
    }
  }

  return { fallbackCalled, nextKeyCalled, finalResult, finalError };
}

async function runTests() {
  console.log("=== BẮT ĐẦU CHẠY CÁC BÀI KIỂM TRA FALLBACK (OcrScanner) ===\n");
  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      name: "A. Gemini trả text và có safetyRatings nhưng blocked=false",
      status: 200,
      response: JSON.stringify({
        candidates: [{
          content: { parts: [{ text: "Văn bản hợp lệ" }] },
          safetyRatings: [{ category: "HARM_CATEGORY_HATE_SPEECH", blocked: false, probability: "LOW" }]
        }]
      }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedResult: "Văn bản hợp lệ"
    },
{
  name: "B. promptFeedback.blockReason có giá trị block thực sự, không có text",
  status: 200,
  response: JSON.stringify({
    promptFeedback: { blockReason: "SAFETY" }
  }),
  expectedFallback: 0,
  expectedNextKey: 0,
  expectedResult: undefined
},
{
  name: "C. finishReason=SAFETY, không có text",
  status: 200,
  response: JSON.stringify({
    candidates: [{ finishReason: "SAFETY" }]
  }),
  expectedFallback: 0,
  expectedNextKey: 0,
  expectedResult: undefined
},
    {
      name: "D. Gemini 429 -> thử Key tiếp theo, không gọi OCR.space",
      status: 429,
      response: "",
      expectedFallback: 0,
      expectedNextKey: 1,
      expectedErrorStatus: 429
    },
    {
      name: "E. Gemini 401/403 -> thử Key tiếp theo, không gọi OCR.space",
      status: 403,
      response: "",
      expectedFallback: 0,
      expectedNextKey: 1,
      expectedErrorStatus: 403
    },
    {
      name: "F. EMPTY_RESPONSE không có block metadata",
      status: 200,
      response: JSON.stringify({
        candidates: [{ content: { parts: [{ text: "" }] } }]
      }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedErrorType: "EMPTY_RESPONSE"
    },
    {
      name: "G. PARSE_ERROR",
      status: 200,
      response: "INVALID_JSON",
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedErrorType: "PARSE_ERROR"
    },
    {
      name: "H. UNKNOWN ERROR / HTTP 500",
      status: 500,
      response: "",
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedErrorStatus: 500
    },
    {
      name: "I. Mới: Không có text, blocked=false, probability=MEDIUM -> EMPTY_RESPONSE",
      status: 200,
      response: JSON.stringify({
        candidates: [{
          content: { parts: [{ text: "" }] },
          safetyRatings: [{ category: "HARM_CATEGORY_HATE_SPEECH", blocked: false, probability: "MEDIUM" }]
        }]
      }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedErrorType: "EMPTY_RESPONSE"
    },
    {
      name: "J. Mới: Có text hợp lệ, blocked=true -> vẫn trả text",
      status: 200,
      response: JSON.stringify({
        candidates: [{
          content: { parts: [{ text: "Văn bản hợp lệ dù bị block cờ" }] },
          safetyRatings: [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", blocked: true, probability: "HIGH" }]
        }]
      }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedResult: "Văn bản hợp lệ dù bị block cờ"
    }
  ];

  for (const tc of testCases) {
    try {
      const res = await simulateOcrProcess(tc.status, tc.response);
      assert.equal(res.fallbackCalled, tc.expectedFallback, "fallbackCalled mismatch");
      assert.equal(res.nextKeyCalled, tc.expectedNextKey, "nextKeyCalled mismatch");
      
      if (tc.expectedResult !== undefined) {
        assert.equal(res.finalResult, tc.expectedResult, "finalResult mismatch");
      }
      
      if (tc.expectedErrorType) {
        assert.equal(res.finalError?.type, tc.expectedErrorType, "finalError type mismatch");
      }
      if (tc.expectedErrorStatus) {
        assert.equal(res.finalError?.status, tc.expectedErrorStatus, "finalError status mismatch");
      }

      console.log(`[PASS] ${tc.name}`);
      passed++;
    } catch (e) {
      console.log(`[FAIL] ${tc.name} - ${e.message}`);
      console.log("Expected vs Actual:", e.expected, e.actual);
      failed++;
    }
  }

  console.log(`\n=== KẾT QUẢ: ${passed} bài kiểm tra đạt, ${failed} bài kiểm tra thất bại ===`);
}

runTests();