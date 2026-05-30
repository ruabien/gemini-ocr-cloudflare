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

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const apiKey = env.OCR_SPACE_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false,
          errorCode: 'OCR_SPACE_NOT_CONFIGURED', 
          message: 'OCR.space chưa được cấu hình.' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

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

    let response;
    let data;
    let currentLanguage = 'vie';

    const callOcrSpaceApi = async (lang) => {
      const ocrFormData = new FormData();
      ocrFormData.append('apikey', apiKey.trim());
      ocrFormData.append('language', lang);
      ocrFormData.append('isOverlayRequired', 'false');
      ocrFormData.append('OCREngine', '2');
      ocrFormData.append('scale', 'true');
      ocrFormData.append('file', file);

      // Set timeout 45s
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

    // First attempt with language = 'vie'
    try {
      response = await callOcrSpaceApi(currentLanguage);
    } catch (err) {
      if (err.isTimeout) {
        return new Response(
          JSON.stringify({ 
            error: 'TIMEOUT', 
            message: 'OCR.space quá thời gian phản hồi.' 
          }), 
          {
            status: 504,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }
      return new Response(
        JSON.stringify({ 
          error: 'NETWORK', 
          message: 'OCR.space chưa kết nối được qua máy chủ. Vui lòng kiểm tra cấu hình OCR.space hoặc thử lại.' 
        }), 
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (!response.ok) {
      let code = 'NETWORK';
      let message = 'OCR.space chưa kết nối được qua máy chủ. Vui lòng kiểm tra cấu hình OCR.space hoặc thử lại.';
      if (response.status === 403) {
        code = 'INVALID_API_KEY';
        message = 'Lỗi cấu hình: API Key OCR.space không hợp lệ (HTTP 403).';
      } else if (response.status === 413) {
        code = 'FILE_TOO_LARGE';
        message = 'Kích thước tệp tin quá lớn so với giới hạn xử lý của OCR.space (tối đa 1MB với key miễn phí).';
      }
      return new Response(
        JSON.stringify({ error: code, message }), 
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    data = await response.json();

    let fullError = '';
    if (data.IsErroredOnProcessing || data.OCRExitCode === 99 || (data.ErrorMessage && String(data.ErrorMessage).includes("E201"))) {
      const errMsgs = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : (data.ErrorMessage || "");
      const errDetails = Array.isArray(data.ErrorDetails) ? data.ErrorDetails.join(', ') : (data.ErrorDetails || "");
      fullError = `${errMsgs} ${errDetails}`.trim();

      // Check if language invalid E201
      if (fullError.toLowerCase().includes("language") || fullError.toLowerCase().includes("lang")) {
        try {
          currentLanguage = 'auto';
          response = await callOcrSpaceApi(currentLanguage);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          data = await response.json();
          fullError = ''; // Reset error on successful fallback
        } catch {
          return new Response(
            JSON.stringify({ 
              error: 'E201_LANGUAGE_INVALID', 
              message: `Lỗi cấu hình: Mã ngôn ngữ OCR.space không hợp lệ (E201). Chi tiết: ${fullError}` 
            }), 
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            }
          );
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

      return new Response(
        JSON.stringify({ error: code, message }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const parsedResults = data.ParsedResults;
    if (!parsedResults || parsedResults.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'NO_TEXT', 
          message: 'OCR.space không nhận dạng được văn bản nào trong ảnh này.' 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const textResult = parsedResults[0].ParsedText;
    return new Response(
      JSON.stringify({ text: textResult }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch {
    return new Response(
      JSON.stringify({ 
        error: 'NETWORK', 
        message: 'OCR.space chưa kết nối được qua máy chủ. Vui lòng kiểm tra cấu hình OCR.space hoặc thử lại.' 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
}
