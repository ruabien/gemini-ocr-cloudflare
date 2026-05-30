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
    
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy file trong yêu cầu.' }), {
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

    const ocrSpaceFormData = new FormData();
    ocrSpaceFormData.append('file', file);
    ocrSpaceFormData.append('apikey', ocrSpaceKey);
    ocrSpaceFormData.append('language', 'vie');
    ocrSpaceFormData.append('isOverlayRequired', 'false');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: ocrSpaceFormData
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `OCR.space API trả về lỗi: HTTP ${response.status}` }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const data = await response.json();
    
    if (data.IsErroredOnProcessing) {
      const errorDetails = data.ErrorMessage ? data.ErrorMessage.join(', ') : 'Lỗi xử lý không xác định';
      return new Response(JSON.stringify({ error: `OCR.space Error: ${errorDetails}` }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const text = data.ParsedResults?.[0]?.ParsedText;
    if (text === undefined || text === null) {
      return new Response(JSON.stringify({ error: "OCR.space không trả về kết quả văn bản." }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    return new Response(JSON.stringify({ text }), {
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
