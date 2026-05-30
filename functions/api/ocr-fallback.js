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

    // Đảm bảo chuỗi Base64 có đầy đủ tiền tố định dạng đầu (Ví dụ: data:image/jpeg;base64,...)
    let formattedBase64 = image;
    if (!formattedBase64.startsWith('data:image/')) {
      formattedBase64 = `data:image/jpeg;base64,${formattedBase64}`;
    }

    // Đóng gói dữ liệu vào FormData theo chuẩn tài liệu API OCR.space
    const formData = new FormData();
    formData.append('base64Image', formattedBase64); // Tham số bắt buộc phải tên là base64Image
    formData.append('language', 'vie');              // Định dạng chuỗi 'vie' viết tắt cho tiếng Việt
    formData.append('isTable', 'true');              // Ép kiểu chuỗi 'true' để nhận diện bảng/cột
    formData.append('isOverlayRequired', 'false');   // Ép kiểu chuỗi 'false'
    formData.append('scale', 'true');                // Ép kiểu chuỗi 'true' để làm nét ảnh
    formData.append('OCREngine', '2');               // Bắt buộc sử dụng Engine 2 để hỗ trợ tiếng Việt

    // Gửi request dạng multipart/form-data sang OCR.space
    // Tuyệt đối KHÔNG tự đặt 'Content-Type' trong headers để hệ thống tự sinh Boundary Header
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrSpaceKey
      },
      body: formData
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
