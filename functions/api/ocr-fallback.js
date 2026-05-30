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

    // Kiểm tra nếu chuỗi chưa có tiền tố định dạng Data URI thì bổ sung để OCR.space nhận diện
    let formattedBase64 = image;
    if (!formattedBase64.startsWith('data:')) {
      formattedBase64 = `data:image/jpeg;base64,${formattedBase64}`;
    }

    // Đóng gói dữ liệu bằng đối tượng JSON phẳng 100%, truyền Base64 vào tham số 'url' 
    const jsonPayload = {
      url: formattedBase64,
      language: 'vie',
      isTable: true,
      isOverlayRequired: false,
      scale: true,
      OCREngine: 2
    };

    // Gửi request bằng chuẩn application/json
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrSpaceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jsonPayload)
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
