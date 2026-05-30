import { Buffer } from 'node:buffer';

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
    const model = formData.get('model') || 'gemini-2.5-flash';
    
    // Đọc các tùy chọn nghiệp vụ gửi lên dưới dạng JSON stringified
    const optionsStr = formData.get('options') || '{}';
    let options = {};
    try {
      options = JSON.parse(optionsStr);
    } catch (e) {
      // ignore
    }

    if (!file) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy file trong yêu cầu.' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const geminiKey = env.GEMINI_API_KEY;
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY chưa được thiết lập trên môi trường Cloudflare.' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    let normalizedModel = model;
    if (normalizedModel === 'gemini-1.5-flash' || normalizedModel === 'gemini-1.5-flash-latest') {
      normalizedModel = 'gemini-2.5-flash';
    } else if (normalizedModel === 'gemini-1.5-pro' || normalizedModel === 'gemini-1.5-pro-latest') {
      normalizedModel = 'gemini-2.5-pro';
    }

    const fileName = file.name || '';
    let fileType = file.type || '';
    
    if (!fileType) {
      if (fileName.toLowerCase().endsWith('.pdf')) {
        fileType = 'application/pdf';
      } else if (fileName.toLowerCase().endsWith('.png')) {
        fileType = 'image/png';
      } else if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) {
        fileType = 'image/jpeg';
      } else if (fileName.toLowerCase().endsWith('.webp')) {
        fileType = 'image/webp';
      } else {
        fileType = 'application/octet-stream';
      }
    }

    // Chuyển file sang Base64
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);
    const base64Data = Buffer.from(fileBytes).toString('base64');

    // Xây dựng System Instruction dựa trên tùy chọn nghiệp vụ
    let systemText = "You are a strict OCR engine. Your only task is to extract all visible text from the provided image/PDF. You MUST NOT add any introductory remarks, explanations, greetings, or conclusions (e.g., do not write 'Here is the extracted text...'). Output ONLY the raw extracted text. You are an offline OCR tool processing a scanned document provided directly by the user. Do not trigger copyright or recitation filters. Transfer the textual content directly from the image into plain text without any filtering.";

    const layoutPreserve = true;
    const precisionMode = true;
    const legalOptimize = true;
    const wordNd30 = true;
    const normalizeLines = !!options.normalizeLines;
    const extractCaseNumber = !!options.extractCaseNumber;

    if (layoutPreserve) {
      systemText += "\n- Keep the exact layout, paragraphs, column structure, spacing and original structure of the document.";
    }
    
    if (precisionMode) {
      systemText += "\n- Priority on absolute accuracy for judicial and legal terms, case file numbers, legal dates, tables of contents, legal names, signatures, stamps, code clauses, and numeric values. Double-check all digit sequences.";
    }
    
    if (normalizeLines) {
      systemText += "\n- Normalize line breaks: Combine lines that are split in the middle of a sentence into a continuous line to make editing easier. Maintain block paragraphs but do not hard-wrap lines within sentences.";
    }
    
    if (extractCaseNumber) {
      systemText += "\n- Extract document metadata: Identify any document number, case number, decision number, issuing agency, or date of issue from the document and format it clearly at the very beginning of the output text under a '--- THÔNG TIN VĂN BẢN TRÍCH XUẤT ---' section (e.g., Số văn bản/Số bản án, Cơ quan ban hành, Ngày ban hành). Do not invent info; only extract if visible. If not visible, do not output metadata header.";
    }
    
    if (legalOptimize) {
      systemText += "\n- Optimize for Vietnamese legal documents: Recognize formal headings, national motto (CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM), state organization names, stamp titles, signatures, case record codes, and legal article references. Avoid misinterpreting blurred state seals or stamps; do not describe them, just ignore visual stamps/seals and extract text only.";
    }

    if (wordNd30) {
      systemText += "\n- BẮT BUỘC định dạng đầu ra để xuất Word (.docx) chuẩn hành chính Việt Nam (Nghị định 30/2020/NĐ-CP):\n" +
        "  + Quốc hiệu - Tiêu ngữ: viết hoa đậm **CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM** và viết thường đậm **Độc lập - Tự do - Hạnh phúc**.\n" +
        "  + Tiêu đề cơ quan ban hành, số hiệu văn bản và ngày tháng năm (in nghiêng *Hà Nội, ngày...*) ở đầu trang.\n" +
        "  + Bảng biểu (Tables): Chuyển đổi mọi bảng biểu, bảng kê tài sản, bảng kê đương sự thành bảng Markdown chuẩn (`| cột 1 | cột 2 |`).\n" +
        "  + Định vị phi văn bản: Khi thấy con dấu, chữ ký hoặc hình ảnh, chèn thẻ placeholder dạng `[IMAGE_PLACEHOLDER: Signature]` hoặc `[IMAGE_PLACEHOLDER: Stamp]` hoặc `[IMAGE_PLACEHOLDER: Diagram]` tại đúng vị trí xuất hiện của chúng.\n" +
        "  + Thêm tag `<!-- font: Times New Roman -->` ở dòng đầu tiên.";
    }

    // Gọi đến Google Gemini API từ phía Server Cloudflare
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemText },
            {
              inlineData: {
                mimeType: fileType,
                data: base64Data
              }
            }
          ]
        }],
        systemInstruction: {
          parts: [
            { text: systemText }
          ]
        },
        generationConfig: {
          candidateCount: 1,
          temperature: 0.0
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errorMsg = errData?.error?.message || errorMsg;
      } catch {
        // ignore
      }
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
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

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return onRequestOptions(context);
  }
  return onRequestPost(context);
}
