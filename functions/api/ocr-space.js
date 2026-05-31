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

  // 2. Thử các key OCR_SPACE_API_KEY_1 và OCR_SPACE_API_KEY_2
  if (env.OCR_SPACE_API_KEY_1 && env.OCR_SPACE_API_KEY_1.trim()) {
    keys.push({ key: env.OCR_SPACE_API_KEY_1.trim(), name: "OCR_SPACE_API_KEY_1" });
  }
  if (env.OCR_SPACE_API_KEY_2 && env.OCR_SPACE_API_KEY_2.trim()) {
    keys.push({ key: env.OCR_SPACE_API_KEY_2.trim(), name: "OCR_SPACE_API_KEY_2" });
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

  // Lỗi HTTP 403 Forbidden (thường là API key sai hoặc bị chặn) -> cho phép xoay key tiếp theo!
  if (status === 403) {
    return true;
  }

  const errStr = `${code} ${message} ${fullError}`.toLowerCase();

  // 1. Nếu lỗi là language invalid / E201 language parameter invalid -> fail fast (KHÔNG xoay key)
  if (
    code === 'E201_LANGUAGE_INVALID' ||
    errStr.includes("language invalid") ||
    errStr.includes("lang invalid") ||
    errStr.includes("language parameter")
  ) {
    return false;
  }

  // 2. File too large -> fail fast (KHÔNG xoay key)
  if (code === 'FILE_TOO_LARGE' || errStr.includes("size") || errStr.includes("large") || errStr.includes("too big")) {
    return false;
  }

  // 3. Nếu lỗi là invalid API key / API key không hợp lệ -> ĐƯỢC xoay sang key tiếp theo
  if (
    code === 'INVALID_API_KEY' ||
    errStr.includes("apikey is invalid") ||
    errStr.includes("api key is invalid") ||
    errStr.includes("apikey is not valid")
  ) {
    return true;
  }

  // Nếu gặp E201 tổng quát: nếu nó chứa E201 nhưng không phải là Language invalid (đã được lọc ở trên),
  // thì đó là E201 API key invalid. Do đó được xoay key!
  if (errStr.includes("e201")) {
    if (errStr.includes("language") || errStr.includes("lang")) {
      return false;
    }
    return true;
  }

  // 4. Quota exceeded -> ĐƯỢC PHÉP xoay key
  if (
    code === 'QUOTA_EXCEEDED' ||
    errStr.includes("limit") ||
    errStr.includes("quota") ||
    errStr.includes("exceeded") ||
    errStr.includes("max allowed")
  ) {
    return true;
  }

  // 5. Too many requests / Rate limit -> ĐƯỢC PHÉP xoay key
  if (errStr.includes("too many requests") || errStr.includes("rate limit") || errStr.includes("rate-limit")) {
    return true;
  }

  // 6. Temporary unavailable -> ĐƯỢC PHÉP xoay key
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

    // Log dev mode: số lượng key được load
    console.log(`[OCR.space Key Pool Info] Loaded keys count: ${keys.length}`);

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

      // Log dev mode: key index đang thử
      console.log(`[OCR.space Attempt] keyIndex: ${currentIndex}`);

      const res = await runOcrWithKey(keyObj, currentLanguage);

      if (res.success) {
        success = true;
        finalResult = res.text;

        // Ghi nhớ key thành công tiếp theo để tối ưu round-robin
        lastSuccessfulKeyIndex = (currentIndex + 1) % totalKeys;
        break;
      } else {
        retryCount++;
        failReasons.push(`Key #${currentIndex} (${keyObj.name}): ${res.code} - ${res.message}`);

        // Log dev mode: reason fail (nếu fail)
        console.log(`[OCR.space Attempt Failed] keyIndex: ${currentIndex}, reason: ${res.code} (${res.message})`);

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
