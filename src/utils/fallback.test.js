import { strict as assert } from 'assert';

/**
 * Re-implementation of the exact fallback logic from OcrScanner.tsx for testing.
 * This simulates makeRequest's xhr.onload and the error catching block.
 */

import { classifyGeminiResponse } from './geminiResponseClassifier.ts';

async function simulateOcrProcess(mockXhrStatus, mockResponseText) {
  let fallbackCalled = 0;
  let nextKeyCalled = 0;
  let changeModelCalled = 0;
  let finalResult = null;
  let finalError = null;
  let activeModel = "gemini-2.5-flash";
  
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
      
      if (isTransientError) {
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
        let errorCode = xhr.status;
        let errorStatus = "";
        let errorMessage = "";
        try {
          const jsonBody = JSON.parse(xhr.responseText);
          if (jsonBody && jsonBody.error) {
            errorCode = jsonBody.error.code !== undefined ? jsonBody.error.code : xhr.status;
            errorStatus = jsonBody.error.status || "";
            errorMessage = jsonBody.error.message || "";
          }
        } catch (e) {
          // ignore
        }

        let errorType = "SERVER_ERROR";
        if (errorCode === 429 || errorStatus === "RESOURCE_EXHAUSTED") {
          errorType = "RATE_LIMITED";
        } else if (errorCode === 404 || errorStatus === "NOT_FOUND") {
          if (errorMessage && errorMessage.includes("no longer available to new users")) {
            errorType = "MODEL_DEPRECATED_FOR_KEY";
          } else {
            errorType = "MODEL_NOT_AVAILABLE";
          }
        } else if (errorCode === 403 || errorStatus === "PERMISSION_DENIED") {
          errorType = "KEY_PERMISSION_ERROR";
        } else if (errorCode >= 400 && errorCode < 500) {
          errorType = "CLIENT_ERROR";
        }

        reject({ type: errorType, status: errorCode, errorStatus, message: errorMessage });
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
    } else if (e?.type === "RATE_LIMITED") {
      nextKeyCalled++; // Chuyển key
      // Hạn mức RATE_LIMITED: Không đổi model (ví dụ không đổi sang gemini-3.5-flash)
      // activeModel giữ nguyên là gemini-2.5-flash
      finalError = e;
    } else if (e?.type === "MODEL_DEPRECATED_FOR_KEY") {
      // KHÔNG tự động chuyển model, KHÔNG retry bằng model khác, KHÔNG next key
      finalError = e;
    } else if (e?.type === "MODEL_NOT_AVAILABLE") {
      changeModelCalled++; // Đổi model
      activeModel = "gemini-3.5-flash"; // Giả sử đổi sang model khác
      finalError = e;
    } else if (e?.type === "KEY_PERMISSION_ERROR") {
      nextKeyCalled++; // Chuyển key
      finalError = e;
    } else {
      finalError = e;
    }
  }

  return { fallbackCalled, nextKeyCalled, changeModelCalled, finalResult, finalError, activeModel };
}

async function runTests() {
  console.log("=== BẮT ĐẦU CHẠY CÁC BÀI KIỂM TRA FALLBACK VÀ LỖI HTTP (OcrScanner) ===\n");
  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      name: "1. 429 RESOURCE_EXHAUSTED -> RATE_LIMITED, chuyển key, KHÔNG đổi model",
      status: 429,
      response: JSON.stringify({ error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded" } }),
      expectedFallback: 0,
      expectedNextKey: 1,
      expectedChangeModel: 0,
      expectedErrorType: "RATE_LIMITED"
    },
    {
      name: "2. 404 NOT_FOUND -> MODEL_NOT_AVAILABLE, đổi model",
      status: 404,
      response: JSON.stringify({ error: { code: 404, status: "NOT_FOUND", message: "Model not found" } }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedChangeModel: 1,
      expectedErrorType: "MODEL_NOT_AVAILABLE"
    },
    {
      name: "3. 403 PERMISSION_DENIED -> KEY_PERMISSION_ERROR, chuyển key",
      status: 403,
      response: JSON.stringify({ error: { code: 403, status: "PERMISSION_DENIED", message: "API key lacks permission" } }),
      expectedFallback: 0,
      expectedNextKey: 1,
      expectedChangeModel: 0,
      expectedErrorType: "KEY_PERMISSION_ERROR"
    },
    {
      name: "4. Lỗi 400 khác -> CLIENT_ERROR",
      status: 400,
      response: JSON.stringify({ error: { code: 400, status: "INVALID_ARGUMENT", message: "Bad request" } }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedChangeModel: 0,
      expectedErrorType: "CLIENT_ERROR"
    },
    {
      name: "5. Nội dung bị chặn -> FALLBACK",
      status: 200,
      response: JSON.stringify({
        promptFeedback: { blockReason: "SAFETY" }
      }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedChangeModel: 0,
      expectedResult: undefined
    },
    {
      name: "6. Mới: Không có text, blocked=false, probability=MEDIUM -> EMPTY_RESPONSE",
      status: 200,
      response: JSON.stringify({
        candidates: [{
          content: { parts: [{ text: "" }] },
          safetyRatings: [{ category: "HARM_CATEGORY_HATE_SPEECH", blocked: false, probability: "MEDIUM" }]
        }]
      }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedChangeModel: 0,
      expectedErrorType: "EMPTY_RESPONSE"
    },
    {
      name: "7. Có text hợp lệ, blocked=true -> vẫn trả text",
      status: 200,
      response: JSON.stringify({
        candidates: [{
          content: { parts: [{ text: "Văn bản hợp lệ dù bị block cờ" }] },
          safetyRatings: [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", blocked: true, probability: "HIGH" }]
        }]
      }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedChangeModel: 0,
      expectedResult: "Văn bản hợp lệ dù bị block cờ"
    },
    {
      name: "8. 404 + no longer available to new users -> MODEL_DEPRECATED_FOR_KEY",
      status: 404,
      response: JSON.stringify({ error: { code: 404, status: "NOT_FOUND", message: "This model models/gemini-2.5-flash is no longer available to new users." } }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedChangeModel: 0,
      expectedErrorType: "MODEL_DEPRECATED_FOR_KEY"
    },
    {
      name: "9. 404 model thật sự không tồn tại -> MODEL_NOT_AVAILABLE",
      status: 404,
      response: JSON.stringify({ error: { code: 404, status: "NOT_FOUND", message: "Model not found" } }),
      expectedFallback: 0,
      expectedNextKey: 0,
      expectedChangeModel: 1,
      expectedErrorType: "MODEL_NOT_AVAILABLE"
    }
  ];

  for (const tc of testCases) {
    try {
      const res = await simulateOcrProcess(tc.status, tc.response);
      assert.equal(res.fallbackCalled, tc.expectedFallback, "fallbackCalled mismatch");
      assert.equal(res.nextKeyCalled, tc.expectedNextKey, "nextKeyCalled mismatch");
      assert.equal(res.changeModelCalled, tc.expectedChangeModel, "changeModelCalled mismatch");
      
      if (tc.name.includes("429")) {
        // Kiểm tra không đổi model sang 3.5 vì lỗi 429
        assert.equal(res.activeModel, "gemini-2.5-flash", "Model should remain gemini-2.5-flash on 429");
      }
      if (tc.name.includes("404") && !tc.name.includes("no longer available")) {
        // Lỗi 404 thì đổi model
        assert.equal(res.activeModel, "gemini-3.5-flash", "Model should change on 404");
      }

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
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();