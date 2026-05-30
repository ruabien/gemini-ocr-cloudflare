const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { image } = await request.json();
    
    if (!image) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy dữ liệu ảnh (image) trong yêu cầu.' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const ocrSpaceKey = env.OCR_SPACE_API_KEY;
    if (!ocrSpaceKey) {
      return new Response(JSON.stringify({ error: 'OCR_SPACE_API_KEY chưa được thiết lập trên Cloudflare.' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Loại bỏ tiền tố Data URI (ví dụ: "data:image/jpeg;base64," hoặc "data:application/pdf;base64,")
    const cleanBase64 = image.replace(/^data:[^;]+;base64,/, "");

    // Cấu hình các tham số bắt buộc hoàn toàn bằng Chuỗi (String) và mã hóa URL thủ công an toàn
    const bodyPayload = [
      `base64Image=${encodeURIComponent(cleanBase64)}`,
      `language=${encodeURIComponent('vie')}`,
      `isTable=${encodeURIComponent('true')}`,
      `isOverlayRequired=${encodeURIComponent('false')}`,
      `scale=${encodeURIComponent('true')}`,
      `OCREngine=${encodeURIComponent('2')}`
    ].join('&');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrSpaceKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyPayload
    });

    if (!ocrResponse.ok) {
      return new Response(JSON.stringify({ error: `OCR.space API trả về lỗi: HTTP ${ocrResponse.status}` }), {
        status: ocrResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const result = await ocrResponse.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
