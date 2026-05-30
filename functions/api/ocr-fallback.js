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

    // 1. Tách bỏ tiền tố định dạng để lấy chuỗi Base64 thô (hỗ trợ cả jpeg, png, pdf, v.v.)
    const cleanBase64 = image.replace(/^data:[^;]+;base64,/, "");

    // 2. Chuyển đổi chuỗi Base64 thô thành dữ liệu nhị phân (Binary Data) bằng cách ép kiểu sang Uint8Array
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Tạo một đối tượng Blob nhị phân chuẩn file ảnh jpeg
    const imageBlob = new Blob([bytes], { type: 'image/jpeg' });

    // 3. Đóng gói vào FormData chuẩn từ Server-side
    const formData = new FormData();
    formData.append('file', imageBlob, 'screenshot.jpg'); // Đưa file nhị phân vào
    formData.append('language', 'vie');                    // Chuỗi tham số chuẩn
    formData.append('isTable', 'true');                    // Giữ cấu trúc bảng biểu
    formData.append('isOverlayRequired', 'false');         // Không lấy dữ liệu đè lên
    formData.append('scale', 'true');                      // Làm nét ảnh nâng cao
    formData.append('OCREngine', '2');                     // Bắt buộc để nhận diện tiếng Việt

    // 4. Gửi request dạng multipart/form-data sang OCR.space
    // Tuyệt đối KHÔNG tự đặt Content-Type trong headers, hãy để tự động sinh boundary
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
