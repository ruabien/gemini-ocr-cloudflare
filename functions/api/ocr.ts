let roundRobinIndex = 0;

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = ["https://doc.hotro.online"];
  
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ocr-Provider",
    };
  }
  return {
    "Access-Control-Allow-Origin": "https://doc.hotro.online",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ocr-Provider",
  };
};

export async function onRequestOptions(context: any) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request)
  });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);
  
  let provider = request.headers.get("X-Ocr-Provider") || "";
  let base64Image = "";

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      if (body.provider) provider = body.provider;
      if (body.base64Image) base64Image = body.base64Image;
    } catch (e) {}
  } else if (contentType.includes("form") || contentType.includes("multipart")) {
    try {
      const formData = await request.formData();
      const provVal = formData.get("provider") || request.headers.get("X-Ocr-Provider");
      if (provVal) provider = String(provVal);
      const imgVal = formData.get("base64Image");
      if (imgVal) base64Image = String(imgVal);
    } catch (e) {}
  }

  if (provider !== "ocr_space") {
    return new Response(
      JSON.stringify({ error: "UNSUPPORTED_PROVIDER", message: "This endpoint only supports ocr_space provider flag via X-Ocr-Provider." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!base64Image) {
    return new Response(
      JSON.stringify({ error: "MISSING_IMAGE", message: "base64Image is required." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const ocrKeys = [env.OCR_SPACE_API_KEY, env.OCR_SPACE_API_KEY_1].filter(Boolean);
  if (ocrKeys.length === 0) {
    return new Response(
      JSON.stringify({ error: "NO_KEYS", message: "OCR.space API keys are not configured on the edge." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const maxAttempts = ocrKeys.length;
  let attempts = 0;
  let lastErrorMsg = "";

  while (attempts < maxAttempts) {
    const currentIndex = (roundRobinIndex + attempts) % maxAttempts;
    const currentKey = ocrKeys[currentIndex];
    
    try {
      const formData = new FormData();
      formData.append("apikey", currentKey);
      formData.append("language", "vie");
      formData.append("isOverlayRequired", "false");
      formData.append("OCREngine", "2");
      formData.append("scale", "true");
      formData.append("base64Image", base64Image);

      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check for OCR.space level errors
        if (data.IsErroredOnProcessing || data.OCRExitCode > 1) {
          const errMsgs = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : (data.ErrorMessage || "");
          lastErrorMsg = errMsgs;
          // Continue to next key on error
        } else {
          // Success
          let text = "";
          if (data.ParsedResults && data.ParsedResults.length > 0) {
            text = data.ParsedResults[0].ParsedText;
          } else if (data.text) {
             text = data.text;
          }
          
          roundRobinIndex = (currentIndex + 1) % maxAttempts; // Rotate on success to balance load
          
          return new Response(
            JSON.stringify({ text: text }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else {
        lastErrorMsg = `HTTP Error ${response.status}`;
      }
    } catch (e: any) {
      lastErrorMsg = e.message || "Unknown network error";
    }
    
    attempts++;
  }

  // If all keys fail
  return new Response(
    JSON.stringify({ error: "ALL_KEYS_FAILED", message: `Failed to process image with all available keys. Last error: ${lastErrorMsg}` }),
    { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}