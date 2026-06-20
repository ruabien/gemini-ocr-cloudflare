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

export async function onRequestGet(context: any) {
  const corsHeaders = getCorsHeaders(context.request);
  return new Response(JSON.stringify({ 
    primary: context.env.OCR_SPACE_API_KEY || "", 
    backup: context.env.OCR_SPACE_API_KEY_1 || "" 
  }), { 
    status: 200, 
    headers: { "Content-Type": "application/json", ...corsHeaders } 
  });
}

export async function onRequestPost(context: any) {
  const corsHeaders = getCorsHeaders(context.request);
  return new Response(JSON.stringify({ 
    primary: context.env.OCR_SPACE_API_KEY || "", 
    backup: context.env.OCR_SPACE_API_KEY_1 || "" 
  }), { 
    status: 200, 
    headers: { "Content-Type": "application/json", ...corsHeaders } 
  });
}
