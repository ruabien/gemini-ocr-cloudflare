export const onRequestPost = async (context: any) => {
  const { request } = context;
  const userKey = request.headers.get("x-user-key") || "";

  if (!userKey) {
    return new Response(JSON.stringify({ error: "Missing x-user-key header." }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const model = formData.get("model") || "gemini-1.5-flash";

    if (!file) {
      return new Response(JSON.stringify({ error: "Thiếu file." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
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
      } else {
        fileType = 'application/octet-stream';
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    
    // Safe Base64 encoding for potentially large files in workers
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000; // 32768
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Data = btoa(binary);

    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userKey}`;

    const geminiPayload = {
      contents: [{
        parts: [
          { text: `You are a professional legal document digitization engine. Your sole task is to extract all text from the provided image with 100% accuracy.
   
   CRITICAL RULES:
   1. Output ONLY the raw extracted text found inside the document.
   2. DO NOT include any conversational filler, descriptions, prefaces, or introductory remarks (e.g., Do NOT say "Dưới đây là kết quả...", "Here is the extracted text...").
   3. Maintain the original legal formatting, paragraph structure, and wording exactly as it appears in the image.` },
          {
            inlineData: {
              mimeType: fileType,
              data: base64Data
            }
          }
        ]
      }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
      ]
    };

    const response = await fetch(googleUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(geminiPayload)
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
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textResult === undefined || textResult === null) {
      const finishReason = data.candidates?.[0]?.finishReason;
      const blockReason = data.promptFeedback?.blockReason;
      const safetyRatings = data.candidates?.[0]?.safetyRatings;
      
      let detailedError = 'Google API không trả về kết quả văn bản.';
      if (finishReason) detailedError += ` (FinishReason: ${finishReason})`;
      if (blockReason) detailedError += ` (BlockReason: ${blockReason})`;
      if (safetyRatings) {
        const blockedRatings = safetyRatings.filter((r: any) => r.probability && r.probability !== 'NEGLIGIBLE');
        if (blockedRatings.length > 0) {
          detailedError += ` (SafetyRatings: ${blockedRatings.map((r: any) => `${r.category}:${r.probability}`).join(', ')})`;
        }
      }
      return new Response(JSON.stringify({ error: detailedError }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ text: textResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error('Lỗi hệ thống Worker:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};