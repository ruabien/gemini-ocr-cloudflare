const getCorsHeaders = (request) => {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = ["https://doc.hotro.online"];
  
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
  }
  
  if (allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
  }
  
  return {
    "Access-Control-Allow-Origin": "https://doc.hotro.online",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
};

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request)
  });
}

// Warm-start in-memory cache for round-robin key rotation
let lastSuccessfulKeyIndex = 0;

/**
 * Lấy danh sách các API Keys OCR.space có sẵn và hợp lệ từ môi trường (env)
 */
function getAvailableOcrSpaceKeys(env) {
  const keys = [];
  
  // 1. Thử lấy từ key mặc định/legacy
  if (env.OCR_SPACE_API_KEY && env.OCR_SPACE_API_KEY.trim()) {
    keys.push({ key: env.OCR_SPACE_API_KEY.trim(), name: "OCR_SPACE_API_KEY" });
  }

  // 2. Thử các key đánh số OCR_SPACE_API_KEY_1, OCR_SPACE_API_KEY_2...
  for (let i = 1; i <= 50; i++) {
    const val = env[`OCR_SPACE_API_KEY_${i}`];
    if (val && typeof val === 'string' && val.trim()) {
      keys.push({ key: val.trim(), name: `OCR_SPACE_API_KEY_${i}` });
    }
  }

  // 3. Quét động các key khác bắt đầu bằng OCR_SPACE_API_KEY_ trong env
  try {
    for (const key of Object.keys(env)) {
      if (key.startsWith("OCR_SPACE_API_KEY_")) {
        const indexStr = key.replace("OCR_SPACE_API_KEY_", "");
        const index = parseInt(indexStr, 10);
        if (!isNaN(index) && index > 50) {
          const val = env[key];
          if (val && typeof val === 'string' && val.trim()) {
            keys.push({ key: val.trim(), name: key });
          }
        }
      }
    }
  } catch {
    // Bỏ qua lỗi trong môi trường không hỗ trợ Object.keys(env)
  }

  // Loại bỏ các key trùng lặp
  const uniqueKeys = [];
  const seen = new Set();
  for (const item of keys) {
    if (!seen.has(item.key)) {
      seen.add(item.key);
      uniqueKeys.push(item);
    }
  }
  return uniqueKeys;
}

/**
 * Phân loại lỗi có được phép xoay key hay không
 */
