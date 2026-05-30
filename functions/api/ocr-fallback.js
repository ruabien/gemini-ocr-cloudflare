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

    const params = new URLSearchParams();
    params.append('base64Image', image);
    params.append('language', 'vie');
    params.append('isTable', 'true');
    params.append('isOverlayRequired', 'false');
    params.append('scale', 'true');
    params.append('OCREngine', '2');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrSpaceKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
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