function isRotatableError(res) {
  const { status, code, message, fullError } = res;

  // Lỗi HTTP 429 hoặc lỗi máy chủ (5xx)
  if (status === 429 || (status >= 500 && status <= 599)) {
    return true;
  }

  // Lỗi Timeout hoặc Network
  if (code === 'TIMEOUT' || code === 'NETWORK') {
    return true;
  }

  const errStr = `${code} ${message} ${fullError}`.toLowerCase();

  // 1. E201 (Không xoay khi gặp lỗi cấu hình E201 như language invalid hoặc key invalid)
  if (errStr.includes("e201")) {
    return false;
  }

  // 2. File too large
  if (code === 'FILE_TOO_LARGE' || errStr.includes("size") || errStr.includes("large") || errStr.includes("too big")) {
    return false;
  }

  // 3. Language invalid
  if (code === 'E201_LANGUAGE_INVALID' || errStr.includes("language invalid") || errStr.includes("lang invalid")) {
    return false;
  }

  // 4. Quota exceeded
  if (
    code === 'QUOTA_EXCEEDED' ||
    errStr.includes("limit") ||
    errStr.includes("quota") ||
    errStr.includes("exceeded") ||
    errStr.includes("max allowed")
  ) {
    return true;
  }

  // 5. Too many requests / Rate limit
  if (errStr.includes("too many requests") || errStr.includes("rate limit") || errStr.includes("rate-limit")) {
    return true;
  }

  // 6. Temporary unavailable
  if (errStr.includes("temporary unavailable") || errStr.includes("temporarily unavailable") || errStr.includes("service unavailable")) {
    return true;
  }

  // Mặc định: lỗi bad request, cấu hình sai cấu trúc hoặc malformed request -> fail ngay
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(
        JSON.stringify({ 
          error: 'NO_FILE', 
          message: 'Thiếu file ảnh/tài liệu truyền lên.' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          error: 'FILE_TOO_LARGE', 
          message: 'Kích thước tệp tin vượt quá giới hạn cho phép (Tối đa 5MB).' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    const fileType = file.type || '';
    const fileName = file.name || '';
    const isAllowedType = allowedTypes.some(t => fileType.toLowerCase().includes(t)) || 
                          /\.(png|jpe?g|webp|pdf)$/i.test(fileName);
    if (!isAllowedType) {
      return new Response(
        JSON.stringify({ 
          error: 'INVALID_TYPE', 
          message: 'Định dạng tệp tin không được hỗ trợ (Chỉ hỗ trợ PNG, JPG, WEBP, PDF).' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const keys = getAvailableOcrSpaceKeys(env);

    if (keys.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          errorCode: 'OCR_SPACE_NOT_CONFIGURED', 
          message: 'OCR.space chưa được cấu hình. Vui lòng thiết lập OCR_SPACE_API_KEY_1 trong biến môi trường.' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    let currentLanguage = 'vie';

    // Hàm gọi API OCR.space cho một Key cụ thể
    const runOcrWithKey = async (apiKeyObj, lang) => {
      let currentLang = lang;
      let response;
      let data;
      let fullError = '';

      const callApi = async (l) => {
        const ocrFormData = new FormData();
        ocrFormData.append('apikey', apiKeyObj.key);
        ocrFormData.append('language', l);
        ocrFormData.append('isOverlayRequired', 'false');
        ocrFormData.append('OCREngine', '2');
        ocrFormData.append('scale', 'true');
        ocrFormData.append('file', file);

        // Client timeout 45s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
          const res = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: ocrFormData,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return res;
        } catch (err) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            const timeoutErr = new Error("TIMEOUT");
            timeoutErr.isTimeout = true;
            throw timeoutErr;
          }
          throw err;
        }
      };

      try {
        response = await callApi(currentLang);
      } catch (err) {
        if (err.isTimeout) {
          return {
            success: false,
            code: 'TIMEOUT',
            message: 'OCR.space quá thời gian phản hồi.',
            fullError: err.message
          };
        }
        return {
          success: false,
          code: 'NETWORK',
          message: 'OCR.space chưa kết nối được qua máy chủ. Vui lòng kiểm tra cấu hình OCR.space hoặc thử lại.',
          fullError: err.message
        };
      }

      if (!response.ok) {
        let code = 'NETWORK';
        let message = 'OCR.space chưa kết nối được qua máy chủ. Vui lòng kiểm tra cấu hình hoặc thử lại.';
        if (response.status === 403) {
          code = 'INVALID_API_KEY';
          message = 'Lỗi cấu hình: API Key OCR.space không hợp lệ (HTTP 403).';
        } else if (response.status === 413) {
          code = 'FILE_TOO_LARGE';
          message = 'Kích thước tệp tin quá lớn so với giới hạn xử lý của OCR.space (tối đa 1MB với key miễn phí).';
        }
        return {
          success: false,
          status: response.status,
          code,
          message,
          fullError: `HTTP ${response.status}`
        };
      }

      try {
        data = await response.json();
      } catch (jsonErr) {
        return {
          success: false,
          code: 'MALFORMED_RESPONSE',
          message: 'Phản hồi từ OCR.space không phải là JSON hợp lệ.',
          fullError: jsonErr.message
        };
      }

      if (data.IsErroredOnProcessing || data.OCRExitCode === 99 || (data.ErrorMessage && String(data.ErrorMessage).includes("E201"))) {
        const errMsgs = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : (data.ErrorMessage || "");
        const errDetails = Array.isArray(data.ErrorDetails) ? data.ErrorDetails.join(', ') : (data.ErrorDetails || "");
        fullError = `${errMsgs} ${errDetails}`.trim();

        // Check if language invalid E201
        if (fullError.toLowerCase().includes("language") || fullError.toLowerCase().includes("lang")) {
          try {
            currentLang = 'auto';
            const autoResponse = await callApi(currentLang);
            if (!autoResponse.ok) {
              throw new Error(`HTTP ${autoResponse.status}`);
            }
            data = await autoResponse.json();
            fullError = ''; // Reset error on successful fallback
          } catch {
            return {
              success: false,
              code: 'E201_LANGUAGE_INVALID',
              message: `Lỗi cấu hình: Mã ngôn ngữ OCR.space không hợp lệ (E201). Chi tiết: ${fullError}`,
              fullError: fullError
            };
          }
        }
      }

      if (fullError || data.IsErroredOnProcessing || data.OCRExitCode === 99) {
        if (!fullError) {
          const errMsgs = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : (data.ErrorMessage || "");
          const errDetails = Array.isArray(data.ErrorDetails) ? data.ErrorDetails.join(', ') : (data.ErrorDetails || "");
          fullError = `${errMsgs} ${errDetails}`.trim();
        }

        let code = 'UNKNOWN';
        let message = `Lỗi từ dịch vụ OCR.space: ${fullError}`;

        if (
          fullError.includes("E201") || 
          fullError.toLowerCase().includes("apikey is invalid") ||
          fullError.toLowerCase().includes("api key is invalid")
        ) {
          code = 'INVALID_API_KEY';
          message = 'Lỗi cấu hình: API Key OCR.space không hợp lệ hoặc không tìm thấy (E201). Vui lòng cấu hình lại.';
        } else if (
          fullError.toLowerCase().includes("size") || 
          fullError.toLowerCase().includes("large") ||
          fullError.toLowerCase().includes("too big")
        ) {
          code = 'FILE_TOO_LARGE';
          message = 'Kích thước tệp tin quá lớn so với giới hạn xử lý của OCR.space (tối đa 1MB với key miễn phí).';
        } else if (
          fullError.toLowerCase().includes("limit") || 
          fullError.toLowerCase().includes("quota") || 
          fullError.toLowerCase().includes("exceeded") ||
          fullError.toLowerCase().includes("max allowed")
        ) {
          code = 'QUOTA_EXCEEDED';
          message = 'Hạn mức (Quota) của API Key OCR.space đã hết hoặc bị giới hạn.';
        }

        return {
          success: false,
          code,
          message,
          fullError: fullError
        };
      }

      const parsedResults = data.ParsedResults;
      if (!parsedResults || parsedResults.length === 0) {
        return {
          success: false,
          code: 'NO_TEXT',
          message: 'OCR.space không nhận dạng được văn bản nào trong ảnh này.',
          fullError: 'ParsedResults is empty'
        };
      }

      return {
        success: true,
        text: parsedResults[0].ParsedText
      };
    };

    // Vòng lặp xoay tua các key bắt đầu từ cache index
    let success = false;
    let finalResult = null;
    let finalErrorResponse = null;
    
    const failReasons = [];
    let retryCount = 0;
    let keyIndexUsed = -1;
    
    const totalKeys = keys.length;
    const startIndex = lastSuccessfulKeyIndex % totalKeys;

    for (let attempt = 0; attempt < totalKeys; attempt++) {
      const currentIndex = (startIndex + attempt) % totalKeys;
      const keyObj = keys[currentIndex];
      keyIndexUsed = currentIndex;

      const res = await runOcrWithKey(keyObj, currentLanguage);

      if (res.success) {
        success = true;
        finalResult = res.text;

        // Log Dev mode
        console.log(`[OCR.space Attempt]
keyIndex: ${currentIndex} (${keyObj.name})
status: success
reason: none`);

        // Ghi nhớ key thành công tiếp theo để tối ưu round-robin
        lastSuccessfulKeyIndex = (currentIndex + 1) % totalKeys;
        break;
      } else {
        retryCount++;
        failReasons.push(`Key #${currentIndex} (${keyObj.name}): ${res.code} - ${res.message}`);

        // Log Dev mode
        console.log(`[OCR.space Attempt]
keyIndex: ${currentIndex} (${keyObj.name})
status: failed
reason: ${res.code} (${res.message})`);

        // Kiểm tra xem lỗi này có được phép xoay sang key khác không
        const rotatable = isRotatableError(res);
        if (!rotatable) {
          // Báo lỗi fail fast ngay lập tức, không xoay key tiếp
          finalErrorResponse = new Response(
            JSON.stringify({
              success: false,
              error: res.code,
              message: res.message,
              metadata: {
                engineUsed: "ocr-space",
                keyIndexUsed: currentIndex,
                retryCount,
                failReasons
              }
            }),
            {
              status: res.status || 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            }
          );
          break;
        }
      }
    }

    if (success) {
      return new Response(
        JSON.stringify({ 
          text: finalResult,
          metadata: {
            engineUsed: "ocr-space",
            keyIndexUsed,
            retryCount,
            failReasons
          }
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (finalErrorResponse) {
      return finalErrorResponse;
    }

    // Nếu tất cả key đều bị lỗi rotatable (như hết hạn mức / timeout)
    const breakdownMsg = `Tất cả API keys OCR.space đều thất bại:\n` + failReasons.map(r => `- ${r}`).join('\n');
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'ALL_KEYS_FAILED',
        message: breakdownMsg,
        metadata: {
          engineUsed: "ocr-space",
          retryCount,
          failReasons
        }
      }), 
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'NETWORK', 
        message: `OCR.space chưa kết nối được qua máy chủ. Chi tiết: ${err.message}` 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
}
